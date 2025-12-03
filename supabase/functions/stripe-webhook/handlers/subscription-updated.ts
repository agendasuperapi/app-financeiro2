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
  const subscription = event.data.object;
  console.log("Processing subscription update:", JSON.stringify(subscription));
  
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
    
    // Get id_plano_preco from tbl_planos table using periodo column (MENSAL/ANUAL)
    let idPlanoPreco = null;
    const periodoValue = planTypeFromInterval === 'annual' ? 'ANUAL' : 'MENSAL';
    
    console.log(`[SUBSCRIPTION-UPDATED] Searching tbl_planos for periodo: ${periodoValue}`);
    
    const { data: plano, error: planoError } = await supabase
      .from('tbl_planos')
      .select('id, nome, id_plano_preco, periodo')
      .eq('periodo', periodoValue)
      .limit(1)
      .maybeSingle();
    
    console.log(`[SUBSCRIPTION-UPDATED] tbl_planos query result:`, JSON.stringify({ plano, error: planoError }));
    
    if (plano && plano.id_plano_preco) {
      idPlanoPreco = plano.id_plano_preco;
      console.log(`[SUBSCRIPTION-UPDATED] Using id_plano_preco: ${plano.id_plano_preco} from plan ${plano.nome}`);
    } else if (plano) {
      // Fallback to id if id_plano_preco is not set
      idPlanoPreco = plano.id;
      console.log(`[SUBSCRIPTION-UPDATED] Using fallback plano.id: ${plano.id} (${plano.nome})`);
    } else {
      // Fallback: get first available plan
      const { data: anyPlan } = await supabase
        .from('tbl_planos')
        .select('id, nome, id_plano_preco')
        .limit(1)
        .maybeSingle();
      
      if (anyPlan) {
        idPlanoPreco = anyPlan.id_plano_preco || anyPlan.id;
        console.log(`[SUBSCRIPTION-UPDATED] Using fallback plan: ${anyPlan.nome}, id_plano_preco: ${idPlanoPreco}`);
      } else {
        console.error(`[SUBSCRIPTION-UPDATED] No plans found in tbl_planos table!`);
      }
    }
    
    if (!idPlanoPreco) {
      throw new Error(`Cannot update subscription: no valid id_plano_preco found in tbl_planos`);
    }
    
    // Prepare update/insert data
    const subscriptionData: any = {
      user_id: verifiedUserId,
      stripe_customer_id: subscription.customer,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end,
      plan_type: planTypeFromInterval,
      id_plano_preco: idPlanoPreco
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