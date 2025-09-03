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
  const {
    t
  } = usePreferences();
  return <FormField control={form.control} name="type" render={({
    field
  }) => {}} />;
};
export default ScheduleTransactionTypeSelector;