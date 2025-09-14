import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email } = await req.json()
    
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email é obrigatório' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const authHeader = req.headers.get('Authorization')!

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Verify the requesting user is authenticated
    const accessToken = authHeader?.replace('Bearer ', '') || ''
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(accessToken)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if user is admin - try both functions
    console.log('🔍 Verificando permissões de admin para usuário:', user.id, user.email)
    
    let isAdminCheck = false
    
    // Primeira tentativa com has_role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .rpc('has_role', { 
        _user_id: user.id, 
        _role: 'admin' 
      })
    
    console.log('📋 Resultado has_role:', { roleData, roleError })
    
    if (!roleError && roleData) {
      isAdminCheck = true
    } else {
      // Segunda tentativa com is_admin
      const { data: adminData, error: adminError } = await supabaseAdmin
        .rpc('is_admin', { user_id: user.id })
      
      console.log('📋 Resultado is_admin:', { adminData, adminError })
      
      if (!adminError && adminData) {
        isAdminCheck = true
      }
    }
    
    // Terceira tentativa: verificar diretamente na tabela
    if (!isAdminCheck) {
      const { data: directCheck, error: directError } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single()
      
      console.log('📋 Verificação direta na tabela:', { directCheck, directError })
      
      if (!directError && directCheck) {
        isAdminCheck = true
      }
    }

    if (!isAdminCheck) {
      console.log('❌ Usuário não tem permissões de admin')
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin privileges required' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    console.log('✅ Usuário confirmado como admin')

    // Primeiro, preparar dados do usuário usando nosso RPC
    const { data: prepareData, error: prepareError } = await supabaseAdmin
      .rpc('admin_generate_magic_link', { target_email: email })

    if (prepareError || !prepareData?.success) {
      console.error('Erro ao preparar dados do usuário:', prepareError)
      return new Response(
        JSON.stringify({ 
          error: prepareData?.message || 'Usuário não encontrado ou erro interno'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Generate magic link for the target user
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
    })

    if (linkError) {
      console.error('Erro ao gerar magic link:', linkError)
      return new Response(
        JSON.stringify({ error: 'Erro ao gerar link de login' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        loginUrl: linkData.properties?.action_link,
        user_data: {
          id: prepareData.user_id,
          email: prepareData.user_email,
          name: prepareData.user_name
        },
        message: 'Link de login gerado com sucesso'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Erro na impersonação:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})