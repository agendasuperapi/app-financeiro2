import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { usePreferences } from '@/contexts/PreferencesContext';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getCategoriesByType, addCategory } from '@/services/categoryService';
import { Category } from '@/types/categories';
import CategoryIcon from '@/components/categories/CategoryIcon';
import ContaAddedByGrid from '@/components/common/ContaAddedByGrid';
import { UseFormReturn } from 'react-hook-form';
import { Plus } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import CategoryForm from '@/components/categories/CategoryForm';
import { toast } from 'sonner';

interface ContaFormFieldsProps {
  form: UseFormReturn<any>;
  showInstallments?: boolean;
  onCancel?: () => void;
  onSubmit?: () => void;
  mode?: 'create' | 'edit';
  isOnline?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  showDeleteButton?: boolean;
  onDelete?: () => void;
}

const ContaFormFields: React.FC<ContaFormFieldsProps> = ({
  form,
  showInstallments = true,
  onCancel,
  onSubmit,
  mode = 'create',
  isOnline = true,
  submitLabel,
  cancelLabel,
  showDeleteButton = false,
  onDelete
}) => {
  const { t } = usePreferences();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [selectOpen, setSelectOpen] = useState(false);

  // Load categories based on selected transaction type
  useEffect(() => {
    const loadCategories = async () => {
      setLoadingCategories(true);
      try {
        const transactionType = form.watch('type');
        const categoryData = await getCategoriesByType(transactionType);
        setCategories(categoryData);

        // Para "Receita", sempre usar categoria "Outros"
        if (transactionType === 'income') {
          const outrosCategory = categoryData.find(c => c.name.toLowerCase() === 'outros');
          if (outrosCategory) {
            form.setValue('category', outrosCategory.id);
          }
        } else {
          // Set default category if none selected and categories are available
          if (categoryData.length > 0) {
            const currentCategory = form.getValues('category');
            const categoryExists = categoryData.some(c => c.id === currentCategory || c.name === currentCategory);
            if (!categoryExists) {
              form.setValue('category', categoryData[0].id);
            }
          }
        }
      } catch (error) {
        console.error('Error loading categories:', error);
        setCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };
    loadCategories();
  }, [form.watch('type')]);

  const handleAddCategory = async (categoryData: Omit<Category, 'id'>) => {
    try {
      const categoryType = form.watch('type') === 'income' ? 'income' : 'expense';
      
      const newCategory = await addCategory({
        ...categoryData,
        type: categoryType
      } as Omit<Category, 'id'>);
      
      if (newCategory) {
        toast.success(`Categoria ${categoryData.name} adicionada com sucesso`);
        
        // Reload categories
        const reloadedCategories = await getCategoriesByType(form.watch('type'));
        setCategories(reloadedCategories);
        
        // Select the new category
        form.setValue('category', newCategory.id);
        
        setCategoryFormOpen(false);
      }
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Erro ao adicionar categoria');
    }
  };

  return (
    <div className="space-y-4">
      {/* Transaction Type Field */}
      <FormField
        control={form.control}
        name="type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Tipo de Transação</FormLabel>
            <FormControl>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={field.value === 'income' ? 'default' : 'outline'}
                  onClick={() => field.onChange('income')}
                  className={`${field.value === 'income' 
                    ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' 
                    : 'border-green-600 text-green-600 hover:bg-green-50'
                  }`}
                >
                  Receita
                </Button>
                <Button
                  type="button"
                  variant={field.value === 'expense' ? 'default' : 'outline'}
                  onClick={() => field.onChange('expense')}
                  className={`${field.value === 'expense'
                    ? 'bg-red-600 hover:bg-red-700 text-white border-red-600'
                    : 'border-red-600 text-red-600 hover:bg-red-50'
                  }`}
                >
                  Despesa
                </Button>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      {/* Description Field */}
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('common.description')}</FormLabel>
            <FormControl>
              <Input {...field} placeholder="Digite a descrição da transação..." />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      {/* Amount Field */}
      <FormField
        control={form.control}
        name="amount"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('common.amount')}</FormLabel>
            <FormControl>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                {...field}
                onChange={e => field.onChange(Math.abs(parseFloat(e.target.value) || 0))}
                placeholder="0,00"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Conta and AddedBy Fields */}
      <ContaAddedByGrid form={form} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recurrence Field */}
        <FormField
          control={form.control}
          name="recurrence"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('schedule.recurrence')}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('schedule.recurrence')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="once">{t('schedule.once')}</SelectItem>
                  <SelectItem value="daily">{t('schedule.daily')}</SelectItem>
                  <SelectItem value="weekly">{t('schedule.weekly')}</SelectItem>
                  <SelectItem value="monthly">{t('schedule.monthly')}</SelectItem>
                  <SelectItem value="yearly">{t('schedule.yearly')}</SelectItem>
                  {showInstallments && <SelectItem value="installments">Parcelas</SelectItem>}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Scheduled Date Field */}
        <FormField
          control={form.control}
          name="scheduledDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('schedule.scheduledFor')}</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Category Field - only show for expense */}
      {form.watch('type') !== 'income' && (
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('common.category')}</FormLabel>
              <Select
                open={selectOpen}
                onOpenChange={setSelectOpen}
                onValueChange={field.onChange}
                value={field.value}
                disabled={loadingCategories}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingCategories ? t('common.loading') : "Qual Categoria"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent 
                  position="popper" 
                  className="w-full max-h-[200px] overflow-y-auto z-[9999]" 
                  sideOffset={5}
                  align="start"
                  avoidCollisions={true}
                >
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <CategoryIcon icon={category.icon} color={category.color} size={16} />
                        <span>{category.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                  <Separator className="my-1" />
                  <div className="p-1">
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full justify-start text-sm"
                      onClick={(e) => {
                        e.preventDefault();
                        setSelectOpen(false);
                        setCategoryFormOpen(true);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar categoria
                    </Button>
                  </div>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Conditional Installments Field */}
      {showInstallments && form.watch('recurrence') === 'installments' && (
        <FormField
          control={form.control}
          name="installments"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número de Parcelas</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  {...field}
                  onChange={e => field.onChange(parseInt(e.target.value) || 1)}
                  placeholder="1"
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
            variant="default"
            size="sm"
            disabled={!isOnline}
            className="flex-1 sm:flex-initial min-w-20"
            onClick={onSubmit}
          >
            {submitLabel || (mode === 'create' ? t('common.create') : t('common.update'))}
          </Button>
        </div>
      </div>
      
      {!isOnline && (
        <p className="text-xs text-muted-foreground text-right mt-2">
          {t('schedule.editingRequiresConnection')}
        </p>
      )}

      <CategoryForm
        open={categoryFormOpen}
        onOpenChange={setCategoryFormOpen}
        initialData={null}
        onSave={handleAddCategory}
        categoryType={form.watch('type') === 'income' ? 'income' : 'expense'}
      />
    </div>
  );
};

export default ContaFormFields;