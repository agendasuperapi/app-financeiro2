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
import { UserManagementService } from '@/services/api_service';

interface AddedByFieldProps {
  form: UseFormReturn<TransactionFormValues>;
}

const AddedByField: React.FC<AddedByFieldProps> = ({ form }) => {
  const { t } = usePreferences();
  const [users, setUsers] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        const userData = await UserManagementService.getAllUsersWithSubscriptions();
        const userNames = userData
          .filter(user => user.name) // Only users with names
          .map(user => user.name as string) // TypeScript assertion since we filtered nulls
          .sort(); // Sort alphabetically
        setUsers(userNames);
      } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadUsers();
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
                  placeholder="Buscar usuário..."
                  value={field.value || ''}
                  onValueChange={(value) => {
                    field.onChange(value);
                  }}
                />
                <CommandList>
                  <CommandEmpty>
                    {loading ? "Carregando usuários..." : "Nenhum usuário encontrado."}
                  </CommandEmpty>
                  <CommandGroup>
                    {users.map((userName) => (
                      <CommandItem
                        key={userName}
                        value={userName}
                        onSelect={(currentValue) => {
                          field.onChange(currentValue);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            field.value === userName ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {userName}
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