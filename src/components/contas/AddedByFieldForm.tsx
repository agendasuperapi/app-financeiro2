import React, { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Phone, User, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePreferences } from '@/contexts/PreferencesContext';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

interface AddedByFieldFormProps {
  form: UseFormReturn<any>; // Aceita qualquer tipo de form
}

interface UserData {
  name: string;
  phone: string;
}

const AddedByFieldForm: React.FC<AddedByFieldFormProps> = ({ form }) => {
  const { t } = usePreferences();
  const [users, setUsers] = useState<UserData[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [countryCode, setCountryCode] = useState('55');
  const [countryOpen, setCountryOpen] = useState(false);

  useEffect(() => {
    const loadNames = async () => {
      try {
        setLoading(true);

        // Buscar nomes e telefones únicos da view "view_cadastros_unificados"
        const { data, error } = await (supabase as any)
          .from('poupeja_transactions')
          .select('name')
          .not('name', 'is', null);

        if (error) throw error;

        // Extrair dados únicos e filtrar valores vazios
        const uniqueUsers = Array.from(
          new Map(
            (data as any[])
              .filter(item => item.name && item.name.trim() !== '')
              .map(item => [
                item.name,
                {
                  name: item.name,
                  phone: ''
                }
              ])
          ).values()
        ).sort((a, b) => a.name.localeCompare(b.name));

        setUsers(uniqueUsers);

        // Se há apenas uma opção, definir automaticamente
        if (uniqueUsers.length === 1 && !form.getValues('name')) {
          form.setValue('name', uniqueUsers[0].name);
          form.setValue('phone', uniqueUsers[0].phone);
        }
      } catch (error) {
        console.error('Erro ao carregar nomes da view cadastros unificados:', error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    loadNames();
  }, [form]);

  const countries = [
    { code: '55', name: 'Brasil', flag: '🇧🇷', placeholder: '(11) 99999-9999', format: (v: string) => {
      const num = v.replace(/\D/g, '');
      if (num.length <= 2) return num;
      if (num.length <= 6) return `(${num.slice(0, 2)}) ${num.slice(2)}`;
      if (num.length === 10) return `(${num.slice(0, 2)}) ${num.slice(2, 6)}-${num.slice(6, 10)}`;
      return `(${num.slice(0, 2)}) ${num.slice(2, 7)}-${num.slice(7, 11)}`;
    }},
    { code: '1', name: 'Estados Unidos', flag: '🇺🇸', placeholder: '(555) 555-5555', format: (v: string) => {
      const num = v.replace(/\D/g, '');
      if (num.length <= 3) return num;
      if (num.length <= 6) return `(${num.slice(0, 3)}) ${num.slice(3)}`;
      return `(${num.slice(0, 3)}) ${num.slice(3, 6)}-${num.slice(6, 10)}`;
    }},
    { code: '351', name: 'Portugal', flag: '🇵🇹', placeholder: '912 345 678', format: (v: string) => {
      const num = v.replace(/\D/g, '');
      if (num.length <= 3) return num;
      if (num.length <= 6) return `${num.slice(0, 3)} ${num.slice(3)}`;
      return `${num.slice(0, 3)} ${num.slice(3, 6)} ${num.slice(6, 9)}`;
    }},
    { code: '34', name: 'Espanha', flag: '🇪🇸', placeholder: '612 34 56 78', format: (v: string) => {
      const num = v.replace(/\D/g, '');
      if (num.length <= 3) return num;
      if (num.length <= 5) return `${num.slice(0, 3)} ${num.slice(3)}`;
      if (num.length <= 7) return `${num.slice(0, 3)} ${num.slice(3, 5)} ${num.slice(5)}`;
      return `${num.slice(0, 3)} ${num.slice(3, 5)} ${num.slice(5, 7)} ${num.slice(7, 9)}`;
    }},
    { code: '44', name: 'Reino Unido', flag: '🇬🇧', placeholder: '7400 123456', format: (v: string) => {
      const num = v.replace(/\D/g, '');
      if (num.length <= 4) return num;
      return `${num.slice(0, 4)} ${num.slice(4, 10)}`;
    }},
    { code: '49', name: 'Alemanha', flag: '🇩🇪', placeholder: '151 12345678', format: (v: string) => {
      const num = v.replace(/\D/g, '');
      if (num.length <= 3) return num;
      return `${num.slice(0, 3)} ${num.slice(3, 11)}`;
    }},
    { code: '33', name: 'França', flag: '🇫🇷', placeholder: '6 12 34 56 78', format: (v: string) => {
      const num = v.replace(/\D/g, '');
      if (num.length <= 1) return num;
      if (num.length <= 3) return `${num.slice(0, 1)} ${num.slice(1)}`;
      if (num.length <= 5) return `${num.slice(0, 1)} ${num.slice(1, 3)} ${num.slice(3)}`;
      if (num.length <= 7) return `${num.slice(0, 1)} ${num.slice(1, 3)} ${num.slice(3, 5)} ${num.slice(5)}`;
      return `${num.slice(0, 1)} ${num.slice(1, 3)} ${num.slice(3, 5)} ${num.slice(5, 7)} ${num.slice(7, 9)}`;
    }},
    { code: '39', name: 'Itália', flag: '🇮🇹', placeholder: '312 345 6789', format: (v: string) => {
      const num = v.replace(/\D/g, '');
      if (num.length <= 3) return num;
      if (num.length <= 6) return `${num.slice(0, 3)} ${num.slice(3)}`;
      return `${num.slice(0, 3)} ${num.slice(3, 6)} ${num.slice(6, 10)}`;
    }},
    { code: '81', name: 'Japão', flag: '🇯🇵', placeholder: '90-1234-5678', format: (v: string) => {
      const num = v.replace(/\D/g, '');
      if (num.length <= 2) return num;
      if (num.length <= 6) return `${num.slice(0, 2)}-${num.slice(2)}`;
      return `${num.slice(0, 2)}-${num.slice(2, 6)}-${num.slice(6, 10)}`;
    }},
    { code: '86', name: 'China', flag: '🇨🇳', placeholder: '138 0013 8000', format: (v: string) => {
      const num = v.replace(/\D/g, '');
      if (num.length <= 3) return num;
      if (num.length <= 7) return `${num.slice(0, 3)} ${num.slice(3)}`;
      return `${num.slice(0, 3)} ${num.slice(3, 7)} ${num.slice(7, 11)}`;
    }},
  ];

  const formatPhone = (value: string) => {
    const country = countries.find(c => c.code === countryCode);
    return country ? country.format(value) : value.replace(/\D/g, '');
  };

  const getPlaceholder = () => {
    const country = countries.find(c => c.code === countryCode);
    return country?.placeholder || 'Número de telefone';
  };

  const handleAddUser = async () => {
    if (!newName.trim()) return;

    try {
      const { error } = await (supabase as any)
        .from('poupeja_transactions')
        .insert({
          name: newName.trim(),
          amount: 0,
          description: 'Nome adicionado automaticamente',
          category: 'Outros',
          type: 'expense',
          conta: 'Sistema'
        });

      if (error) throw error;

      // Adicionar à lista local
      const fullPhone = newPhone.trim() ? `${countryCode}${newPhone.trim()}` : '';
      const newUser = { name: newName.trim(), phone: fullPhone };
      setUsers([...users, newUser].sort((a, b) => a.name.localeCompare(b.name)));
      
      // Definir no formulário
      form.setValue('name', newUser.name);
      form.setValue('phone', newUser.phone);
      
      // Limpar e fechar
      setNewName('');
      setNewPhone('');
      setCountryCode('55');
      setDialogOpen(false);
    } catch (error) {
      console.error('Erro ao adicionar nome:', error);
    }
  };

  return (
    <>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Usuario</FormLabel>
            <Select
              open={open}
              onOpenChange={setOpen}
              value={field.value}
              onValueChange={(value) => {
                if (value === '__add__') {
                  setOpen(false);
                  setDialogOpen(true);
                  return;
                }
                field.onChange(value);
                const selectedUser = users.find((u) => u.name === value);
                if (selectedUser) {
                  form.setValue('phone', selectedUser.phone);
                }
              }}
              disabled={loading}
            >
              <FormControl>
                <SelectTrigger className="justify-between">
                  {field.value || "Quem Adicionou"}
                </SelectTrigger>
              </FormControl>
              <SelectContent className="max-h-64">
                {users.map((user) => (
                  <SelectItem key={user.name} value={user.name}>
                    {user.name}
                  </SelectItem>
                ))}
                <SelectSeparator />
                <SelectItem value="__add__">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Adicionar
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Novo Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  id="name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Digite o nome completo"
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="phone">Telefone (opcional)</Label>
              <div className="flex gap-2">
                <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={countryOpen}
                      className="w-48 justify-between"
                    >
                      {countries.find(c => c.code === countryCode)?.name} (+{countryCode})
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-0 z-50 border bg-popover text-popover-foreground shadow-md">
                    <Command>
                      <CommandInput placeholder="Buscar país..." />
                      <CommandList className="max-h-64 overflow-y-auto">
                        <CommandEmpty>Nenhum país encontrado.</CommandEmpty>
                        <CommandGroup>
                          {countries.map((country) => (
                            <CommandItem
                              key={country.code}
                              value={country.name}
                              onSelect={() => {
                                setCountryCode(country.code);
                                setCountryOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  countryCode === country.code ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {country.name} (+{country.code})
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="phone"
                    value={formatPhone(newPhone)}
                    onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder={getPlaceholder()}
                    className="pl-10"
                    type="tel"
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Digite o número com DDD (será formatado automaticamente)
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialogOpen(false);
                  setNewName('');
                  setNewPhone('');
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleAddUser}
                disabled={!newName.trim()}
              >
                Adicionar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AddedByFieldForm;