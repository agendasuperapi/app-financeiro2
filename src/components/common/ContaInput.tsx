import React, { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TransactionFormValues } from '@/schemas/transactionSchema';
import { usePreferences } from '@/contexts/PreferencesContext';
import { getSaldoByAccount } from '@/services/saldoService';

interface ContaInputProps {
  form: UseFormReturn<TransactionFormValues>;
}

const ContaInput: React.FC<ContaInputProps> = ({ form }) => {
  const { t } = usePreferences();
  const [contas, setContas] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [filteredContas, setFilteredContas] = useState<string[]>([]);

  useEffect(() => {
    const loadContas = async () => {
      try {
        const saldos = await getSaldoByAccount();
        const contasList = saldos.map(s => s.conta);
        setContas(contasList);
        setFilteredContas(contasList);
      } catch (error) {
        console.error('Erro ao carregar contas:', error);
      }
    };
    
    loadContas();
  }, []);

  const handleInputChange = (value: string) => {
    form.setValue('conta', value);
    
    // Filter suggestions
    const filtered = contas.filter(conta => 
      conta.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredContas(filtered);
    
    // Show suggestions if there's input and matches
    setOpen(value.length > 0 && filtered.length > 0);
  };

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
                <Input
                  {...field}
                  placeholder={t('transactions.accountPlaceholder')}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onFocus={() => {
                    if (field.value) {
                      const filtered = contas.filter(conta => 
                        conta.toLowerCase().includes(field.value.toLowerCase())
                      );
                      setFilteredContas(filtered);
                      setOpen(filtered.length > 0);
                    } else {
                      setFilteredContas(contas);
                      setOpen(contas.length > 0);
                    }
                  }}
                />
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandList>
                  <CommandEmpty>Nenhuma conta encontrada.</CommandEmpty>
                  <CommandGroup>
                    {filteredContas.map((conta) => (
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

export default ContaInput;