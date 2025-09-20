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

interface UserData {
  name: string;
  phone: string;
}

const AddedByField: React.FC<AddedByFieldProps> = ({ form }) => {
  const { t } = usePreferences();
  const [users, setUsers] = useState<UserData[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadNames = async () => {
      try {
        setLoading(true);
        
        // Buscar nomes e telefones únicos da view "view_cadastros_unificados"
        const { data, error } = await (supabase as any)
          .from('view_cadastros_unificados')
          .select('id, primeiro_name, phone')
          .not('primeiro_name', 'is', null);

        if (error) throw error;

        // Extrair dados únicos e filtrar valores vazios
        const uniqueUsers = Array.from(
          new Map(
            (data as any[])
              .filter(item => item.primeiro_name && item.primeiro_name.trim() !== '')
              .map(item => [
                item.primeiro_name, 
                { name: item.primeiro_name, phone: item.phone || '' }
              ])
          ).values()
        ).sort((a, b) => a.name.localeCompare(b.name));

        setUsers(uniqueUsers);
        
        // Se há apenas uma opção, definir automaticamente
        if (uniqueUsers.length === 1 && !form.getValues('name')) {
          form.setValue('name', uniqueUsers[0].name);
          form.setValue('phone', uniqueUsers[0].phone);
        }
      } catch (error) {
        console.error('Erro ao carregar nomes da view cadastros unificados:', error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadNames();
  }, [form]);

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
                    {users.map((user) => (
                      <CommandItem
                        key={user.name}
                        value={user.name}
                        onSelect={(currentValue) => {
                          const selectedUser = users.find(u => u.name === currentValue);
                          field.onChange(currentValue);
                          if (selectedUser) {
                            form.setValue('phone', selectedUser.phone);
                          }
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            field.value === user.name ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {user.name}
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