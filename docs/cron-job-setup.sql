-- ============================================
-- 🕐 CONFIGURAÇÃO DO CRON JOB DE LEMBRETES
-- ============================================
-- Este script cria um cron job que verifica lembretes a cada 5 minutos
-- e envia notificações push quando necessário.
--
-- ⚠️ IMPORTANTE: Substitua os seguintes valores antes de executar:
--   1. SEU_PROJECT_ID: ID do seu projeto Supabase (Settings > General > Reference ID)
--   2. SUA_ANON_KEY: Chave anônima do Supabase (Settings > API > anon public)
--
-- Exemplo de URL: https://gpttodmpflpzhbgzagcc.supabase.co/functions/v1/check-reminders
-- ============================================

-- Passo 1: Ativar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Passo 2: Remover cron job existente (APENAS se já existir um job com esse nome)
-- Descomente a linha abaixo APENAS se você já tiver criado esse cron job antes:
-- SELECT cron.unschedule('check-reminders-every-5-minutes');

-- Passo 3: Criar novo cron job que executa a cada 5 minutos
SELECT cron.schedule(
  'check-reminders-every-5-minutes',
  '*/5 * * * *', -- A cada 5 minutos (formato: minuto hora dia mês dia-da-semana)
  $$
  SELECT net.http_post(
    url := 'https://SEU_PROJECT_ID.supabase.co/functions/v1/check-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer SUA_ANON_KEY'
    )
  ) as request_id;
  $$
);

-- Passo 4: Verificar se o cron job foi criado corretamente
SELECT 
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active,
  jobname
FROM cron.job
WHERE jobname = 'check-reminders-every-5-minutes';

-- Passo 5: Ver histórico de execuções (últimas 10)
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'check-reminders-every-5-minutes')
ORDER BY start_time DESC 
LIMIT 10;

-- ============================================
-- 📝 COMANDOS ÚTEIS PARA GERENCIAR O CRON JOB
-- ============================================

-- 🔍 Ver todos os cron jobs ativos
-- SELECT * FROM cron.job;

-- ⏸️ Desativar o cron job
-- SELECT cron.unschedule('check-reminders-every-5-minutes');

-- ⏩ Alterar para executar a cada 1 minuto (mais frequente)
-- SELECT cron.unschedule('check-reminders-every-5-minutes');
-- SELECT cron.schedule(
--   'check-reminders-every-1-minute',
--   '* * * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://SEU_PROJECT_ID.supabase.co/functions/v1/check-reminders',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer SUA_ANON_KEY'
--     )
--   ) as request_id;
--   $$
-- );

-- ⏪ Alterar para executar a cada 15 minutos (menos frequente, economiza recursos)
-- SELECT cron.unschedule('check-reminders-every-5-minutes');
-- SELECT cron.schedule(
--   'check-reminders-every-15-minutes',
--   '*/15 * * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://SEU_PROJECT_ID.supabase.co/functions/v1/check-reminders',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer SUA_ANON_KEY'
--     )
--   ) as request_id;
--   $$
-- );

-- ============================================
-- 🔑 ONDE ENCONTRAR AS CHAVES
-- ============================================
-- 
-- 1. Acesse seu projeto no Supabase Dashboard
-- 2. Vá em Settings (ícone de engrenagem)
-- 3. PROJECT ID: Settings > General > Reference ID
-- 4. ANON KEY: Settings > API > Project API keys > anon public
-- 
-- ⚠️ Use a ANON KEY (não precisa da service role key)
-- ⚠️ Nunca compartilhe suas chaves em repositórios públicos
-- 
-- ============================================
