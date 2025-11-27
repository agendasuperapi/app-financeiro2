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
    
    const { data: reminders, error } = await supabase
      .from('tbl_lembrete')
      .select('*')
      .eq('status', 'pending')
      .eq('notification_sent', false)
      .lte('date', now.toISOString());

    if (error) throw error;

    console.log(`📋 Encontrados ${reminders?.length || 0} lembretes para notificar`);

    if (!reminders || reminders.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Nenhum lembrete pendente', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enviar notificações
    const results = [];
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    for (const reminder of reminders) {
      try {
        // Chamar send-notification diretamente via fetch com autenticação
        const response = await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
          },
          body: JSON.stringify({
            userId: reminder.user_id,
            title: `💰 Lembrete: ${reminder.name || 'Transação'}`,
            body: reminder.description || 'Você tem um lembrete pendente',
            data: {
              reminderId: reminder.id,
              type: 'reminder'
            }
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Erro ao enviar notificação: ${response.status} ${errorText}`);
        }

        const data = await response.json();

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
