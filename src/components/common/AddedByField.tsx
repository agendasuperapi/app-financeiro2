import React, { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TransactionFormValues } from '@/schemas/transactionSchema';
import { usePreferences } from '@/contexts/PreferencesContext';
import { supabase } from '@/integrations/supabase/client';

interface AddedByFieldProps {
  form: UseFormReturn<TransactionFormValues>;
}

const AddedByField: React.FC<AddedByFieldProps> = ({ form }) => {
  const { t } = usePreferences();
  const [users, setUsers] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadNames = async () => {
      try {
        setLoading(true);
        
        // Buscar nomes únicos da coluna "name" da tabela poupeja_transactions
        const { data, error } = await supabase
          .from('poupeja_transactions')
          .select('name')
          .not('name', 'is', null);

        if (error) throw error;

        // Extrair nomes únicos e filtrar valores vazios
        const uniqueNames = Array.from(new Set(
          (data as any[])
            .map(item => item.name)
            .filter(name => name && name.trim() !== '')
        )).sort();

        // Se não há nomes, buscar o primeiro_name do usuário atual e adicionar
        if (uniqueNames.length === 0) {
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user) {
            // Buscar primeiro_name da view_cadastros_unificados
            const { data: userData, error: userError } = await (supabase as any)
              .from('view_cadastros_unificados')
              .select('primeiro_name')
              .eq('id', user.id)
              .single();

            if (!userError && userData?.primeiro_name) {
              // Inserir o primeiro_name na tabela poupeja_transactions
              const { error: insertError } = await supabase
                .from('poupeja_transactions')
                .insert([{
                  name: userData.primeiro_name,
                  user_id: user.id,
                  amount: 0,
                  type: 'expense',
                  category: 'd6c7432e-2b7a-4937-95db-4ce2df58d40f', // Categoria "Outros"
                  conta: 'sistema',
                  description: 'Registro inicial do usuário',
                  date: new Date().toISOString().split('T')[0]
                }]);

              if (!insertError) {
                // Recarregar nomes após inserção
                const { data: newData } = await supabase
                  .from('poupeja_transactions')
                  .select('name')
                  .not('name', 'is', null);

                if (newData) {
                  const newUniqueNames = Array.from(new Set(
                    newData.map((item: any) => item.name)
                      .filter(name => name && name.trim() !== '')
                  )).sort();
                  setUsers(newUniqueNames);
                  return;
                }
              }
            }
          }
        }

        setUsers(uniqueNames);
      } catch (error) {
        console.error('Erro ao carregar nomes das transações:', error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadNames();
  }, []);

  return (
    <FormField
      control={form.control}
      name="name"
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel>Adicionado por</FormLabel>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="justify-between"
                  disabled={loading}
                >
                  {field.value || "Selecione quem adicionou..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0 z-50 border bg-popover text-popover-foreground shadow-md">
              <Command>
                <CommandInput 
                  placeholder="Buscar nome..."
                />
                <CommandList>
                  <CommandEmpty>
                    {loading ? "Carregando nomes..." : "Nenhum nome encontrado."}
                  </CommandEmpty>
                  <CommandGroup>
                    {users.map((name) => (
                      <CommandItem
                        key={name}
                        value={name}
                        onSelect={(currentValue) => {
                          field.onChange(currentValue);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            field.value === name ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default AddedByField;