
import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import SubscriptionStatusCard from '@/components/subscription/SubscriptionStatusCard';
import PlanCard from '@/components/subscription/PlanCard';
import ManageSubscriptionButton from '@/components/subscription/ManageSubscriptionButton';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { usePlansFromTable } from '@/hooks/usePlansFromTable';
import { Loader2, User } from 'lucide-react';
import { useClientAwareData } from '@/hooks/useClientAwareData';

const PlansPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = usePreferences();
  const { toast } = useToast();
  const { hasActiveSubscription } = useSubscription();
  const { plans: plansData, isLoading: configLoading } = usePlansFromTable();
  const { isClientView, selectedUser } = useClientAwareData();

  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');

  useEffect(() => {
    if (success === 'true') {
      toast({
        title: "Pagamento realizado com sucesso!",
        description: "Sua assinatura foi ativada. Bem-vindo ao PoupeJá!",
      });
      // Remove the search params from URL
      navigate('/plans', { replace: true });
    } else if (canceled === 'true') {
      toast({
        title: "Pagamento cancelado",
        description: "Você pode tentar novamente quando quiser.",
        variant: "destructive",
      });
      // Remove the search params from URL
      navigate('/plans', { replace: true });
    }
  }, [success, canceled, navigate, toast]);

  // Mostrar carregamento enquanto busca as configurações
  if (configLoading) {
    return (
      <MainLayout title={t('plans.title')}>
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Carregando planos...</span>
          </div>
        </div>
      </MainLayout>
    );
  }

  const plans = plansData.map(plan => ({
    name: plan.name,
    price: `R$ ${plan.price.toFixed(2).replace('.', ',')}`,
    period: plan.period,
    priceId: plan.price_id,
    originalPrice: plan.original_price ? `R$ ${plan.original_price.toFixed(2).replace('.', ',')}` : undefined,
    savings: plan.savings_percentage ? `Economize ${plan.savings_percentage}%` : undefined,
    description: plan.description,
    features: plan.features,
    popular: plan.popular,
    planType: plan.plan_type,
  }));

  return (
    <MainLayout title={t('plans.title')}>
      <div className="max-w-6xl mx-auto">
        {isClientView && selectedUser && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
            <div className="flex items-center gap-2 text-blue-800">
              <User className="h-4 w-4" />
              <span className="font-medium">
                Visualizando relatórios de: {selectedUser.name} ({selectedUser.email})
              </span>
            </div>
          </div>
        )}
        {/* Subscription Status Card */}
        <SubscriptionStatusCard />

        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">{t('plans.title')}</h1>
          <p className="text-muted-foreground">{t('plans.subtitle')}</p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {plans.map((plan) => (
            <PlanCard
              key={plan.planType}
              name={plan.name}
              price={plan.price}
              period={plan.period}
              priceId={plan.priceId}
              originalPrice={plan.originalPrice}
              savings={plan.savings}
              description={plan.description}
              features={plan.features}
              popular={plan.popular}
              planType={plan.planType}
            />
          ))}
        </div>

        {/* Manage Subscription Section */}
        {hasActiveSubscription && (
          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold">{t('plans.manageSubscription')}</h3>
            <p className="text-muted-foreground mb-4">
              Gerencie sua assinatura, altere a forma de pagamento ou cancele quando quiser.
            </p>
            <div className="max-w-sm mx-auto">
              <ManageSubscriptionButton />
            </div>
          </div>
        )}

        {/* Back Button for non-authenticated users */}
        <div className="text-center mt-8">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Voltar
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default PlansPage;
