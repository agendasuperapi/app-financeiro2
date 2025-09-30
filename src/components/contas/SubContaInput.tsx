import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { usePreferences } from '@/contexts/PreferencesContext';

interface SubContaInputProps {
  form: UseFormReturn<any>;
}

const SubContaInput: React.FC<SubContaInputProps> = ({ form }) => {
  const { t } = usePreferences();

  return (
    <FormField
      control={form.control}
      name="sub_conta"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Sub-Conta</FormLabel>
          <FormControl>
            <Input
              placeholder="Digite a sub-conta (opcional)"
              {...field}
              value={field.value || ''}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default SubContaInput;
