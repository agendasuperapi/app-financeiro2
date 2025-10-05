
import React from 'react';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { UseFormReturn } from 'react-hook-form';
import { TransactionFormValues } from '@/schemas/transactionSchema';
import { usePreferences } from '@/contexts/PreferencesContext';
import { getCategoriesByType } from '@/services/categoryService';

interface CategoryDateFieldsProps {
  form: UseFormReturn<TransactionFormValues>;
  transactionType: 'income' | 'expense' | 'reminder' | 'lembrete' | 'outros';
}

const CategoryDateFields: React.FC<CategoryDateFieldsProps> = ({ form, transactionType }) => {
  const { t } = usePreferences();

  // Automatically set "Outros" category
  React.useEffect(() => {
    const setOutrosCategory = async () => {
      try {
        const categories = await getCategoriesByType(transactionType);
        const outrosCategory = categories.find(c => c.name === 'Outros');
        
        if (outrosCategory) {
          form.setValue('category', outrosCategory.id, { shouldValidate: false });
        }
      } catch (error) {
        console.error("Error setting Outros category:", error);
      }
    };

    setOutrosCategory();
  }, [transactionType, form]);

  return (
    <FormField
      control={form.control}
      name="date"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('transactions.date')}</FormLabel>
          <FormControl>
            <Input type="date" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default CategoryDateFields;
