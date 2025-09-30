
import React from 'react';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UseFormReturn } from 'react-hook-form';
import { TransactionFormValues } from '@/schemas/transactionSchema';
import { useAppContext } from '@/contexts/AppContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import { Goal } from '@/types';

interface GoalSelectorProps {
  form: UseFormReturn<TransactionFormValues>;
}

const GoalSelector: React.FC<GoalSelectorProps> = ({ form }) => {
  const { goals } = useAppContext();
  const { t } = usePreferences();

  return null;
};

export default GoalSelector;
