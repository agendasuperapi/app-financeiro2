
import React, { useMemo, useEffect } from 'react';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UseFormReturn } from 'react-hook-form';
import { TransactionFormValues } from '@/schemas/transactionSchema';
import { usePreferences } from '@/contexts/PreferencesContext';
import { getCategoriesByType } from '@/services/categoryService';
import { getDependentUsers, checkIfUserIsDependent, DependentUser } from '@/services/dependentViewService';
import CategoryIcon from '@/components/categories/CategoryIcon';
import { supabase } from '@/integrations/supabase/client';

interface CategoryDateFieldsProps {
  form: UseFormReturn<TransactionFormValues>;
  transactionType: 'income' | 'expense' | 'reminder' | 'lembrete' | 'outros';
}

const CategoryDateFields: React.FC<CategoryDateFieldsProps> = ({ form, transactionType }) => {
  const { t } = usePreferences();
  
  console.log("CategoryDateFields rendering with transactionType:", transactionType);
  
  // Use state for categories since we need to load them asynchronously
  const [categories, setCategories] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [key, setKey] = React.useState(Date.now()); // Add a key to force re-render
  const [dependentUsers, setDependentUsers] = React.useState<DependentUser[]>([]);
  const [isDependent, setIsDependent] = React.useState(false);
  const [checkingDependent, setCheckingDependent] = React.useState(true);

  // Load categories and check if user is dependent
  React.useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setCheckingDependent(true);
      
      try {
        // Load categories
        const filteredCategories = await getCategoriesByType(transactionType);
        console.log("Loaded categories from Supabase for", transactionType, ":", filteredCategories);
        setCategories(filteredCategories);
        
        // Set default category if none selected
        if (filteredCategories.length > 0) {
          const currentCategory = form.getValues('category');
          const categoryExists = filteredCategories.some(c => c.id === currentCategory || c.name === currentCategory);
          
          if (!categoryExists) {
            console.log("Setting default category to:", filteredCategories[0].id);
            form.setValue('category', filteredCategories[0].id);
          }
        }

        // Check if current user is dependent
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const isDep = await checkIfUserIsDependent(user.id);
          setIsDependent(isDep);
          
          if (isDep) {
            // Load dependent users for selection
            const users = await getDependentUsers();
            setDependentUsers(users);
          }
        }
        
        // Force re-render after data is loaded
        setKey(Date.now());
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
        setCheckingDependent(false);
      }
    };

    loadData();
  }, [transactionType, form]);

  const handleDependentChange = (selectedName: string) => {
    const selectedUser = dependentUsers.find(user => user.name === selectedName);
    if (selectedUser) {
      form.setValue('dependentName', selectedUser.name);
      form.setValue('phone', selectedUser.phone);
    }
  };

  return (
    <div className="space-y-4">
      {/* Reference Field */}
      <FormField
        control={form.control}
        name="referencia"
        render={({ field }) => {
          console.log("Referencia field rendering:", field);
          return (
            <FormItem>
              <FormLabel>Referência</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Ex: Boleto, PIX, Cartão..." 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          );
        }}
      />

      {/* Dependent Selection Field - only show if user is dependent */}
      {isDependent && (
        <FormField
          control={form.control}
          name="dependentName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Selecionar Pessoa</FormLabel>
              <Select 
                onValueChange={handleDependentChange}
                value={field.value}
                disabled={checkingDependent || dependentUsers.length === 0}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={checkingDependent ? "Carregando..." : "Selecione uma pessoa"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {dependentUsers.map((user) => (
                    <SelectItem key={user.phone} value={user.name}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Category and Date Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem key={`category-${key}-${transactionType}`}>
              <FormLabel>{t('transactions.category')}</FormLabel>
              <Select 
                onValueChange={(value) => {
                  console.log("Category selected:", value);
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
                  className="w-full max-h-[300px] overflow-y-auto" 
                  sideOffset={5}
                  align="center"
                  avoidCollisions={false}
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
    </div>
  );
};

export default CategoryDateFields;
