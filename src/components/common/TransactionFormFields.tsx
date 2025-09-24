import React from 'react';
import { Button } from '@/components/ui/button';
import { usePreferences } from '@/contexts/PreferencesContext';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { UseFormReturn } from 'react-hook-form';
import TransactionTypeSelector from './TransactionTypeSelector';
import AmountInput from './AmountInput';
import CategoryDateFields from './CategoryDateFields';
import DescriptionField from './DescriptionField';
import GoalSelector from './GoalSelector';
import ContaAddedByGrid from './ContaAddedByGrid';

interface TransactionFormFieldsProps {
  form: UseFormReturn<any>;
  onCancel?: () => void;
  onSubmit?: () => void;
  mode?: 'create' | 'edit';
  selectedType?: 'income' | 'expense';
  onTypeChange?: (type: 'income' | 'expense') => void;
  isOnline?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  showDeleteButton?: boolean;
  onDelete?: () => void;
}

const TransactionFormFields: React.FC<TransactionFormFieldsProps> = ({
  form,
  onCancel,
  onSubmit,
  mode = 'create',
  selectedType = 'expense',
  onTypeChange,
  isOnline = true,
  submitLabel,
  cancelLabel,
  showDeleteButton = false,
  onDelete
}) => {
  const { t } = usePreferences();

  return (
    <div className="space-y-6">
      <TransactionTypeSelector form={form} onTypeChange={onTypeChange} />
      <DescriptionField form={form} />
      <AmountInput form={form} />
      <ContaAddedByGrid form={form} />
      <CategoryDateFields form={form} transactionType={selectedType} />
      
      {selectedType === 'income' && (
        <GoalSelector form={form} />
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center pt-4">
        {showDeleteButton && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onDelete}
            disabled={!isOnline}
            className="w-full sm:w-auto"
          >
            {t('common.delete')}
          </Button>
        )}
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="flex-1 sm:flex-initial min-w-20"
          >
            {cancelLabel || t('common.cancel')}
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={!isOnline}
            className={`flex-1 sm:flex-initial min-w-20 ${selectedType === 'income' ? 'bg-green-600 hover:bg-green-700' : ''}`}
            onClick={onSubmit}
          >
            {submitLabel || (mode === 'create' ? t('common.add') : t('common.save'))}
          </Button>
        </div>
      </div>
      
      {!isOnline && (
        <p className="text-xs text-muted-foreground text-right mt-2">
          {t('schedule.editingRequiresConnection')}
        </p>
      )}
    </div>
  );
};

export default TransactionFormFields;