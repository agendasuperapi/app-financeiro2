
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@14.21.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4' // ou versão mais recente

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SYNC-SUBSCRIPTIONS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { email, test } = await req.json().catch(() => ({}));
    
    // Se é uma requisição de teste, retorna sucesso
    if (test) {
      return new Response(
        JSON.stringify({ success: true, message: "Test successful" }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }
    
    logStep("Sync subscriptions started", { targetEmail: email });

    // Buscar chave secreta do Stripe nas configurações
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: settingsData, error: settingsError } = await supabaseService
      .from('poupeja_settings')
      .select('value')
      .eq('key', 'stripe_secret_key')
      .single();

    if (settingsError || !settingsData?.value) {
      throw new Error('Chave secreta do Stripe não configurada. Entre em contato com o administrador.');
    }

    // Decodificar a chave se estiver em base64
    const stripeSecretKey = settingsData.value.includes('sk_') ? 
      settingsData.value : 
      atob(settingsData.value);

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
    })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',  // Alterado de API_URL
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Buscar assinaturas ativas no Stripe (filtradas por email se fornecido)
    let subscriptions;
    if (email) {
      // Buscar customer específico por email
      const customers = await stripe.customers.list({
        email: email,
        limit: 1
      });
      
      if (customers.data.length === 0) {
        logStep("No customer found for email", { email });
        return new Response(
          JSON.stringify({ 
            success: false,
            error: "Customer not found in Stripe"
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }
      
      // Buscar assinaturas do customer específico
      subscriptions = await stripe.subscriptions.list({
        customer: customers.data[0].id,
        status: 'active',
        limit: 10
      });
    } else {
      // Buscar todas as assinaturas ativas
      subscriptions = await stripe.subscriptions.list({
        status: 'active',
        limit: 100
      });
    }

    logStep("Found active subscriptions", { count: subscriptions.data.length, filteredByEmail: !!email });

    let syncedCount = 0;
    let createdUsersCount = 0;

    for (const subscription of subscriptions.data) {
      try {
        // Buscar dados do cliente
        const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
        
        if (!customer.email) {
          logStep("Skipping subscription without customer email", { subscriptionId: subscription.id });
          continue;
        }

        logStep("Processing subscription", { subscriptionId: subscription.id, email: customer.email });

        // Verificar se usuário existe no Supabase Auth
        const { data: usersData } = await supabase.auth.admin.listUsers();
        const existingUser = usersData?.users?.find(u => u.email === customer.email);
        let userId = existingUser?.id;

        if (!existingUser) {
          logStep("Creating new user", { email: customer.email });
          
          // Criar usuário no Supabase Auth
          const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: customer.email,
            password: Deno.env.get('DEFAULT_PASSWORD') || '123mudar',
            email_confirm: true,
            user_metadata: {
              name: customer.name || customer.email.split('@')[0]
            }
          });

          if (createError) {
            logStep("Error creating user", { email: customer.email, error: createError });
            continue;
          }

          userId = newUser.user?.id;
          createdUsersCount++;
          logStep("User created", { userId, email: customer.email });
        }

        if (userId) {
          // Get price ID and interval from subscription
          const priceId = subscription.items.data.length > 0 ? subscription.items.data[0].price.id : null;
          const interval = subscription.items.data.length > 0 ? subscription.items.data[0].price.recurring?.interval : null;
          
          logStep("Checking subscription price", { priceId, interval });
          
          // Fetch Stripe price IDs from poupeja_settings
          const { data: settingsData } = await supabaseService
            .from('poupeja_settings')
            .select('key, value')
            .in('key', ['stripe_price_id_monthly', 'stripe_price_id_annual']);
          
          const settings: Record<string, string> = {};
          settingsData?.forEach((s: any) => {
            settings[s.key] = s.value;
          });
          
          logStep("Settings loaded", settings);
          
          // Determine plan type based on price_id comparison
          let planType = 'monthly'; // default
          if (priceId && priceId === settings.stripe_price_id_annual) {
            planType = 'annual';
          } else if (priceId && priceId === settings.stripe_price_id_monthly) {
            planType = 'monthly';
          } else if (interval === 'year') {
            // Fallback to interval detection
            planType = 'annual';
          }
          
          logStep("Determined plan type", { planType, priceId });
          
          // Get id_plano_preco from tbl_planos based on plan type
          let idPlanoPreco = 49; // Default fallback
          
          const { data: planData } = await supabaseService
            .from('tbl_planos')
            .select('id')
            .eq('tipo', planType === 'annual' ? 'anual' : 'mensal')
            .maybeSingle();
          
          if (planData?.id) {
            idPlanoPreco = planData.id;
            logStep("Found id_plano_preco from tbl_planos", { idPlanoPreco, planType });
          } else {
            // Fallback: use plan type specific settings
            const planIdKey = planType === 'annual' ? 'plan_id_annual' : 'plan_id_monthly';
            const { data: planIdSetting } = await supabaseService
              .from('poupeja_settings')
              .select('value')
              .eq('key', planIdKey)
              .maybeSingle();
            
            if (planIdSetting?.value) {
              idPlanoPreco = parseInt(planIdSetting.value);
              logStep("Using id_plano_preco from settings", { idPlanoPreco });
            } else {
              logStep("Using default id_plano_preco", { idPlanoPreco });
            }
          }

          // Calcular dados de trial period
          const hasTrial = subscription.trial_start !== null && subscription.trial_end !== null;
          let trialPeriodDays = null;
          let trialPeriodDate = null;
          
          if (hasTrial && subscription.trial_start && subscription.trial_end) {
            trialPeriodDays = Math.ceil((subscription.trial_end - subscription.trial_start) / (60 * 60 * 24));
            trialPeriodDate = new Date(subscription.trial_end * 1000).toISOString();
          }

          // Inserir/atualizar assinatura
          const subscriptionData = {
            user_id: userId,
            stripe_customer_id: customer.id,
            stripe_subscription_id: subscription.id,
            status: subscription.status,
            plan_type: planType,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            id_plano_preco: idPlanoPreco,
            updated_at: new Date().toISOString(),
            // Campos adicionais do Stripe
            Name: customer.name || customer.email?.split('@')[0] || null,
            status_pagamento: subscription.status === 'active' ? 'PAGO' : (subscription.status === 'trialing' ? 'TRIAL' : 'PENDENTE'),
            status_assinatura: subscription.status === 'active' || subscription.status === 'trialing' ? 'ATIVA' : 'INATIVA',
            trial_period: hasTrial,
            trial_period_days: trialPeriodDays,
            trial_period_date: trialPeriodDate,
            conta_teste: !subscription.livemode
          };
          
          // Log dos dados antes de inserir
          logStep("Subscription data to upsert", { 
            subscriptionId: subscription.id,
            idPlanoPreco,
            periods: {
              raw_start: subscription.current_period_start,
              raw_end: subscription.current_period_end,
              formatted_start: subscriptionData.current_period_start,
              formatted_end: subscriptionData.current_period_end
            }
          });

          // Primeiro, deletar assinatura existente do usuário para evitar conflitos
          await supabase
            .from('poupeja_subscriptions')
            .delete()
            .eq('user_id', userId);

          // Inserir nova assinatura
          const { data, error: subscriptionError } = await supabase
            .from('poupeja_subscriptions')
            .insert(subscriptionData);

          if (subscriptionError) {
            logStep("Error upserting subscription", { 
              error: subscriptionError,
              errorCode: subscriptionError.code,
              errorMessage: subscriptionError.message,
              errorDetails: subscriptionError.details,
              userId,
              subscriptionId: subscription.id,
              idPlanoPreco
            });
            continue;
          }

          syncedCount++;
          logStep("Subscription synced", { subscriptionId: subscription.id });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logStep("Error processing subscription", { subscriptionId: subscription.id, error: errorMessage });
      }
    }

    logStep("Sync completed", { 
      totalSubscriptions: subscriptions.data.length,
      syncedCount,
      createdUsersCount
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        totalSubscriptions: subscriptions.data.length,
        syncedCount,
        createdUsersCount
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in sync", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
