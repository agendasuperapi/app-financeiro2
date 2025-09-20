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
        
        // Buscar nomes da tabela de usuários 
        // (quando a coluna "name" for adicionada à poupeja_transactions, poderemos buscar de lá também)
        const { data: userData, error: userError } = await supabase
          .from('poupeja_users')
          .select('name')
          .not('name', 'is', null);

        if (!userError && userData) {
          const uniqueNames = Array.from(new Set(
            userData
              .map(user => user.name)
              .filter(name => name && name.trim() !== '')
          )).sort();
          setUsers(uniqueNames);
        }
      } catch (error) {
        console.error('Erro ao carregar nomes:', error);
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
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput 
                  placeholder="Buscar nome..."
                  value={field.value || ''}
                  onValueChange={(value) => {
                    field.onChange(value);
                  }}
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