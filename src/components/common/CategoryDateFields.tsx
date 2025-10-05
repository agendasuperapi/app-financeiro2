
import React, { useMemo, useEffect } from 'react';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UseFormReturn } from 'react-hook-form';
import { TransactionFormValues } from '@/schemas/transactionSchema';
import { usePreferences } from '@/contexts/PreferencesContext';
import { getCategoriesByType, addCategory } from '@/services/categoryService';
import CategoryIcon from '@/components/categories/CategoryIcon';
import CategoryForm from '@/components/categories/CategoryForm';
import { Category } from '@/types/categories';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

interface CategoryDateFieldsProps {
  form: UseFormReturn<TransactionFormValues>;
  transactionType: 'income' | 'expense' | 'reminder' | 'lembrete' | 'outros';
}

const CategoryDateFields: React.FC<CategoryDateFieldsProps> = ({ form, transactionType }) => {
  const { t } = usePreferences();
  const { toast } = useToast();
  
  // Use state for categories since we need to load them asynchronously
  const [categories, setCategories] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [key, setKey] = React.useState(Date.now()); // Add a key to force re-render
  const [categoryFormOpen, setCategoryFormOpen] = React.useState(false);
  const [selectOpen, setSelectOpen] = React.useState(false);

  // Load categories from Supabase
  const loadCategories = async () => {
    setLoading(true);
    try {
      const filteredCategories = await getCategoriesByType(transactionType);
      setCategories(filteredCategories);
      
      console.log('[CategoryDateFields] Loaded categories:', filteredCategories.length);
      console.log('[CategoryDateFields] Current category value:', form.getValues('category'));
      
      // Mapear valor atual (id ou nome) para ID válido
      const currentCategory = form.getValues('category');
      if (currentCategory) {
        const byId = filteredCategories.find(c => c.id === currentCategory);
        if (byId) {
          console.log('[CategoryDateFields] Category found by ID:', byId.name);
        } else {
          const byName = filteredCategories.find(c => c.name === currentCategory);
          if (byName) {
            console.log('[CategoryDateFields] Category found by name, mapping to ID:', byName.id);
            form.setValue('category', byName.id, { shouldValidate: true, shouldDirty: false });
          } else {
            console.warn('[CategoryDateFields] Category not found:', currentCategory);
          }
        }
      }
      
      // Set default category if none selected or inválida
      const currentAfterMap = form.getValues('category');
      const exists = filteredCategories.some(c => c.id === currentAfterMap);
      if (!exists && filteredCategories.length > 0) {
        console.log('[CategoryDateFields] Setting default category:', filteredCategories[0].id);
        form.setValue('category', filteredCategories[0].id);
      }
      
      // Force re-render after categories are loaded
      setKey(Date.now());
    } catch (error) {
      console.error("Error loading categories:", error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadCategories();
  }, [transactionType, form]);

  const handleAddCategory = () => {
    setSelectOpen(false);
    setCategoryFormOpen(true);
  };

  const handleSaveCategory = async (category: Omit<Category, 'id'> | Category) => {
    try {
      // Ensure the category type matches the current transaction type
      const categoryType = transactionType === 'income' ? 'income' : 'expense';
      
      const newCategory = await addCategory({
        ...category,
        type: categoryType
      } as Omit<Category, 'id'>);
      
      if (newCategory) {
        toast({
          title: "Categoria adicionada",
          description: `A categoria ${category.name} foi adicionada com sucesso.`,
        });
        
        // Reload categories
        await loadCategories();
        
        // Select the new category
        form.setValue('category', newCategory.id);
        
        setCategoryFormOpen(false);
      }
    } catch (error) {
      console.error('Error saving category:', error);
      toast({
        title: t('common.error'),
        description: t('common.somethingWentWrong'),
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem key={`category-${key}-${transactionType}`}>
              <FormLabel>{t('transactions.category')}</FormLabel>
              <Select 
                open={selectOpen}
                onOpenChange={setSelectOpen}
                onValueChange={(value) => {
                  field.onChange(value);
                }}
                value={field.value}
                defaultValue={field.value}
                disabled={loading}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={loading ? "Carregando..." : t('transactions.selectCategory')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent 
                  position="popper" 
                  className="w-full max-h-[200px] overflow-y-auto z-[9999]" 
                  sideOffset={5}
                  align="start"
                  avoidCollisions={true}
                >
                  {categories.map((category) => {
                    const categoryId = category.id;
                    return (
                      <SelectItem 
                        key={categoryId} 
                        value={categoryId} 
                        className="flex items-center gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <CategoryIcon icon={category.icon} color={category.color} size={16} />
                          <span>{category.name}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                  <Separator className="my-1" />
                  <div className="p-1">
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full justify-start text-sm"
                      onClick={(e) => {
                        e.preventDefault();
                        handleAddCategory();
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
      </div>

      <CategoryForm
        open={categoryFormOpen}
        onOpenChange={setCategoryFormOpen}
        initialData={null}
        onSave={handleSaveCategory}
        categoryType={transactionType === 'income' ? 'income' : 'expense'}
      />
    </>
  );
};

export default CategoryDateFields;
