import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Criar cliente Supabase com service role key (admin)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { name, phone, email, expirationDate, status } = await req.json()

    console.log('Creating client with data:', { name, phone, email, status })

    // Gerar uma senha temporária
    const tempPassword = `temp${Math.random().toString(36).slice(2)}`

    // Criar usuário no sistema de autenticação
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      user_metadata: {
        name,
        phone
      }
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      throw authError
    }

    if (!authData.user) {
      throw new Error('Failed to create auth user')
    }

    console.log('Auth user created:', authData.user.id)

    // Inserir na tabela poupeja_users
    const { data: userData, error: userError } = await supabaseAdmin
      .from('poupeja_users')
      .insert({
        id: authData.user.id,
        name,
        phone,
        email,
        created_at: new Date().toISOString()
      })
      .select()

    if (userError) {
      console.error('Error creating user profile:', userError)
      throw userError
    }

    console.log('User profile created:', userData)

    // Criar assinatura se os dados foram fornecidos
    if (userData && userData[0]) {
      const subscriptionData = {
        user_id: userData[0].id,
        status: status || 'active',
        plan_type: 'basic',
        current_period_start: new Date().toISOString(),
        current_period_end: expirationDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString()
      }

      const { data: subData, error: subError } = await supabaseAdmin
        .from('poupeja_subscriptions')
        .insert(subscriptionData)
        .select()

      if (subError) {
        console.error('Error creating subscription:', subError)
        // Não falhamos aqui, apenas logamos o erro
      } else {
        console.log('Subscription created:', subData)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Cliente criado com sucesso',
        user: userData[0] 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in create-admin-client:', error)
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})