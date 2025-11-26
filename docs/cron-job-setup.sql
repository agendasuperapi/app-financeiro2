-- ============================================
-- CONFIGURAÇÃO DE CRON JOB PARA NOTIFICAÇÕES
-- ============================================
-- 
-- IMPORTANTE: Substitua SEU_PROJECT_ID pelo ID do seu projeto Supabase
-- O ID do projeto pode ser encontrado em: Project Settings > General > Reference ID
-- 
-- Exemplo: https://gpttodmpflpzhbgzagcc.supabase.co
-- O ID seria: gpttodmpflpzhbgzagcc
--

-- Passo 1: Ativar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Passo 2: Criar cron job que executa a cada 5 minutos
-- Este job irá chamar a edge function check-reminders
SELECT cron.schedule(
  'check-reminders-every-5-minutes',
  '*/5 * * * *', -- A cada 5 minutos
  $$
  SELECT net.http_post(
    url := 'https://gpttodmpflpzhbgzagcc.supabase.co/functions/v1/check-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    )
  ) as request_id;
  $$
);

-- Passo 3: Verificar se o cron job foi criado com sucesso
SELECT 
  jobid,
  schedule,
  command,
  active,
  jobname
FROM cron.job
WHERE jobname = 'check-reminders-every-5-minutes';

-- ============================================
-- COMANDOS ÚTEIS PARA GERENCIAR O CRON JOB
-- ============================================

-- Ver todos os cron jobs
-- SELECT * FROM cron.job;

-- Ver histórico de execuções (últimas 10)
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- Desativar o cron job (se necessário)
-- SELECT cron.unschedule('check-reminders-every-5-minutes');

-- Reativar o cron job
-- SELECT cron.schedule(
--   'check-reminders-every-5-minutes',
--   '*/5 * * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://SEU_PROJECT_ID.supabase.co/functions/v1/check-reminders',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
--     )
--   ) as request_id;
--   $$
-- );

-- Alterar frequência para a cada 1 minuto (mais rápido, usa mais recursos)
-- SELECT cron.unschedule('check-reminders-every-5-minutes');
-- SELECT cron.schedule(
--   'check-reminders-every-1-minute',
--   '* * * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://SEU_PROJECT_ID.supabase.co/functions/v1/check-reminders',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
--     )
--   ) as request_id;
--   $$
-- );

-- Alterar frequência para a cada 15 minutos (mais lento, economiza recursos)
-- SELECT cron.unschedule('check-reminders-every-5-minutes');
-- SELECT cron.schedule(
--   'check-reminders-every-15-minutes',
--   '*/15 * * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://SEU_PROJECT_ID.supabase.co/functions/v1/check-reminders',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
--     )
--   ) as request_id;
--   $$
-- );
