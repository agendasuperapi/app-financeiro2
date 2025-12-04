import type { SubscriptionData } from "../types.ts";

// Deno environment declarations
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

export async function handleSubscriptionUpdated(
  event: any,
  stripe: any,
  supabase: any
): Promise<void> {
  const eventSubscription = event.data.object;
  console.log("Processing subscription update event:", eventSubscription.id);
  
  // IMPORTANTE: Re-fetch a assinatura diretamente do Stripe para garantir dados atualizados
  // Durante upgrades, o evento pode vir com dados intermediários
  const subscription = await stripe.subscriptions.retrieve(eventSubscription.id, {
    expand: ['items.data.price']
  });
  
  console.log("Fetched fresh subscription from Stripe:", JSON.stringify({
    id: subscription.id,
    status: subscription.status,
    current_period_start: subscription.current_period_start,
    current_period_end: subscription.current_period_end,
    interval: subscription.items?.data?.[0]?.price?.recurring?.interval
  }));
  
  try {
    // First, find the user_id using subscription or customer metadata
    let userId = subscription.metadata?.user_id;
    
    if (!userId) {
      // If not in subscription metadata, check customer
      const customer = await stripe.customers.retrieve(subscription.customer);
      userId = customer.metadata?.user_id;
    }
    
    if (!userId) {
      // Last resort: search the table by stripe_subscription_id
      const { data: existingSubscription } = await supabase
        .from("poupeja_subscriptions")
        .select("user_id")
        .eq("stripe_subscription_id", subscription.id)
        .single();
      
      userId = existingSubscription?.user_id;
    }
    
    if (!userId) {
      console.error(`No user_id found for subscription ${subscription.id}`);
      return;
    }
    
    // Verify the user exists in poupeja_users table and get the correct ID
    const { data: poupejaUser, error: userError } = await supabase
      .from('poupeja_users')
      .select('id')
      .eq('id', userId) // poupeja_users.id = auth.users.id
      .single();
      
    if (userError || !poupejaUser) {
      console.error(`User not found in poupeja_users table for userId: ${userId}`, { error: userError });
      return;
    }
    
    const verifiedUserId = poupejaUser.id;
    console.log(`Found and verified user for subscription ${subscription.id}`);
    
    // Determine plan type based on interval
    const interval = subscription.items?.data?.[0]?.price?.recurring?.interval;
    const planTypeFromInterval = interval === 'year' ? 'annual' : 'monthly';
    
    console.log(`[SUBSCRIPTION-UPDATED] Plan type from interval: ${planTypeFromInterval}`);
    
    // Get id_plano_preco from existing poupeja_subscriptions (default value is 49)
    let idPlanoPreco = 49; // Default value based on existing subscriptions
    
    // Try to get from an existing subscription as reference
    const { data: existingSubRef } = await supabase
      .from('poupeja_subscriptions')
      .select('id_plano_preco')
      .not('id_plano_preco', 'is', null)
      .limit(1)
      .maybeSingle();
    
    if (existingSubRef?.id_plano_preco) {
      idPlanoPreco = existingSubRef.id_plano_preco;
      console.log(`[SUBSCRIPTION-UPDATED] Using id_plano_preco from existing subscription: ${idPlanoPreco}`);
    } else {
      console.log(`[SUBSCRIPTION-UPDATED] Using default id_plano_preco: ${idPlanoPreco}`);
    }
    
    // Buscar nome do cliente do Stripe
    const customer = await stripe.customers.retrieve(subscription.customer);
    const customerName = customer.name || customer.email?.split('@')[0] || null;
    
    // Calcular dados de trial period
    const hasTrial = subscription.trial_start !== null && subscription.trial_end !== null;
    let trialPeriodDays = null;
    let trialPeriodDate = null;
    
    if (hasTrial && subscription.trial_start && subscription.trial_end) {
      trialPeriodDays = Math.ceil((subscription.trial_end - subscription.trial_start) / (60 * 60 * 24));
      trialPeriodDate = new Date(subscription.trial_end * 1000).toISOString();
    }

    // Prepare update/insert data
    const subscriptionData: any = {
      user_id: verifiedUserId,
      stripe_customer_id: subscription.customer,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end,
      plan_type: planTypeFromInterval,
      id_plano_preco: idPlanoPreco,
      // Campos adicionais do Stripe
      Name: customerName,
      status_pagamento: subscription.status === 'active' ? 'PAGO' : (subscription.status === 'trialing' ? 'TRIAL' : 'PENDENTE'),
      status_assinatura: subscription.status === 'active' || subscription.status === 'trialing' ? 'ATIVA' : 'INATIVA',
      trial_period: hasTrial,
      trial_period_days: trialPeriodDays,
      trial_period_date: trialPeriodDate,
      conta_teste: !subscription.livemode
    };
    
    // Add timestamps from subscription object directly
    if (subscription.current_period_start) {
      subscriptionData.current_period_start = new Date(subscription.current_period_start * 1000).toISOString();
      console.log(`Setting current_period_start: ${subscriptionData.current_period_start}`);
    }
    
    if (subscription.current_period_end) {
      subscriptionData.current_period_end = new Date(subscription.current_period_end * 1000).toISOString();
      console.log(`Setting current_period_end: ${subscriptionData.current_period_end}`);
    }
    
    // Log price details for debugging
    if (subscription.items?.data?.[0]) {
      const priceId = subscription.items.data[0].price.id;
      console.log(`[SUBSCRIPTION-UPDATED] Price ID: ${priceId}, Plan type: ${subscriptionData.plan_type}, id_plano_preco: ${subscriptionData.id_plano_preco}`);
    }
    
    // Verificar se já existe assinatura para este usuário
    const { data: existingSubscription, error: fetchError } = await supabase
      .from("poupeja_subscriptions")
      .select("id")
      .eq("user_id", verifiedUserId)
      .maybeSingle();

    if (fetchError) {
      console.error(`[SUBSCRIPTION-UPDATED] Error fetching existing:`, JSON.stringify(fetchError));
    }

    let result;
    if (existingSubscription) {
      console.log(`[SUBSCRIPTION-UPDATED] Updating existing subscription id: ${existingSubscription.id}`);
      result = await supabase
        .from("poupeja_subscriptions")
        .update(subscriptionData)
        .eq("user_id", verifiedUserId)
        .select();
    } else {
      console.log(`[SUBSCRIPTION-UPDATED] Inserting new subscription for user: ${verifiedUserId}`);
      result = await supabase
        .from("poupeja_subscriptions")
        .insert(subscriptionData)
        .select();
    }
    
    console.log("[SUBSCRIPTION-UPDATED] Result:", JSON.stringify(result));
    
    if (result.error) {
      throw new Error(`Supabase error: ${result.error.message}`);
    }
    
    console.log(`[SUBSCRIPTION-UPDATED] Subscription saved successfully: ${subscription.id}`);
  } catch (updateError) {
    console.error("[SUBSCRIPTION-UPDATED] Error:", updateError);
    throw updateError;
  }
}