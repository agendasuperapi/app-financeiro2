import React, { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePreferences } from '@/contexts/PreferencesContext';
import { getSaldoByAccount } from '@/services/saldoService';
import { supabase } from '@/integrations/supabase/client';

interface ContaInputFormProps {
  form: UseFormReturn<any>; // Aceita qualquer tipo de form
}

const ContaInputForm: React.FC<ContaInputFormProps> = ({ form }) => {
  const { t } = usePreferences();
  const [contas, setContas] = useState<string[]>([]);
  const [names, setNames] = useState<string[]>([]);
  const [openConta, setOpenConta] = useState(false);
  const [openName, setOpenName] = useState(false);

  useEffect(() => {
    const loadContas = async () => {
      try {
        const saldos = await getSaldoByAccount();
        setContas(saldos.map(s => s.conta));
      } catch (error) {
        console.error('Erro ao carregar contas:', error);
      }
    };

    const loadNames = async () => {
      try {
        // Load names from auth users and scheduled transactions
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
        const { data: userData, error: userError } = await supabase
          .from('poupeja_users')
          .select('name')
          .not('name', 'is', null)
          .not('name', 'eq', '');

        if (userError) throw userError;

        // Combine names from both sources and remove duplicates
        const authNames = authUsers?.users?.map(user => user.email?.split('@')[0] || user.email || '').filter(name => name) || [];
        const dbNames = userData?.map(user => user.name).filter(name => name && name.trim() !== '') || [];
        const allNames = [...new Set([...authNames, ...dbNames])].filter(name => name);
        
        setNames(allNames);
      } catch (error) {
        console.error('Erro ao carregar nomes:', error);
        // Fallback: set some default names
        setNames(['Admin', 'Usuário', 'Família']);
      }
    };
    
    loadContas();
    loadNames();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Conta Field */}
      <FormField
        control={form.control}
        name="conta"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>{t('transactions.account')}</FormLabel>
            <Popover open={openConta} onOpenChange={setOpenConta}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openConta}
                    className="justify-between"
                  >
                    {field.value || "Escolha a Conta"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0 bg-background border z-50">
                <Command>
                  <CommandInput 
                    placeholder={t('transactions.accountPlaceholder')}
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                    }}
                  />
                  <CommandList>
                    <CommandEmpty>Nenhuma conta encontrada.</CommandEmpty>
                    <CommandGroup>
                      {contas.map((conta) => (
                        <CommandItem
                          key={conta}
                          value={conta}
                          onSelect={(currentValue) => {
                            field.onChange(currentValue);
                            setOpenConta(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              field.value === conta ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {conta}
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

      {/* Name Field */}
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Usuário</FormLabel>
            <Popover open={openName} onOpenChange={setOpenName}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openName}
                    className="justify-between"
                  >
                    {field.value || "Escolha o Usuário"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0 bg-background border z-50">
                <Command>
                  <CommandInput 
                    placeholder="Buscar usuário..."
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                    }}
                  />
                  <CommandList>
                    <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
                    <CommandGroup>
                      {names.map((name) => (
                        <CommandItem
                          key={name}
                          value={name}
                          onSelect={(currentValue) => {
                            field.onChange(currentValue);
                            setOpenName(false);
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
    </div>
  );
};

export default ContaInputForm;