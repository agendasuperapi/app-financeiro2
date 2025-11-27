import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔍 Verificando lembretes pendentes...');

    // Buscar lembretes que precisam de notificação
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    const tenMinutesAhead = new Date(now.getTime() + 10 * 60 * 1000);
    
    console.log('🕐 Janela de busca:', {
      inicio: tenMinutesAgo.toISOString(),
      agora: now.toISOString(),
      fim: tenMinutesAhead.toISOString()
    });
    
    // Buscar lembretes dentro da janela de 10 minutos (antes e depois)
    const { data: reminders, error } = await supabase
      .from('tbl_lembrete')
      .select('*')
      .gte('date', tenMinutesAgo.toISOString())
      .lte('date', tenMinutesAhead.toISOString());

    if (error) throw error;

    console.log(`📋 Encontrados ${reminders?.length || 0} lembretes para notificar`);

    if (!reminders || reminders.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Nenhum lembrete pendente', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enviar notificações diretamente via FCM V1 (mesma lógica de send-notification)
    const results = [];

    for (const reminder of reminders) {
      try {
        console.log(`🔔 Processando lembrete ${reminder.id} para usuário ${reminder.user_id}`);

        // Buscar tokens do usuário
        const { data: tokens, error: tokensError } = await supabase
          .from('notification_tokens')
          .select('*')
          .eq('user_id', reminder.user_id);

        if (tokensError) {
          throw tokensError;
        }

        if (!tokens || tokens.length === 0) {
          console.log(`⚠️ Nenhum token encontrado para usuário ${reminder.user_id}, pulando lembrete ${reminder.id}`);
          results.push({ id: reminder.id, success: false, error: 'Nenhum token de notificação para este usuário' });
          continue;
        }

        // Formatar data em formato brasileiro
        const reminderDate = new Date(reminder.date);
        const formattedDate = new Intl.DateTimeFormat('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).format(reminderDate);

        // Enviar para todos os tokens do usuário
        for (const tokenData of tokens) {
          const notificationBody = `📲 Sua tarefa: ${reminder.description || reminder.name || 'Sem descrição'}\n\n📆 Agendada para: ${formattedDate}`;
          
          await sendFCMV1(
            tokenData,
            '🔔 Lembrete AppFinanceiro',
            notificationBody,
            {
              reminderId: reminder.id,
              type: 'reminder'
            }
          );
        }

        // Marcar como notificado
        await supabase
          .from('tbl_lembrete')
          .update({ 
            notification_sent: true,
            last_notification_at: new Date().toISOString()
          })
          .eq('id', reminder.id);

        results.push({ id: reminder.id, success: true });
        console.log(`✅ Notificação enviada para lembrete ${reminder.id}`);
      } catch (err) {
        console.error(`❌ Erro ao processar lembrete ${reminder.id}:`, err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        results.push({ id: reminder.id, success: false, error: errorMessage });
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Processamento concluído',
        total: reminders.length,
        results
      }),
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

// ==== CÓDIGO COPIADO DE send-notification PARA USO DIRETO AQUI ====

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

  const { private_key, client_email } = serviceAccount;

  if (!private_key || !client_email) {
    throw new Error('FCM_SERVICE_ACCOUNT_JSON deve conter private_key e client_email');
  }

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

  const keyData = private_key
    .replace(/\\n/g, '\n')
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  
  const keyBuffer = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

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

  console.log('🔄 [check-reminders] Trocando JWT por access token OAuth2...');
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  console.log('📡 [check-reminders] Token response status:', tokenResponse.status);

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error('❌ [check-reminders] Erro ao obter access token:', {
      status: tokenResponse.status,
      body: errorText
    });
    throw new Error(`Erro ao obter access token: ${tokenResponse.status} ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  console.log('✅ [check-reminders] Access token obtido com sucesso');
  return tokenData.access_token;
}

async function sendFCMV1(tokenData: any, title: string, body: string, data: any) {
  console.log(`📱 [check-reminders] Enviando FCM V1 para usuário ${tokenData.user_id}...`);

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

  const accessToken = await getAccessToken();
  console.log('✅ [check-reminders] Access token obtido');

  const fcmPayload: any = {
    message: {
      token: tokenData.token,
      notification: { title, body },
      data: {
        ...Object.fromEntries(
          Object.entries(data || {}).map(([key, value]) => [
            key,
            typeof value === 'string' ? value : JSON.stringify(value)
          ])
        )
      },
      android: {
        priority: 'high',
        notification: {
          title,
          body,
          sound: 'default',
          channel_id: 'lembretes',
          default_sound: true,
          default_vibrate_timings: true
        }
      },
      apns: {
        payload: {
          aps: {
            alert: { title, body },
            sound: 'default',
            badge: 1
          }
        },
        headers: {
          'apns-priority': '10'
        }
      },
      webpush: {
        fcm_options: { link: '/lembretes' },
        notification: {
          title,
          body,
          icon: '/app-icon.png',
          badge: '/app-icon.png',
          requireInteraction: true,
          vibrate: [200, 100, 200],
          silent: false,
          renotify: true,
          tag: 'lembrete'
        },
        headers: {
          'Urgency': 'high'
        }
      }
    }
  };

  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(fcmPayload)
  });

  console.log('📡 [check-reminders] FCM response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ [check-reminders] Erro ao enviar notificação FCM:', {
      status: response.status,
      body: errorText
    });
    throw new Error(`Erro ao enviar notificação FCM: ${response.status} ${errorText}`);
  }

  const responseData = await response.json();
  console.log('✅ [check-reminders] FCM V1 enviado para web:', responseData);
}
