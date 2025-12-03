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

    console.log('🔍 Verificando lembretes e agendamentos pendentes...');

    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    const tenMinutesAhead = new Date(now.getTime() + 10 * 60 * 1000);
    
    console.log('🕐 Janela de busca:', {
      inicio: tenMinutesAgo.toISOString(),
      agora: now.toISOString(),
      fim: tenMinutesAhead.toISOString()
    });
    
    // ========== LEMBRETES (tbl_lembrete) ==========
    const { data: reminders, error: remindersError } = await supabase
      .from('tbl_lembrete')
      .select('*')
      .gte('date', tenMinutesAgo.toISOString())
      .lte('date', tenMinutesAhead.toISOString())
      .neq('status', 'lembrado')
      .or('notification_sent.is.null,notification_sent.eq.false');

    if (remindersError) throw remindersError;

    console.log(`📋 Encontrados ${reminders?.length || 0} lembretes para notificar`);

    // ========== AGENDAMENTOS (poupeja_transactions) ==========
    const { data: scheduledTransactions, error: scheduledError } = await supabase
      .from('poupeja_transactions')
      .select('*')
      .eq('formato', 'agenda')
      .eq('status', 'pending')
      .gte('date', tenMinutesAgo.toISOString())
      .lte('date', tenMinutesAhead.toISOString())
      .or('notification_sent.is.null,notification_sent.eq.false');

    if (scheduledError) {
      console.error('❌ Erro ao buscar agendamentos:', scheduledError);
    }

    console.log(`📅 Encontrados ${scheduledTransactions?.length || 0} agendamentos para notificar`);

    const results = [];

    // ========== PROCESSAR LEMBRETES ==========
    if (reminders && reminders.length > 0) {
      for (const reminder of reminders) {
        try {
          console.log(`🔔 Processando lembrete ${reminder.id} para usuário ${reminder.user_id}`);

          const { data: tokens, error: tokensError } = await supabase
            .from('notification_tokens')
            .select('*')
            .eq('user_id', reminder.user_id);

          if (tokensError) throw tokensError;

          if (!tokens || tokens.length === 0) {
            console.log(`⚠️ Nenhum token encontrado para usuário ${reminder.user_id}`);
            results.push({ id: reminder.id, type: 'reminder', success: false, error: 'Nenhum token' });
            continue;
          }

          const { data: settings } = await supabase
            .from('notification_settings')
            .select('*')
            .eq('user_id', reminder.user_id)
            .single();

          const soundType = settings?.sound_type || 'default';
          const vibrationEnabled = settings?.vibration_enabled ?? true;

          const reminderDate = new Date(reminder.date);
          const formattedDate = new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }).format(reminderDate);

          for (const tokenData of tokens) {
            const notificationBody = `📲 Sua tarefa: ${reminder.description || reminder.name || 'Sem descrição'}\n\n📆 Agendada para: ${formattedDate}`;
            
            await sendFCMV1(
              tokenData,
              '🔔 Lembrete AppFinanceiro',
              notificationBody,
              {
                reminderId: reminder.id,
                type: 'reminder'
              },
              soundType,
              vibrationEnabled
            );
          }

          await supabase
            .from('tbl_lembrete')
            .update({ 
              notification_sent: true,
              last_notification_at: new Date().toISOString(),
              status: 'lembrado'
            })
            .eq('id', reminder.id);

          results.push({ id: reminder.id, type: 'reminder', success: true });
          console.log(`✅ Notificação enviada para lembrete ${reminder.id}`);
        } catch (err) {
          console.error(`❌ Erro ao processar lembrete ${reminder.id}:`, err);
          results.push({ id: reminder.id, type: 'reminder', success: false, error: String(err) });
        }
      }
    }

    // ========== PROCESSAR AGENDAMENTOS ==========
    if (scheduledTransactions && scheduledTransactions.length > 0) {
      for (const transaction of scheduledTransactions) {
        try {
          console.log(`📅 Processando agendamento ${transaction.id} para usuário ${transaction.user_id}`);

          const { data: tokens, error: tokensError } = await supabase
            .from('notification_tokens')
            .select('*')
            .eq('user_id', transaction.user_id);

          if (tokensError) throw tokensError;

          if (!tokens || tokens.length === 0) {
            console.log(`⚠️ Nenhum token encontrado para usuário ${transaction.user_id}`);
            results.push({ id: transaction.id, type: 'scheduled', success: false, error: 'Nenhum token' });
            continue;
          }

          const { data: settings } = await supabase
            .from('notification_settings')
            .select('*')
            .eq('user_id', transaction.user_id)
            .single();

          const soundType = settings?.sound_type || 'default';
          const vibrationEnabled = settings?.vibration_enabled ?? true;

          const transactionDate = new Date(transaction.date);
          const formattedDate = new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }).format(transactionDate);

          const formattedAmount = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          }).format(transaction.amount || 0);

          const typeLabel = transaction.type === 'expense' ? '💸 Despesa' : '💰 Receita';

          for (const tokenData of tokens) {
            const notificationBody = `${typeLabel}: ${transaction.description || 'Sem descrição'}\n💵 Valor: ${formattedAmount}\n📆 Data: ${formattedDate}`;
            
            await sendFCMV1WithActions(
              tokenData,
              '📅 Agendamento Pendente',
              notificationBody,
              {
                transactionId: transaction.id,
                type: 'scheduled_transaction',
                amount: String(transaction.amount),
                transactionType: transaction.type
              },
              soundType,
              vibrationEnabled
            );
          }

          // Marcar como notificado (não muda status, só marca que foi notificado)
          await supabase
            .from('poupeja_transactions')
            .update({ 
              notification_sent: true,
              last_notification_at: new Date().toISOString()
            })
            .eq('id', transaction.id);

          results.push({ id: transaction.id, type: 'scheduled', success: true });
          console.log(`✅ Notificação enviada para agendamento ${transaction.id}`);
        } catch (err) {
          console.error(`❌ Erro ao processar agendamento ${transaction.id}:`, err);
          results.push({ id: transaction.id, type: 'scheduled', success: false, error: String(err) });
        }
      }
    }

    const totalProcessed = (reminders?.length || 0) + (scheduledTransactions?.length || 0);

    return new Response(
      JSON.stringify({ 
        message: 'Processamento concluído',
        total: totalProcessed,
        reminders: reminders?.length || 0,
        scheduled: scheduledTransactions?.length || 0,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ==== FUNÇÕES FCM ====

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

  console.log('🔄 Trocando JWT por access token OAuth2...');
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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
  console.log('✅ Access token obtido com sucesso');
  return tokenData.access_token;
}

async function sendFCMV1(
  tokenData: any, 
  title: string, 
  body: string, 
  data: any, 
  soundType: string = 'default',
  vibrationEnabled: boolean = true
) {
  const serviceAccountJson = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON');
  if (!serviceAccountJson) {
    throw new Error('FCM_SERVICE_ACCOUNT_JSON não configurada.');
  }

  const serviceAccount = JSON.parse(serviceAccountJson);
  const projectId = serviceAccount.project_id;
  const accessToken = await getAccessToken();

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
          sound: soundType === 'default' ? 'default' : soundType,
          channel_id: 'lembretes',
          default_sound: soundType === 'default',
          default_vibrate_timings: vibrationEnabled
        }
      },
      apns: {
        payload: {
          aps: {
            alert: { title, body },
            sound: soundType === 'default' ? 'default' : `${soundType}.caf`,
            badge: 1
          }
        },
        headers: { 'apns-priority': '10' }
      },
      webpush: {
        fcm_options: { link: '/lembrar' },
        notification: {
          title,
          body,
          icon: '/app-icon.png',
          badge: '/app-icon.png',
          requireInteraction: true,
          vibrate: vibrationEnabled ? [200, 100, 200] : [0],
          tag: 'lembrete',
          data: { ...data, soundType }
        },
        headers: { 'Urgency': 'high' }
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

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro FCM: ${response.status} ${errorText}`);
  }

  const responseData = await response.json();
  console.log('✅ FCM enviado:', responseData);
}

// Versão com botões de ação para agendamentos
async function sendFCMV1WithActions(
  tokenData: any, 
  title: string, 
  body: string, 
  data: any, 
  soundType: string = 'default',
  vibrationEnabled: boolean = true
) {
  const serviceAccountJson = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON');
  if (!serviceAccountJson) {
    throw new Error('FCM_SERVICE_ACCOUNT_JSON não configurada.');
  }

  const serviceAccount = JSON.parse(serviceAccountJson);
  const projectId = serviceAccount.project_id;
  const accessToken = await getAccessToken();

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
          sound: soundType === 'default' ? 'default' : soundType,
          channel_id: 'agendamentos',
          default_sound: soundType === 'default',
          default_vibrate_timings: vibrationEnabled,
          click_action: 'OPEN_SCHEDULE'
        }
      },
      apns: {
        payload: {
          aps: {
            alert: { title, body },
            sound: soundType === 'default' ? 'default' : `${soundType}.caf`,
            badge: 1,
            category: 'SCHEDULED_TRANSACTION'
          }
        },
        headers: { 'apns-priority': '10' }
      },
      webpush: {
        fcm_options: { link: '/schedule' },
        notification: {
          title,
          body,
          icon: '/app-icon.png',
          badge: '/app-icon.png',
          requireInteraction: true,
          vibrate: vibrationEnabled ? [200, 100, 200] : [0],
          tag: `agendamento-${data.transactionId}`,
          actions: [
            { action: 'mark_paid', title: '✅ Marcar como pago' },
            { action: 'view', title: '👁️ Ver detalhes' }
          ],
          data: { ...data, soundType }
        },
        headers: { 'Urgency': 'high' }
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

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro FCM: ${response.status} ${errorText}`);
  }

  const responseData = await response.json();
  console.log('✅ FCM com ações enviado:', responseData);
}
