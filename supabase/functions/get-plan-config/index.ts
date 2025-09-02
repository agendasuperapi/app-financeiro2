import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-PLAN-CONFIG] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    logStep("Supabase client initialized");

    const { data, error } = await supabaseClient
      .from("poupeja_settings")
      .select("key, value")
      .in("key", ["stripe_price_id_monthly", "stripe_price_id_annual"]);

    if (error) {
      logStep("ERROR: Failed to fetch settings", { error: error.message });
      throw new Error(`Database error: ${error.message}`);
    }

    logStep("Settings fetched", { count: data?.length });

    if (!data || data.length === 0) {
      logStep("WARNING: No price settings found");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "No Stripe price settings found in database" 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    const priceSettings: { [key: string]: string } = {};
    data.forEach(setting => {
      priceSettings[setting.key] = setting.value;
    });

    logStep("Price settings processed", { settings: priceSettings });

    const monthlyPriceId = priceSettings.stripe_price_id_monthly;
    const annualPriceId = priceSettings.stripe_price_id_annual;

    if (!monthlyPriceId || !annualPriceId) {
      logStep("ERROR: Missing required price IDs", {
        hasMonthly: !!monthlyPriceId,
        hasAnnual: !!annualPriceId
      });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing required Stripe price IDs in database",
          details: {
            monthly_missing: !monthlyPriceId,
            annual_missing: !annualPriceId
          }
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    logStep("Price IDs validated successfully");

    return new Response(
      JSON.stringify({
        success: true,
        prices: {
          monthly: {
            priceId: monthlyPriceId
          },
          annual: {
            priceId: annualPriceId
          }
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    logStep("ERROR: Function failed", { error: error.message });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
