import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Create transaction admin function called");

    // Get auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Unauthorized: No authorization header');
    }

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      throw new Error('Missing required environment variables');
    }

    // Create admin client with service role (bypasses RLS)
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Create user client to verify authentication and admin status
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get current user
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    
    if (userError || !user) {
      console.error('Failed to get user:', userError);
      throw new Error('Unauthorized: Invalid user session');
    }

    // Verify user is admin
    const { data: userRole, error: roleError } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !userRole) {
      console.error('User is not admin:', roleError);
      throw new Error('Forbidden: Admin access required');
    }

    console.log("Admin verification successful");

    // Get transaction data from request
    const transactionData = await req.json();
    
    if (!transactionData) {
      throw new Error('Transaction data is required');
    }

    console.log("Transaction data received:", transactionData);

    // Insert transaction using service role client (bypasses RLS)
    const { data, error } = await adminClient
      .from("poupeja_transactions")
      .insert(transactionData)
      .select(`
        *,
        category:poupeja_categories(id, name, icon, color, type)
      `)
      .single();

    if (error) {
      console.error('Error inserting transaction:', error);
      throw new Error('Failed to insert transaction: ' + error.message);
    }

    console.log("Transaction created successfully:", data);

    return new Response(JSON.stringify({
      success: true,
      data: data
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in create-transaction-admin:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro interno do servidor";
    
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});