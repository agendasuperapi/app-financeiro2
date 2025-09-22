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

interface ContaInputFormProps {
  form: UseFormReturn<any>; // Aceita qualquer tipo de form
}

const ContaInputForm: React.FC<ContaInputFormProps> = ({ form }) => {
  const { t } = usePreferences();
  const [contas, setContas] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const loadContas = async () => {
      try {
        const saldos = await getSaldoByAccount();
        setContas(saldos.map(s => s.conta));
      } catch (error) {
        console.error('Erro ao carregar contas:', error);
      }
    };
    
    loadContas();
  }, []);

  return (
    <FormField
      control={form.control}
      name="conta"
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel>{t('transactions.account')}</FormLabel>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="justify-between"
                >
                  {field.value || "Escolha a Conta"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
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
                          setOpen(false);
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
  );
};

export default ContaInputForm;