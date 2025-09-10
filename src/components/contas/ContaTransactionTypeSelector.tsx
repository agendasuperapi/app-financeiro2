import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UseFormReturn } from 'react-hook-form';
import { usePreferences } from '@/contexts/PreferencesContext';

interface ContaTransactionTypeSelectorProps {
  form: UseFormReturn<any>;
  onTypeChange: (type: 'income' | 'expense') => void;
}

const ContaTransactionTypeSelector: React.FC<ContaTransactionTypeSelectorProps> = ({ form, onTypeChange }) => {
  const { t } = usePreferences();

  return (
    <FormField
      control={form.control}
      name="type"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('common.type')}</FormLabel>
          <Select 
            onValueChange={(value: 'income' | 'expense') => {
              field.onChange(value);
              onTypeChange(value);
            }} 
            value={field.value}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={t('transactions.selectType')} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="expense">{t('dashboard.expenses')}</SelectItem>
              <SelectItem value="income">{t('dashboard.income')}</SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default ContaTransactionTypeSelector;