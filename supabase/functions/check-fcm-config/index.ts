import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Verificando configuração do FCM...');
    
    const fcmServiceAccountJson = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON');
    
    const diagnostics = {
      secretExists: !!fcmServiceAccountJson,
      secretLength: fcmServiceAccountJson?.length || 0,
      isValidJson: false,
      fields: {
        project_id: { exists: false, value: '' },
        private_key: { exists: false, preview: '' },
        client_email: { exists: false, value: '' },
        private_key_id: { exists: false },
        type: { exists: false },
        auth_uri: { exists: false },
        token_uri: { exists: false },
        auth_provider_x509_cert_url: { exists: false },
        client_x509_cert_url: { exists: false }
      },
      errors: [] as string[]
    };

    if (!fcmServiceAccountJson) {
      diagnostics.errors.push('❌ FCM_SERVICE_ACCOUNT_JSON não está configurado nos secrets do Supabase');
      console.error('❌ Secret não encontrado');
      
      return new Response(JSON.stringify({
        success: false,
        message: 'Secret não configurado',
        diagnostics
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }

    console.log(`✅ Secret existe com ${fcmServiceAccountJson.length} caracteres`);

    // Tentar parsear JSON
    let serviceAccount: any;
    try {
      serviceAccount = JSON.parse(fcmServiceAccountJson);
      diagnostics.isValidJson = true;
      console.log('✅ JSON válido');
    } catch (e) {
      diagnostics.errors.push(`❌ JSON inválido: ${e instanceof Error ? e.message : String(e)}`);
      console.error('❌ Erro ao parsear JSON:', e);
      
      return new Response(JSON.stringify({
        success: false,
        message: 'JSON inválido',
        diagnostics
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }

    // Verificar campos obrigatórios
    const requiredFields = ['project_id', 'private_key', 'client_email', 'private_key_id', 'type'];
    
    for (const field of requiredFields) {
      if (serviceAccount[field]) {
        diagnostics.fields[field].exists = true;
        
        // Mostrar valores não sensíveis
        if (field === 'project_id' || field === 'client_email' || field === 'type') {
          diagnostics.fields[field].value = serviceAccount[field];
        }
        
        // Mostrar preview da private_key (primeiros e últimos caracteres)
        if (field === 'private_key') {
          const key = serviceAccount[field];
          diagnostics.fields[field].preview = `${key.substring(0, 50)}...${key.substring(key.length - 50)}`;
        }
        
        console.log(`✅ Campo ${field}: presente`);
      } else {
        diagnostics.errors.push(`❌ Campo obrigatório ausente: ${field}`);
        console.error(`❌ Campo ausente: ${field}`);
      }
    }

    // Verificar campos opcionais
    const optionalFields = ['auth_uri', 'token_uri', 'auth_provider_x509_cert_url', 'client_x509_cert_url'];
    for (const field of optionalFields) {
      if (serviceAccount[field]) {
        diagnostics.fields[field].exists = true;
      }
    }

    // Validações específicas
    if (serviceAccount.type !== 'service_account') {
      diagnostics.errors.push(`⚠️ Campo 'type' deveria ser 'service_account', mas é '${serviceAccount.type}'`);
    }

    if (serviceAccount.project_id && !serviceAccount.project_id.includes('appfinanceiro')) {
      diagnostics.errors.push(`⚠️ project_id '${serviceAccount.project_id}' não parece ser do projeto appfinanceiro-22bd4`);
    }

    if (serviceAccount.private_key && !serviceAccount.private_key.includes('BEGIN PRIVATE KEY')) {
      diagnostics.errors.push('⚠️ private_key não parece estar no formato correto (deve conter BEGIN PRIVATE KEY)');
    }

    const success = diagnostics.errors.length === 0;
    
    console.log(`\n📊 Diagnóstico completo:`);
    console.log(`- Secret existe: ${diagnostics.secretExists}`);
    console.log(`- JSON válido: ${diagnostics.isValidJson}`);
    console.log(`- Erros encontrados: ${diagnostics.errors.length}`);
    console.log(`- project_id: ${diagnostics.fields.project_id.value || 'N/A'}`);
    console.log(`- client_email: ${diagnostics.fields.client_email.value || 'N/A'}`);

    return new Response(JSON.stringify({
      success,
      message: success 
        ? '✅ Configuração FCM está correta!' 
        : '❌ Problemas encontrados na configuração FCM',
      diagnostics
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: success ? 200 : 500
    });

  } catch (error) {
    console.error('❌ Erro ao verificar configuração:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Erro ao verificar configuração',
      error: errorMessage
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
