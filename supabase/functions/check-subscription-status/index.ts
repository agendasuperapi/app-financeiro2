import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Função helper para logs de depuração
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION-STATUS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Criar cliente Supabase usando service role para bypass RLS
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Buscar por email em vez de token para PaymentSuccessPage
    const { email } = await req.json().catch(() => ({}));
    
    let user = null;
    let userLookupMethod = "none";
    let subscription = null;

    // Se temos email, buscar usuário por email
    if (email && email !== 'user@example.com') {
      logStep("Looking up user by email", { email });
      
      const { data: users, error: listError } = await supabaseService.auth.admin.listUsers();
      if (!listError && users?.users) {
        user = users.users.find(u => u.email === email);
        if (user) {
          userLookupMethod = "email";
          logStep("User found by email", { userId: user.id, email: user.email });
        }
      }
      
      // Se usuário não encontrado em auth.users, tentar buscar assinatura diretamente pelo email no Stripe
      if (!user) {
        logStep("User not found in auth.users, checking Stripe directly", { email });
        
        // Buscar chave do Stripe
        const { data: settingsData } = await supabaseService
          .from('poupeja_settings')
          .select('value')
          .eq('key', 'stripe_secret_key')
          .single();
        
        if (settingsData?.value) {
          const stripeSecretKey = settingsData.value.includes('sk_') ? 
            settingsData.value : 
            atob(settingsData.value);
          
          const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' });
          
          // Buscar customer no Stripe por email
          const customers = await stripe.customers.list({ email: email, limit: 1 });
          
          if (customers.data.length > 0) {
            const stripeCustomer = customers.data[0];
            logStep("Found Stripe customer", { customerId: stripeCustomer.id, email: stripeCustomer.email });
            
            // Buscar assinatura ativa no Stripe para este customer
            const stripeSubscriptions = await stripe.subscriptions.list({
              customer: stripeCustomer.id,
              status: 'active',
              limit: 1
            });
            
            if (stripeSubscriptions.data.length > 0) {
              const stripeSub = stripeSubscriptions.data[0];
              logStep("Found active Stripe subscription", { subscriptionId: stripeSub.id });
              
              // Verificar se já existe em poupeja_subscriptions pelo stripe_subscription_id
              const { data: existingSub } = await supabaseService
                .from("poupeja_subscriptions")
                .select("*")
                .eq("stripe_subscription_id", stripeSub.id)
                .maybeSingle();
              
              if (existingSub) {
                subscription = existingSub;
                logStep("Found subscription in database by stripe_subscription_id", { subscriptionId: existingSub.id });
              } else {
                // Construir objeto de subscription baseado nos dados do Stripe
                const interval = stripeSub.items?.data?.[0]?.price?.recurring?.interval;
                subscription = {
                  id: stripeSub.id,
                  status: stripeSub.status,
                  plan_type: interval === 'year' ? 'annual' : 'monthly',
                  current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
                  current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
                  cancel_at_period_end: stripeSub.cancel_at_period_end,
                  stripe_subscription_id: stripeSub.id,
                  stripe_customer_id: stripeCustomer.id
                };
                logStep("Built subscription from Stripe data", { subscription });
              }
              
              userLookupMethod = "stripe_direct";
            }
          }
        }
      }
    }

    // Fallback: tentar autenticação por token se fornecido
    if (!user && !subscription) {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        logStep("Attempting authentication by token");
        
        const supabaseAuth = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_ANON_KEY") ?? ""
        );

        const token = authHeader.replace("Bearer ", "");
        const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
        if (!userError && userData.user?.email) {
          user = userData.user;
          userLookupMethod = "token";
          logStep("User authenticated by token", { userId: user.id, email: user.email });
        }
      }
    }

    // Se encontramos um usuário mas não temos subscription ainda, buscar
    if (user && !subscription) {
      const { data: subData, error: subscriptionError } = await supabaseService
        .from("poupeja_subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (subscriptionError && subscriptionError.code !== 'PGRST116') {
        logStep("Error fetching subscription", { error: subscriptionError });
      } else {
        subscription = subData;
      }
    }

    // Se não temos nem usuário nem assinatura, retornar erro
    if (!user && !subscription) {
      logStep("No user or subscription found", { email });
      return new Response(JSON.stringify({
        hasActiveSubscription: false,
        subscription: null,
        isExpired: false,
        exists: false,
        hasSubscription: false,
        error: "User or subscription not found"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const hasActiveSubscription = !!subscription && subscription.status === 'active';
    const isExpired = subscription?.current_period_end 
      ? new Date() > new Date(subscription.current_period_end)
      : false;

    const isActiveAndNotExpired = hasActiveSubscription && !isExpired;

    logStep("Subscription check completed", { 
      hasSubscription: hasActiveSubscription,
      isExpired,
      isActiveAndNotExpired,
      planType: subscription?.plan_type,
      currentPeriodEnd: subscription?.current_period_end,
      userLookupMethod
    });

    return new Response(JSON.stringify({
      hasActiveSubscription: isActiveAndNotExpired,
      subscription: subscription || null,
      isExpired,
      exists: true,
      hasSubscription: isActiveAndNotExpired,
      user: user ? {
        id: user.id,
        email: user.email
      } : null
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription-status", { message: errorMessage });
    return new Response(JSON.stringify({ 
      error: errorMessage,
      hasActiveSubscription: false,
      subscription: null 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
