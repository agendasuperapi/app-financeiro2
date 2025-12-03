import type { SubscriptionData } from "../types.ts";

// Deno environment declarations
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

export async function handleCheckoutSessionCompleted(
  event: any,
  stripe: any,
  supabase: any
): Promise<void> {
  console.log("Processing checkout session completed:", event.id);
  
  const session = event.data.object;
  const authUserId = session.metadata?.user_id;

  if (!authUserId) {
    console.error("No user ID in metadata", { sessionId: session.id });
    throw new Error("No user ID in metadata");
  }
  
  // Get the poupeja_users ID from the auth user ID
  const { data: poupejaUser, error: userError } = await supabase
    .from('poupeja_users')
    .select('id')
    .eq('id', authUserId) // poupeja_users.id = auth.users.id
    .single();
    
  if (userError || !poupejaUser) {
    console.error("Failed to find poupeja user", { authUserId, error: userError });
    throw new Error(`User not found in poupeja_users table: ${userError?.message || 'Unknown error'}`);
  }
  
  const userId = poupejaUser.id;
  console.log("Processing subscription for verified user");

  const subscription = await stripe.subscriptions.retrieve(session.subscription);
  
  // Map the new price IDs to plan types using the edge function config
  const priceId = subscription.items.data[0].price.id;
  let planType;
  
  try {
    // Use the same logic as sync-subscriptions: call get-plan-config function
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/get-plan-config`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const planConfig = await response.json();
      console.log('Plan config from get-plan-config:', planConfig);
      
      if (priceId === planConfig.prices?.monthly?.priceId) {
        planType = "monthly";
      } else if (priceId === planConfig.prices?.annual?.priceId) {
        planType = "annual";
      } else {
        console.warn(`Unknown price ID: ${priceId}. Using interval fallback.`);
        planType = subscription.items.data[0].price.recurring?.interval === 'year' ? "annual" : "monthly";
      }
    } else {
      console.warn('Failed to fetch plan config, using interval fallback');
      // Fallback to interval detection
      planType = subscription.items.data[0].price.recurring?.interval === 'year' ? "annual" : "monthly";
    }
  } catch (error) {
    console.error('Error fetching plan config, using interval fallback:', error);
    // Check interval as final fallback
    planType = subscription.items.data[0].price.recurring?.interval === 'year' ? "annual" : "monthly";
  }

  console.log(`Processing subscription for price ID: ${priceId}, plan type: ${planType}`);
  console.log(`Subscription status from Stripe: ${subscription.status}`);

  // Use actual subscription status from Stripe instead of assuming "active"
  const subscriptionStatus = subscription.status;

  // Get id_plano_preco from tbl_planos table
  let idPlanoPreco = null;
  const { data: plano } = await supabase
    .from('tbl_planos')
    .select('id, nome')
    .ilike('nome', planType === 'annual' ? '%anual%' : '%mensal%')
    .limit(1)
    .single();
  
  if (plano) {
    idPlanoPreco = plano.id;
    console.log(`Setting id_plano_preco to ${plano.id} (${plano.nome})`);
  } else {
    // Fallback: get any plan
    const { data: anyPlan } = await supabase
      .from('tbl_planos')
      .select('id, nome')
      .limit(1)
      .single();
    
    if (anyPlan) {
      idPlanoPreco = anyPlan.id;
      console.log(`Using fallback id_plano_preco: ${anyPlan.id} (${anyPlan.nome})`);
    }
  }
  
  if (!idPlanoPreco) {
    throw new Error(`Cannot create subscription: no valid id_plano_preco found in tbl_planos`);
  }

  await supabase.from("poupeja_subscriptions").upsert({
    user_id: userId,
    stripe_customer_id: session.customer,
    stripe_subscription_id: session.subscription,
    status: subscriptionStatus,
    plan_type: planType,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    id_plano_preco: idPlanoPreco
  });

  console.log(`Subscription created/updated with plan ${planType}, status ${subscriptionStatus}, id_plano_preco ${idPlanoPreco}`);
}