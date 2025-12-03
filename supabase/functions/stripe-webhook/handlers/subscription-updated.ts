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
    
    // First, get id_plano_preco - this is REQUIRED
    let idPlanoPreco = null;
    
    // Try to get from poupeja_plan_pricing based on interval
    const interval = subscription.items?.data?.[0]?.price?.recurring?.interval;
    const planTypeFromInterval = interval === 'year' ? 'annual' : 'monthly';
    
    console.log(`[SUBSCRIPTION-UPDATED] Looking for plan pricing with type: ${planTypeFromInterval}`);
    
    const { data: planPricing, error: planError } = await supabase
      .from('poupeja_plan_pricing')
      .select('id, plan_type')
      .eq('plan_type', planTypeFromInterval)
      .eq('is_active', true)
      .single();
    
    if (planPricing) {
      idPlanoPreco = planPricing.id;
      console.log(`[SUBSCRIPTION-UPDATED] Found plan pricing: ${planPricing.id} for type ${planPricing.plan_type}`);
    } else {
      console.log(`[SUBSCRIPTION-UPDATED] No plan pricing found for type ${planTypeFromInterval}, error:`, planError);
      
      // Fallback: get any active plan pricing
      const { data: anyPlan, error: anyError } = await supabase
        .from('poupeja_plan_pricing')
        .select('id, plan_type')
        .eq('is_active', true)
        .limit(1)
        .single();
      
      if (anyPlan) {
        idPlanoPreco = anyPlan.id;
        console.log(`[SUBSCRIPTION-UPDATED] Using fallback plan pricing: ${anyPlan.id} (${anyPlan.plan_type})`);
      } else {
        console.error(`[SUBSCRIPTION-UPDATED] No active plan pricing found at all! Error:`, anyError);
        
        // List all plan pricing to debug
        const { data: allPlans } = await supabase
          .from('poupeja_plan_pricing')
          .select('id, plan_type, is_active');
        console.log(`[SUBSCRIPTION-UPDATED] All plan pricing records:`, allPlans);
      }
    }
    
    if (!idPlanoPreco) {
      throw new Error(`Cannot update subscription: no valid id_plano_preco found for plan type ${planTypeFromInterval}`);
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
    
    // Use UPSERT instead of UPDATE to ensure record is created/updated
    const upsertResult = await supabase.from("poupeja_subscriptions")
      .upsert(subscriptionData, { 
        onConflict: 'user_id',
        ignoreDuplicates: false 
      });
    
    console.log("Upsert result:", JSON.stringify(upsertResult));
    
    if (upsertResult.error) {
      throw new Error(`Supabase upsert error: ${upsertResult.error.message}`);
    }
    
    console.log(`Subscription upserted successfully: ${subscription.id}`);
  } catch (updateError) {
    console.error("Error updating subscription:", updateError);
    throw updateError;
  }
}