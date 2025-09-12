import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
  price_id: string;
  description: string;
  features: string[];
  popular: boolean;
  plan_type: 'monthly' | 'annual';
  original_price?: number;
  savings_percentage?: number;
}

export const usePlansFromTable = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setIsLoading(true);
        
        // Try to fetch from tbl_planos table
        // Note: You need to create this table in your Supabase database first
        try {
          const response = await supabase
            .from('tbl_planos' as any)
            .select('*')
            .order('plan_type', { ascending: true });

          if (response.error) {
            console.warn('Table tbl_planos not found, using fallback data');
            throw response.error;
          }

          setPlans((response.data as unknown as Plan[]) || []);
        } catch (tableError) {
          // Fallback: Use default plan data if table doesn't exist
          const fallbackPlans: Plan[] = [
            {
              id: '1',
              name: 'Plano Mensal',
              price: 279.90,
              period: '/mês',
              price_id: 'price_monthly',
              description: 'Para uso pessoal completo',
              features: [
                'Transações ilimitadas',
                'Dashboard personalizado',
                'Relatórios detalhados',
                'Metas financeiras',
                'Agendamentos',
                'Suporte via email'
              ],
              popular: false,
              plan_type: 'monthly'
            },
            {
              id: '2',
              name: 'Plano Anual',
              price: 177.00,
              period: '/ano',
              price_id: 'price_annual',
              description: 'Melhor custo-benefício',
              features: [
                'Transações ilimitadas',
                'Dashboard personalizado', 
                'Relatórios detalhados',
                'Metas financeiras',
                'Agendamentos',
                'Suporte VIP',
                'Backup automático',
                'Analytics avançado'
              ],
              popular: true,
              plan_type: 'annual',
              original_price: 358.80,
              savings_percentage: 25
            }
          ];
          
          setPlans(fallbackPlans);
        }
        setError(null);
      } catch (err) {
        console.error('Error fetching plans:', err);
        setError(err instanceof Error ? err.message : 'Failed to load plans');
        setPlans([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlans();
  }, []);

  return { plans, isLoading, error };
};