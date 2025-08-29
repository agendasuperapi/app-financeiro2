import React from 'react';
import { Button } from '@/components/ui/button';
import { UseFormReturn } from 'react-hook-form';
import { TransactionType } from '@/types';
import { usePreferences } from '@/contexts/PreferencesContext';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { TrendingDown, TrendingUp, Bell } from 'lucide-react';

interface ScheduleTransactionTypeSelectorProps {
  form: UseFormReturn<any>;
  onTypeChange: (type: TransactionType) => void;
}

const ScheduleTransactionTypeSelector: React.FC<ScheduleTransactionTypeSelectorProps> = ({
  form,
  onTypeChange
}) => {
  const { t } = usePreferences();

  return (
    <FormField
      control={form.control}
      name="type"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('common.type')}</FormLabel>
          <FormControl>
            <div className="grid grid-cols-1 gap-3">
              <Button
                type="button"
                variant={field.value === 'expense' ? 'default' : 'outline'}
                className={`flex items-center justify-center gap-2 h-12 ${
                  field.value === 'expense' 
                    ? 'bg-red-600 hover:bg-red-700 text-white border-red-600' 
                    : 'border-red-600 text-red-600 hover:bg-red-50'
                } shadow-md`}
                onClick={() => {
                  field.onChange('expense');
                  onTypeChange('expense');
                }}
              >
                <TrendingDown className="h-4 w-4" />
                <span className="font-medium">{t('common.expense')}</span>
              </Button>
              
              <Button
                type="button"
                variant={field.value === 'income' ? 'default' : 'outline'}
                className={`flex items-center justify-center gap-2 h-12 ${
                  field.value === 'income' 
                    ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' 
                    : 'border-green-600 text-green-600 hover:bg-green-50'
                } shadow-md`}
                onClick={() => {
                  field.onChange('income');
                  onTypeChange('income');
                }}
              >
                <TrendingUp className="h-4 w-4" />
                <span className="font-medium">{t('common.income')}</span>
              </Button>
              
              <Button
                type="button"
                variant={field.value === 'reminder' ? 'default' : 'outline'}
                className={`flex items-center justify-center gap-2 h-12 ${
                  field.value === 'reminder' 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600' 
                    : 'border-blue-600 text-blue-600 hover:bg-blue-50'
                } shadow-md`}
                onClick={() => {
                  field.onChange('reminder');
                  onTypeChange('reminder');
                }}
              >
                <Bell className="h-4 w-4" />
                <span className="font-medium">Lembretes</span>
              </Button>
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default ScheduleTransactionTypeSelector;