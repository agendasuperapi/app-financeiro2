import React, { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from '@/components/ui/select';


import { Plus } from 'lucide-react';

import { usePreferences } from '@/contexts/PreferencesContext';
import { getContas, Conta, addConta } from '@/services/contasService';
import CategoryIcon from '@/components/categories/CategoryIcon';
import ContaForm from '@/components/profile/ContaForm';
import { useToast } from '@/hooks/use-toast';


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
            <Select
              open={open}
              onOpenChange={setOpen}
              value={field.value}
              onValueChange={(value) => {
                if (value === '__add__') {
                  setOpen(false);
                  handleAddConta();
                  return;
                }
                field.onChange(value);
                const selected = contas.find((c) => c.id === value);
                form.setValue('conta', selected?.name ?? '', { shouldValidate: true });
              }}
            >
              <FormControl>
                <SelectTrigger className="justify-between">
                  {field.value ? (
                    <div className="flex items-center gap-2">
                      <CategoryIcon
                        icon={contas.find((c) => c.id === field.value)?.icon || 'wallet'}
                        color={contas.find((c) => c.id === field.value)?.color || '#808080'}
                      />
                      <span>{contas.find((c) => c.id === field.value)?.name}</span>
                    </div>
                  ) : (
                    <SelectValue placeholder="Escolha a Conta" />
                  )}
                </SelectTrigger>
              </FormControl>
              <SelectContent className="max-h-64">
                {contas.map((conta) => (
                  <SelectItem key={conta.id} value={conta.id}>
                    <div className="flex items-center gap-2">
                      <CategoryIcon icon={conta.icon} color={conta.color} />
                      <span>{conta.name}</span>
                    </div>
                  </SelectItem>
                ))}
                <SelectSeparator />
                <SelectItem value="__add__">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Adicionar conta
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
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