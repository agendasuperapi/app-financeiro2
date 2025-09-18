import React, { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
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

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpen(false);
    
    if (open) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [open]);

  const handleInputChange = (value: string, onChange: (value: string) => void) => {
    onChange(value);
    
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
        <FormItem className="flex flex-col relative">
          <FormLabel>{t('transactions.account')}</FormLabel>
          <FormControl>
            <Input
              {...field}
              placeholder={t('transactions.accountPlaceholder')}
              onChange={(e) => handleInputChange(e.target.value, field.onChange)}
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
          {open && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border bg-popover p-0 text-popover-foreground shadow-md outline-none">
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
            </div>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default ContaInput;