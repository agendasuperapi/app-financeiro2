import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Service client (bypasses RLS)
    const supabaseService = createClient(supabaseUrl, serviceKey)

    // User client (to validate JWT and get user)
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    // Authenticate user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'User not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify admin role (use RPC if available)
    const { data: isAdmin, error: roleError } = await supabaseService
      .rpc('check_user_role', { user_id: user.id, target_role: 'admin' })

    if (roleError || !isAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Access denied. Admin only.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch users and subscriptions
    const [{ data: users, error: usersError }, { data: subs, error: subsError }] = await Promise.all([
      supabaseService.from('poupeja_users')
        .select('id, name, phone, created_at, email, updated_at')
        .order('created_at', { ascending: false }),
      supabaseService.from('poupeja_subscriptions')
        .select('user_id, current_period_end, status, plan_type, cancel_at_period_end')
    ])

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch users', details: usersError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (subsError) {
      console.warn('Error fetching subscriptions (continuing without):', subsError)
    }

    const combined = (users || []).map((u) => {
      const s = subs?.find((x) => x.user_id === u.id)
      return {
        ...u,
        current_period_end: s?.current_period_end || null,
        status: s?.status || 'Sem assinatura',
        plan_type: s?.plan_type || null,
        cancel_at_period_end: s?.cancel_at_period_end || false,
      }
    })

    return new Response(
      JSON.stringify({ success: true, users: combined, total: combined.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in admin-get-all-users:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
