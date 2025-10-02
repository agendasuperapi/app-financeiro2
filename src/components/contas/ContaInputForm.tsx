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

        // Busca por ID: Primeiro tenta encontrar a conta pelo ID armazenado
        let currentId = form.getValues('conta_id');
        console.log('[ContaInputForm] Loaded contas, current conta_id:', currentId);
        
        if (!currentId) {
          // Conta padrão: Se não tiver conta_id, define a conta "Geral" como padrão
          const contaGeral = contasList.find(c => 
            c.name?.toLowerCase() === 'geral'
          );
          
          if (contaGeral) {
            console.log('[ContaInputForm] No conta_id found, setting default "Geral":', contaGeral.id);
            form.setValue('conta_id', contaGeral.id, { shouldValidate: true });
            form.setValue('conta', contaGeral.name, { shouldValidate: true });
          } else {
            console.warn('[ContaInputForm] Could not find default conta "Geral"');
          }
        } else {
          // Verifica se o conta_id existe
          const found = contasList.find(c => c.id === currentId);
          if (found) {
            console.log('[ContaInputForm] Conta found by ID:', found.name);
          } else {
            // Se conta_id for inválida, define a conta "Geral" como padrão
            console.warn('[ContaInputForm] Invalid conta_id, setting default "Geral":', currentId);
            const contaGeral = contasList.find(c => 
              c.name?.toLowerCase() === 'geral'
            );
            
            if (contaGeral) {
              form.setValue('conta_id', contaGeral.id, { shouldValidate: true });
              form.setValue('conta', contaGeral.name, { shouldValidate: true });
            }
          }
        }
      } catch (error) {
        console.error('Erro ao carregar contas:', error);
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