import React, { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePreferences } from '@/contexts/PreferencesContext';
import { getContas, Conta, addConta } from '@/services/contasService';
import CategoryIcon from '@/components/categories/CategoryIcon';
import ContaForm from '@/components/profile/ContaForm';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

interface ContaInputFormProps {
  form: UseFormReturn<any>; // Aceita qualquer tipo de form
}

const ContaInputForm: React.FC<ContaInputFormProps> = ({ form }) => {
  const { t } = usePreferences();
  const { toast } = useToast();
  const [contas, setContas] = useState<Conta[]>([]);
  const [open, setOpen] = useState(false);
  const [contaFormOpen, setContaFormOpen] = useState(false);

  const loadContas = async () => {
    try {
      const contasList = await getContas();
      setContas(contasList);

      const currentContaId = form.getValues('conta_id');

      if (currentContaId) {
        const foundConta = contasList.find(c => c.id === currentContaId);
        if (foundConta) {
          form.setValue('conta', foundConta.name, { shouldValidate: true });
        } else {
          form.setValue('conta', '', { shouldValidate: true });
          form.setValue('conta_id', '', { shouldValidate: true });
        }
      }
    } catch (error) {
      // ignorar silenciosamente
    }
  };

  useEffect(() => {
    loadContas();
  }, [form]);

  const handleAddConta = () => {
    setOpen(false);
    setContaFormOpen(true);
  };

  const handleSaveConta = async (conta: Omit<Conta, 'id' | 'user_id'> | Conta) => {
    try {
      const newConta = await addConta(conta as Omit<Conta, 'id' | 'user_id'>);
      
      if (newConta) {
        toast({
          title: "Sucesso",
          description: "Conta adicionada com sucesso",
        });
        
        await loadContas();
        form.setValue('conta_id', newConta.id);
        form.setValue('conta', newConta.name);
      }
      
      setContaFormOpen(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao adicionar conta",
        variant: "destructive",
      });
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
                    <Separator className="my-1" />
                    <div className="p-1">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        className="w-full justify-start text-sm" 
                        onClick={handleAddConta}
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

export default ContaInputForm;