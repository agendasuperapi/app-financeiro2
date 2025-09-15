
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import { Crown, Calendar, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

const SubscriptionStatusCard: React.FC<{ userId?: string }> = ({ userId }) => {
  const { subscription, hasActiveSubscription, isSubscriptionExpiring, isSubscriptionExpired } = useSubscription();
  const { t, language } = usePreferences();
  
  const locale = language === 'pt' ? ptBR : enUS;

  type SubLite = { status: string | null; plan_type: string | null; current_period_end: string | null; cancel_at_period_end: boolean | null };
  const [clientSub, setClientSub] = useState<SubLite | null>(null);

  useEffect(() => {
    if (!userId) { setClientSub(null); return; }
    (async () => {
      const { data, error } = await supabase
        .from('poupeja_subscriptions')
        .select('status, plan_type, current_period_end, cancel_at_period_end')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();
      if (error && (error as any).code !== 'PGRST116') {
        console.error('Error fetching client subscription:', error);
      }
      setClientSub((data as any) || null);
    })();
  }, [userId]);

  const sub = (userId ? clientSub : (subscription as any)) as SubLite | null;
  const isExpired = sub?.current_period_end ? new Date() > new Date(sub.current_period_end) : false;
  const hasActive = sub?.status === 'active' && !isExpired;
  const isExpiring = sub?.current_period_end
    ? new Date(sub.current_period_end) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && new Date(sub.current_period_end) > new Date()
    : false;

  const getStatusVariant = () => {
    if (sub?.cancel_at_period_end) return 'destructive';
    if (isExpired) return 'destructive';
    if (!hasActive) return 'destructive';
    if (isExpiring) return 'outline';
    return 'success';
  };

  const getStatusText = () => {
    if (sub?.cancel_at_period_end) return 'Cancelamento Solicitado';
    if (isExpired) return 'Plano Vencido';
    if (!hasActive) return t('plans.status.inactive');
    if (isExpiring) return t('plans.status.expiring');
    return t('plans.status.active');
  };

  const getPlanText = () => {
    const s = sub;
    if (!s) return t('plans.noPlan');
    
    // Determine plan type based on plan_type field
    switch (s.plan_type) {
      case 'monthly':
        return t('plans.monthly');
      case 'annual':
        return t('plans.annual');
      default:
        return s.plan_type || t('plans.free');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return format(new Date(dateString), 'dd/MM/yyyy', { locale });
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            {t('plans.currentPlan')}
          </CardTitle>
          <Badge variant={getStatusVariant()}>
            {getStatusText()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">
              {getPlanText()}
            </p>
            {sub?.current_period_end && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <Calendar className="h-4 w-4" />
                {sub?.cancel_at_period_end ? 'Válido até' : isExpired ? 'Vencido em' : hasActive ? t('plans.renewsOn') : t('plans.expiresOn')}: {formatDate(sub.current_period_end)}
              </div>
            )}
          </div>
          {isExpiring && hasActive && (
            <div className="flex items-center gap-1 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">{t('plans.status.expiring')}</span>
            </div>
          )}
          {isExpired && (
            <div className="flex items-center gap-1 text-red-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Plano vencido</span>
            </div>
          )}
        </div>
        {sub?.cancel_at_period_end && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">
              Seu plano foi cancelado, para seguir com o plano clique em <strong>Gerenciar Assinatura</strong> e depois em <strong>Atualizar assinatura</strong>.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SubscriptionStatusCard;
