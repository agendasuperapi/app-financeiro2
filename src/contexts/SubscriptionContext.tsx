
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Subscription {
  id: string;
  status: string;
  plan_type: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  stripe_subscription_id: string | null;
}

interface SubscriptionContextType {
  subscription: Subscription | null;
  isLoading: boolean;
  checkSubscription: () => Promise<void>;
  hasActiveSubscription: boolean;
  isSubscriptionExpiring: boolean;
  isSubscriptionExpired: boolean; // Nova propriedade para verificar se está expirado
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkSubscription = async () => {
    console.log('SubscriptionContext: Starting subscription check...');
    try {
      setIsLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.log('SubscriptionContext: User not authenticated:', userError?.message);
        setSubscription(null);
        setIsLoading(false);
        return;
      }

      console.log('SubscriptionContext: User authenticated, checking subscription...');

      // Usar a nova edge function para verificar assinatura
      const { data, error } = await supabase.functions.invoke('check-subscription-status');

      if (error) {
        console.error('SubscriptionContext: Error with edge function:', error);
        // Fallback: tentar busca direta na tabela
        console.log('SubscriptionContext: Trying direct database query as fallback...');
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('poupeja_subscriptions')
          .select('id, status, plan_type, current_period_end, cancel_at_period_end, stripe_subscription_id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();

        if (fallbackError && fallbackError.code !== 'PGRST116') {
          console.error('SubscriptionContext: Error with direct query:', fallbackError);
          setSubscription(null);
        } else {
          console.log('SubscriptionContext: Fallback query result:', fallbackData);
          setSubscription(fallbackData);
        }
      } else {
        // Usar dados da edge function
        console.log('SubscriptionContext: Edge function result:', data);
        setSubscription(data?.subscription || null);
      }
    } catch (error) {
      console.error('SubscriptionContext: Unexpected error:', error);
      setSubscription(null);
    } finally {
      console.log('SubscriptionContext: Subscription check completed');
      setIsLoading(false);
    }
  };

  // Verifica se a assinatura está expirada (data atual é posterior à data de expiração)
  const isSubscriptionExpired = subscription?.current_period_end
    ? new Date() > new Date(subscription.current_period_end)
    : false;

  // Modifica a verificação de assinatura ativa para considerar também a data de expiração
  const hasActiveSubscription = subscription?.status === 'active' && !isSubscriptionExpired;
  
  // Verifica se a assinatura está expirando nos próximos 7 dias
  const isSubscriptionExpiring = subscription?.current_period_end 
    ? new Date(subscription.current_period_end) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && 
      new Date(subscription.current_period_end) > new Date()
    : false;

  useEffect(() => {
    let isMounted = true;
    
    const loadSubscription = async () => {
      if (!isMounted) return;
      
      try {
        await checkSubscription();
      } catch (error) {
        console.error('SubscriptionContext: Error loading subscription:', error);
        if (isMounted) {
          setSubscription(null);
          setIsLoading(false);
        }
      }
    };

    loadSubscription();

    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        
        if (event === 'SIGNED_IN') {
          loadSubscription();
        } else if (event === 'SIGNED_OUT') {
          setSubscription(null);
          setIsLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      authListener?.unsubscribe();
    };
  }, []);

  return (
    <SubscriptionContext.Provider value={{ 
      subscription, 
      isLoading, 
      checkSubscription, 
      hasActiveSubscription,
      isSubscriptionExpiring,
      isSubscriptionExpired
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
