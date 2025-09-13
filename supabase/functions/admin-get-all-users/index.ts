import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Create Supabase client with service role key (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get user from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create user client to verify authentication
    const supabaseAnon = createClient(
      supabaseUrl, 
      Deno.env.get('SUPABASE_ANON_KEY')!
    )

    const { data: { user }, error: userError } = await supabaseAnon.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid user token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user has admin role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: 'Access denied. Admin role required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Admin access verified for user:', user.id)

    // Fetch all users using service role (bypasses RLS)
    const { data: users, error: usersError } = await supabaseAdmin
      .from('poupeja_users')
      .select('id, name, phone, created_at, email, updated_at')
      .order('created_at', { ascending: false })

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch users', details: usersError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch all subscriptions using service role
    const { data: subscriptions, error: subscriptionsError } = await supabaseAdmin
      .from('poupeja_subscriptions')
      .select('user_id, current_period_end, status, plan_type, cancel_at_period_end')

    if (subscriptionsError) {
      console.error('Error fetching subscriptions:', subscriptionsError)
      // Continue without subscriptions data
    }

    // Combine users with their subscription data
    const combinedData = users.map(user => {
      const subscription = subscriptions?.find(sub => sub.user_id === user.id)
      return {
        ...user,
        current_period_end: subscription?.current_period_end || null,
        status: subscription?.status || 'Sem assinatura',
        plan_type: subscription?.plan_type || null,
        cancel_at_period_end: subscription?.cancel_at_period_end || false
      }
    })

    console.log(`Successfully fetched ${combinedData.length} users with subscriptions`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        users: combinedData,
        total: combinedData.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in admin-get-all-users function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})