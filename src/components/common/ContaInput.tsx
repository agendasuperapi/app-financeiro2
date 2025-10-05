import React, { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TransactionFormValues } from '@/schemas/transactionSchema';
import { usePreferences } from '@/contexts/PreferencesContext';
import { getContas, Conta, addConta } from '@/services/contasService';
import { Separator } from '@/components/ui/separator';
import ContaForm from '@/components/profile/ContaForm';
import { toast } from 'sonner';

interface ContaInputProps {
  form: UseFormReturn<TransactionFormValues>;
}

const ContaInput: React.FC<ContaInputProps> = ({ form }) => {
  const { t } = usePreferences();
  const [contas, setContas] = useState<Conta[]>([]);
  const [open, setOpen] = useState(false);
  const [contaFormOpen, setContaFormOpen] = useState(false);

  useEffect(() => {
    loadContas();
  }, []);

  const loadContas = async () => {
    try {
      const contasList = await getContas();
      setContas(contasList);
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
    }
  };

  const handleSaveConta = async (contaData: Omit<Conta, 'id' | 'user_id'> | Conta) => {
    try {
      const newConta = await addConta(contaData as Omit<Conta, 'id' | 'user_id'>);
      if (newConta) {
        toast.success('Conta adicionada com sucesso!');
        await loadContas();
        form.setValue('conta_id', newConta.id);
        setContaFormOpen(false);
      }
    } catch (error) {
      console.error('Erro ao adicionar conta:', error);
      toast.error('Erro ao adicionar conta');
    }
  };

  return (
    <>
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
                    {field.value ? contas.find(c => c.id === field.value)?.name : t('transactions.accountPlaceholder')}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0 bg-background z-[9999]">
                <Command>
                  <CommandList>
                    <CommandEmpty>Nenhuma conta encontrada.</CommandEmpty>
                    <CommandGroup>
                      {contas.map((conta) => (
                        <CommandItem
                          key={conta.id}
                          value={conta.name}
                          onSelect={() => {
                            field.onChange(conta.id);
                            setOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              field.value === conta.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {conta.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    <Separator className="my-1" />
                    <div className="p-1">
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full justify-start text-sm"
                        onClick={(e) => {
                          e.preventDefault();
                          setOpen(false);
                          setContaFormOpen(true);
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Adicionar conta
                      </Button>
                    </div>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <ContaForm
        open={contaFormOpen}
        onOpenChange={setContaFormOpen}
        initialData={null}
        onSave={handleSaveConta}
      />
    </>
  );
};

export default ContaInput;