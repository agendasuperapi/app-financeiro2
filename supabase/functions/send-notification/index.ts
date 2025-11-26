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
    const { userId, title, body, data } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`📱 Buscando tokens para usuário: ${userId}`);
    
    // Buscar tokens do usuário
    const { data: tokens, error } = await supabase
      .from('notification_tokens')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Erro ao buscar tokens:', error);
      throw error;
    }
    
    console.log(`📋 Tokens encontrados: ${JSON.stringify(tokens)}`);
    
    if (!tokens || tokens.length === 0) {
      console.log(`⚠️ Nenhum token encontrado para usuário ${userId}`);
      return new Response(
        JSON.stringify({ message: 'Nenhum token de notificação encontrado para este usuário' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    for (const tokenData of tokens) {
      try {
        if (tokenData.platform === 'web') {
          // Enviar Web Push
          await sendWebPush(tokenData, title, body, data);
        } else {
          // Enviar via FCM (Android/iOS)
          await sendFCM(tokenData, title, body, data);
        }
        results.push({ platform: tokenData.platform, success: true });
      } catch (err) {
        console.error(`❌ Erro ao enviar para ${tokenData.platform}:`, err);
        results.push({ platform: tokenData.platform, success: false, error: err.message });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function sendWebPush(tokenData: any, title: string, body: string, data: any) {
  console.log('🌐 Tentando enviar Web Push...');
  
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const vapidEmail = Deno.env.get('VAPID_EMAIL') || 'mailto:contato@seuapp.com';

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.error('❌ Chaves VAPID não configuradas!');
    throw new Error('Chaves VAPID não estão configuradas. Configure VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY nos secrets.');
  }

  console.log('✅ Chaves VAPID encontradas');

  const webpush = await import('https://esm.sh/web-push@3.6.6');
  webpush.default.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

  console.log('📝 Token de subscription:', tokenData.token.substring(0, 100) + '...');
  
  const subscription = JSON.parse(tokenData.token);
  
  const payload = JSON.stringify({
    title,
    body,
    data,
    tag: data?.reminderId || 'default'
  });

  console.log('📤 Enviando notificação...');
  await webpush.default.sendNotification(subscription, payload);
  console.log('✅ Web Push enviado com sucesso!');
}

async function sendFCM(tokenData: any, title: string, body: string, data: any) {
  const fcmServerKey = Deno.env.get('FCM_SERVER_KEY');
  
  const response = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `key=${fcmServerKey}`
    },
    body: JSON.stringify({
      to: tokenData.token,
      notification: {
        title,
        body,
        sound: 'default',
        badge: '1'
      },
      data
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`FCM error: ${error}`);
  }

  console.log(`✅ FCM enviado para ${tokenData.platform}`);
}
