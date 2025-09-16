import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { TransactionFormValues } from '@/schemas/transactionSchema';
import { usePreferences } from '@/contexts/PreferencesContext';

interface ContaInputProps {
  form: UseFormReturn<TransactionFormValues>;
}

const ContaInput: React.FC<ContaInputProps> = ({ form }) => {
  const { t } = usePreferences();

  return (
    <FormField
      control={form.control}
      name="conta"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('transactions.account')}</FormLabel>
          <FormControl>
            <Input 
              placeholder={t('transactions.accountPlaceholder')}
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default ContaInput;