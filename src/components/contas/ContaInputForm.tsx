import React, { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePreferences } from '@/contexts/PreferencesContext';
import { getContas, Conta } from '@/services/contasService';
import CategoryIcon from '@/components/categories/CategoryIcon';

interface ContaInputFormProps {
  form: UseFormReturn<any>; // Aceita qualquer tipo de form
}

const ContaInputForm: React.FC<ContaInputFormProps> = ({ form }) => {
  const { t } = usePreferences();
  const [contas, setContas] = useState<Conta[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const loadContas = async () => {
      try {
        const contasList = await getContas();
        setContas(contasList);

        const formValues = form.getValues();
        const currentContaId = formValues.conta_id;
        
        console.log('[DEBUG ContaInputForm] Full form values:', formValues);
        console.log('[DEBUG ContaInputForm] conta_id from form:', currentContaId);
        console.log('[DEBUG ContaInputForm] Available contas:', contasList.map(c => ({ id: c.id, name: c.name })));

        if (currentContaId) {
          const foundConta = contasList.find(c => c.id === currentContaId);
          console.log('[DEBUG ContaInputForm] Found conta:', foundConta);
          if (foundConta) {
            form.setValue('conta', foundConta.name, { shouldValidate: true });
          } else {
            form.setValue('conta', '', { shouldValidate: true });
            form.setValue('conta_id', '', { shouldValidate: true });
          }
        } else {
          console.log('[DEBUG ContaInputForm] No conta_id in form');
        }
      } catch (error) {
        console.error('[DEBUG ContaInputForm] Error:', error);
      }
    };

    loadContas();
  }, [form]);

  return (
    <FormField
      control={form.control}
      name="conta_id"
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
                  {field.value ? (
                    <div className="flex items-center gap-2">
                      <CategoryIcon 
                        icon={contas.find(c => c.id === field.value)?.icon || 'wallet'} 
                        color={contas.find(c => c.id === field.value)?.color || '#808080'} 
                      />
                      <span>{contas.find(c => c.id === field.value)?.name}</span>
                    </div>
                  ) : (
                    "Escolha a Conta"
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput 
                  placeholder={t('transactions.accountPlaceholder')}
                />
                <CommandList>
                  <CommandEmpty>Nenhuma conta encontrada.</CommandEmpty>
                  <CommandGroup>
                    {contas.map((conta) => (
                      <CommandItem
                        key={conta.id}
                        value={conta.name}
                        onSelect={() => {
                          field.onChange(conta.id);
                          form.setValue('conta', conta.name, { shouldValidate: true });
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            field.value === conta.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <CategoryIcon icon={conta.icon} color={conta.color} />
                        <span className="ml-2">{conta.name}</span>
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