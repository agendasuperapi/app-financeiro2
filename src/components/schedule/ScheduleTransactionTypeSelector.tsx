import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { UseFormReturn } from 'react-hook-form';
import { TransactionType } from '@/types';
import { usePreferences } from '@/contexts/PreferencesContext';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { TrendingDown, TrendingUp, Bell } from 'lucide-react';
import { useLocation } from 'react-router-dom';
interface ScheduleTransactionTypeSelectorProps {
  form: UseFormReturn<any>;
  onTypeChange: (type: TransactionType) => void;
}
const ScheduleTransactionTypeSelector: React.FC<ScheduleTransactionTypeSelectorProps> = ({
  form,
  onTypeChange
}) => {
  const {
    t
  } = usePreferences();
  
  const location = useLocation();
  const isLembretesPage = location.pathname === '/lembretes';

  // Auto-set type to 'outros' when on lembretes page
  useEffect(() => {
    if (isLembretesPage) {
      form.setValue('type', 'outros');
      onTypeChange('outros');
    }
  }, [isLembretesPage, form, onTypeChange]);

  // On lembretes page, don't render the type selector
  if (isLembretesPage) {
    return null;
  }

  return <FormField control={form.control} name="type" render={({
    field
  }) => <FormItem>
          <FormLabel>{t('transactions.transactionType')}</FormLabel>
          <FormControl>
            <div className="grid grid-cols-3 gap-2">
              <Button type="button" variant={field.value === 'expense' ? 'default' : 'outline'} className="flex items-center gap-2" onClick={() => {
            field.onChange('expense');
            onTypeChange('expense');
          }}>
                <TrendingDown className="w-4 h-4" />
                {t('transactions.expense')}
              </Button>
              <Button type="button" variant={field.value === 'income' ? 'default' : 'outline'} className="flex items-center gap-2" onClick={() => {
            field.onChange('income');
            onTypeChange('income');
          }}>
                <TrendingUp className="w-4 h-4" />
                {t('transactions.income')}
              </Button>
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>} />;
};
export default ScheduleTransactionTypeSelector;