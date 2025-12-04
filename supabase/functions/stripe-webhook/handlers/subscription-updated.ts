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
    
    // Get the price ID from the subscription
    const priceId = subscription.items?.data?.[0]?.price?.id;
    const interval = subscription.items?.data?.[0]?.price?.recurring?.interval;
    
    console.log(`[SUBSCRIPTION-UPDATED] Price ID: ${priceId}, Interval: ${interval}`);
    
    // Fetch Stripe price IDs from poupeja_settings to determine plan type
    const { data: settingsData } = await supabase
      .from('poupeja_settings')
      .select('key, value')
      .in('key', ['stripe_price_id_monthly', 'stripe_price_id_annual']);
    
    const settings: Record<string, string> = {};
    settingsData?.forEach((s: any) => {
      settings[s.key] = s.value;
    });
    
    console.log(`[SUBSCRIPTION-UPDATED] Settings found:`, JSON.stringify(settings));
    
    // Determine plan type based on price_id comparison with settings
    let planType = 'monthly'; // default
    if (priceId && priceId === settings.stripe_price_id_annual) {
      planType = 'annual';
    } else if (priceId && priceId === settings.stripe_price_id_monthly) {
      planType = 'monthly';
    } else if (interval === 'year') {
      // Fallback to interval detection
      planType = 'annual';
    }
    
    console.log(`[SUBSCRIPTION-UPDATED] Determined plan type: ${planType}`);
    
    // Get id_plano_preco from tbl_planos based on plan type
    // Field: periodo (MENSAL/ANUAL), id_plano_preco is the plan ID
    let idPlanoPreco = 49; // Default fallback
    
    const periodoValue = planType === 'annual' ? 'ANUAL' : 'MENSAL';
    const { data: planData } = await supabase
      .from('tbl_planos')
      .select('id_plano_preco')
      .eq('periodo', periodoValue)
      .maybeSingle();
    
    if (planData?.id_plano_preco) {
      idPlanoPreco = planData.id_plano_preco;
      console.log(`[SUBSCRIPTION-UPDATED] Found id_plano_preco from tbl_planos: ${idPlanoPreco}, periodo: ${periodoValue}`);
    } else {
      // Fallback: try to get from poupeja_settings with plan type specific key
      const planIdKey = planType === 'annual' ? 'plan_id_annual' : 'plan_id_monthly';
      const { data: planIdSetting } = await supabase
        .from('poupeja_settings')
        .select('value')
        .eq('key', planIdKey)
        .maybeSingle();
      
      if (planIdSetting?.value) {
        idPlanoPreco = parseInt(planIdSetting.value);
        console.log(`[SUBSCRIPTION-UPDATED] Using id_plano_preco from settings: ${idPlanoPreco}`);
      } else {
        console.log(`[SUBSCRIPTION-UPDATED] Using default id_plano_preco: ${idPlanoPreco}`);
      }
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
      plan_type: planType,
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