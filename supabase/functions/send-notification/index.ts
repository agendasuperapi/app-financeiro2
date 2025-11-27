import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 send-notification iniciado (config JWT via config.toml)');
    const requestBody = await req.json();
    console.log('📥 Request body recebido:', JSON.stringify(requestBody));
    
    const { userId, title, body, data } = requestBody;
    console.log(`📱 userId extraído: ${userId}`);
    console.log(`📝 title: ${title}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`🔍 Buscando tokens para usuário: ${userId}`);
    
    // Buscar tokens do usuário
    const { data: tokens, error } = await supabase
      .from('notification_tokens')
      .select('*')
      .eq('user_id', userId);
    
    console.log(`📊 Query executada para user_id: ${userId}`);

    if (error) {
      console.error('❌ Erro ao buscar tokens:', error);
      throw error;
    }
    
    console.log(`📋 Tokens encontrados: ${tokens?.length || 0}`);
    
    if (!tokens || tokens.length === 0) {
      console.log(`⚠️ Nenhum token encontrado para usuário ${userId}`);
      return new Response(
        JSON.stringify({ message: 'Nenhum token de notificação encontrado para este usuário' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    // Enviar notificação para todos os tokens usando FCM V1 API
    for (const tokenData of tokens) {
      try {
        // Usar FCM V1 API para TODAS as plataformas (web, android, ios)
        await sendFCMV1(tokenData, title, body, data);
        results.push({ platform: tokenData.platform, success: true });
      } catch (err) {
        console.error(`❌ Erro ao enviar para ${tokenData.platform}:`, err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        results.push({ platform: tokenData.platform, success: false, error: errorMessage });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

/**
 * Obtém access token OAuth2 para FCM V1 API
 */
async function getAccessToken(): Promise<string> {
  const serviceAccountJson = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON');
  
  if (!serviceAccountJson) {
    throw new Error('FCM_SERVICE_ACCOUNT_JSON não configurada. Configure nos secrets do Supabase.');
  }

  let serviceAccount: any;
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch (e) {
    throw new Error('FCM_SERVICE_ACCOUNT_JSON inválido. Deve ser um JSON válido.');
  }

  const { private_key, client_email, project_id } = serviceAccount;

  if (!private_key || !client_email) {
    throw new Error('FCM_SERVICE_ACCOUNT_JSON deve conter private_key e client_email');
  }

  // Criar JWT manualmente usando Web Crypto API (compatível com Deno Edge Runtime)
  const now = Math.floor(Date.now() / 1000);
  
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: client_email,
    sub: client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging'
  };

  // Preparar chave privada
  const keyData = private_key
    .replace(/\\n/g, '\n')
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  
  const keyBuffer = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
  
  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256'
    },
    false,
    ['sign']
  );

  // Criar JWT manualmente
  const encoder = new TextEncoder();
  const base64url = (data: Uint8Array) => {
    const base64 = btoa(String.fromCharCode(...data));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };

  const headerB64 = base64url(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64url(encoder.encode(JSON.stringify(payload)));
  const signatureInput = `${headerB64}.${payloadB64}`;
  
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    encoder.encode(signatureInput)
  );
  
  const signatureB64 = base64url(new Uint8Array(signature));
  const jwt = `${signatureInput}.${signatureB64}`;

  // Trocar JWT por access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Erro ao obter access token: ${tokenResponse.status} ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

/**
 * Envia notificação via FCM V1 API (Recomendado pelo Firebase)
 * Funciona para Web, Android e iOS
 * 
 * IMPORTANTE: Configure FCM_SERVICE_ACCOUNT_JSON nos secrets do Supabase
 * Obtenha em: Firebase Console > Project Settings > Service Accounts > Generate new private key
 */
async function sendFCMV1(tokenData: any, title: string, body: string, data: any) {
  console.log(`📱 Enviando FCM V1 para ${tokenData.platform}...`);
  
  const serviceAccountJson = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON');
  
  if (!serviceAccountJson) {
    throw new Error('FCM_SERVICE_ACCOUNT_JSON não configurada. Configure nos secrets do Supabase.');
  }

  let serviceAccount: any;
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch (e) {
    throw new Error('FCM_SERVICE_ACCOUNT_JSON inválido.');
  }

  const projectId = serviceAccount.project_id;
  
  if (!projectId) {
    throw new Error('project_id não encontrado no FCM_SERVICE_ACCOUNT_JSON');
  }

  // Obter access token
  const accessToken = await getAccessToken();
  console.log('✅ Access token obtido');

  // Preparar payload FCM V1
  const fcmPayload: any = {
    message: {
      token: tokenData.token,
      notification: {
        title,
        body
      },
      data: {
        // Garantir que os dados sejam strings (FCM requer strings)
        ...Object.fromEntries(
          Object.entries(data || {}).map(([key, value]) => [
            key,
            typeof value === 'string' ? value : JSON.stringify(value)
          ])
        )
      },
      webpush: {
        fcm_options: {
          link: '/lembretes'
        },
        notification: {
          title,
          body,
          icon: '/app-icon.png',
          badge: '/app-icon.png'
        }
      },
      android: {
        notification: {
          title,
          body,
          sound: 'default',
          icon: 'app_icon',
          click_action: '/lembretes'
        }
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title,
              body
            },
            sound: 'default',
            badge: 1
          }
        }
      }
    }
  };

  console.log('📤 Enviando para FCM V1 API...');
  console.log('📝 Token:', tokenData.token.substring(0, 20) + '...');
  
  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(fcmPayload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Erro FCM V1:', response.status, errorText);
    throw new Error(`FCM V1 error: ${response.status} ${errorText}`);
  }

  const responseData = await response.json();
  console.log(`✅ FCM V1 enviado para ${tokenData.platform}:`, responseData);
  
  return responseData;
}
