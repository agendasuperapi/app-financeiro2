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

        // Obter user_id autenticado
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');

        console.log('🔍 User ID autenticado:', user.id);

        // Buscar nomes e telefones únicos da view "view_cadastros_unificados"
        const { data, error } = await (supabase as any)
          .from('view_cadastros_unificados')
          .select('primeiro_name, phone, id, tipo')
          .eq('id', user.id);

        console.log('📊 Dados retornados da view:', data);
        console.log('❌ Erro da query:', error);

        if (error) throw error;

        // Extrair dados únicos e filtrar valores vazios
        const uniqueUsers = Array.from(
          new Map(
            (data as any[])
              .filter(item => item.primeiro_name && item.primeiro_name.trim() !== '')
              .map(item => [
                item.primeiro_name,
                {
                  name: item.primeiro_name,
                  phone: item.phone || ''
                }
              ])
          ).values()
        ).sort((a, b) => a.name.localeCompare(b.name));

        console.log('✅ Usuários únicos processados:', uniqueUsers);
        setUsers(uniqueUsers);

        // Se há apenas uma opção, definir automaticamente
        if (uniqueUsers.length === 1 && !form.getValues('name')) {
          form.setValue('name', uniqueUsers[0].name);
          form.setValue('phone', uniqueUsers[0].phone);
        }
      } catch (error) {
        console.error('❌ Erro ao carregar nomes da view cadastros unificados:', error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    loadNames();
  }, [form]);

  const countries = [
    // América do Sul
    { code: '54', name: 'Argentina', flag: '🇦🇷', placeholder: '11 1234-5678', format: (v: string) => v.replace(/\D/g, '') },
    { code: '591', name: 'Bolívia', flag: '🇧🇴', placeholder: '71234567', format: (v: string) => v.replace(/\D/g, '') },
    { code: '55', name: 'Brasil', flag: '🇧🇷', placeholder: '(11) 99999-9999', format: (v: string) => {
      const num = v.replace(/\D/g, '');
      if (num.length <= 2) return num;
      if (num.length <= 6) return `(${num.slice(0, 2)}) ${num.slice(2)}`;
      if (num.length === 10) return `(${num.slice(0, 2)}) ${num.slice(2, 6)}-${num.slice(6, 10)}`;
      return `(${num.slice(0, 2)}) ${num.slice(2, 7)}-${num.slice(7, 11)}`;
    }},
    { code: '56', name: 'Chile', flag: '🇨🇱', placeholder: '9 1234 5678', format: (v: string) => v.replace(/\D/g, '') },
    { code: '57', name: 'Colômbia', flag: '🇨🇴', placeholder: '321 1234567', format: (v: string) => v.replace(/\D/g, '') },
    { code: '593', name: 'Equador', flag: '🇪🇨', placeholder: '99 123 4567', format: (v: string) => v.replace(/\D/g, '') },
    { code: '595', name: 'Paraguai', flag: '🇵🇾', placeholder: '961 123456', format: (v: string) => v.replace(/\D/g, '') },
    { code: '51', name: 'Peru', flag: '🇵🇪', placeholder: '912 345 678', format: (v: string) => v.replace(/\D/g, '') },
    { code: '598', name: 'Uruguai', flag: '🇺🇾', placeholder: '94 123 456', format: (v: string) => v.replace(/\D/g, '') },
    { code: '58', name: 'Venezuela', flag: '🇻🇪', placeholder: '412 1234567', format: (v: string) => v.replace(/\D/g, '') },
    
    // América Central e Caribe
    { code: '52', name: 'México', flag: '🇲🇽', placeholder: '222 123 4567', format: (v: string) => v.replace(/\D/g, '') },
    { code: '507', name: 'Panamá', flag: '🇵🇦', placeholder: '6123-4567', format: (v: string) => v.replace(/\D/g, '') },
    { code: '506', name: 'Costa Rica', flag: '🇨🇷', placeholder: '8312 3456', format: (v: string) => v.replace(/\D/g, '') },
    { code: '503', name: 'El Salvador', flag: '🇸🇻', placeholder: '7012 3456', format: (v: string) => v.replace(/\D/g, '') },
    { code: '502', name: 'Guatemala', flag: '🇬🇹', placeholder: '5123 4567', format: (v: string) => v.replace(/\D/g, '') },
    { code: '504', name: 'Honduras', flag: '🇭🇳', placeholder: '9123 4567', format: (v: string) => v.replace(/\D/g, '') },
    { code: '505', name: 'Nicarágua', flag: '🇳🇮', placeholder: '8123 4567', format: (v: string) => v.replace(/\D/g, '') },
    { code: '53', name: 'Cuba', flag: '🇨🇺', placeholder: '5 1234567', format: (v: string) => v.replace(/\D/g, '') },
    { code: '1', name: 'Estados Unidos', flag: '🇺🇸', placeholder: '(555) 555-5555', format: (v: string) => {
      const num = v.replace(/\D/g, '');
      if (num.length <= 3) return num;
      if (num.length <= 6) return `(${num.slice(0, 3)}) ${num.slice(3)}`;
      return `(${num.slice(0, 3)}) ${num.slice(3, 6)}-${num.slice(6, 10)}`;
    }},
    { code: '1', name: 'Canadá', flag: '🇨🇦', placeholder: '(555) 555-5555', format: (v: string) => {
      const num = v.replace(/\D/g, '');
      if (num.length <= 3) return num;
      if (num.length <= 6) return `(${num.slice(0, 3)}) ${num.slice(3)}`;
      return `(${num.slice(0, 3)}) ${num.slice(3, 6)}-${num.slice(6, 10)}`;
    }},
    
    // Europa
    { code: '351', name: 'Portugal', flag: '🇵🇹', placeholder: '912 345 678', format: (v: string) => {
      const num = v.replace(/\D/g, '');
      if (num.length <= 3) return num;
      if (num.length <= 6) return `${num.slice(0, 3)} ${num.slice(3)}`;
      return `${num.slice(0, 3)} ${num.slice(3, 6)} ${num.slice(6, 9)}`;
    }},
    { code: '34', name: 'Espanha', flag: '🇪🇸', placeholder: '612 34 56 78', format: (v: string) => v.replace(/\D/g, '') },
    { code: '33', name: 'França', flag: '🇫🇷', placeholder: '6 12 34 56 78', format: (v: string) => v.replace(/\D/g, '') },
    { code: '39', name: 'Itália', flag: '🇮🇹', placeholder: '312 345 6789', format: (v: string) => v.replace(/\D/g, '') },
    { code: '49', name: 'Alemanha', flag: '🇩🇪', placeholder: '151 12345678', format: (v: string) => v.replace(/\D/g, '') },
    { code: '44', name: 'Reino Unido', flag: '🇬🇧', placeholder: '7400 123456', format: (v: string) => v.replace(/\D/g, '') },
    { code: '41', name: 'Suíça', flag: '🇨🇭', placeholder: '78 123 45 67', format: (v: string) => v.replace(/\D/g, '') },
    { code: '43', name: 'Áustria', flag: '🇦🇹', placeholder: '664 123456', format: (v: string) => v.replace(/\D/g, '') },
    { code: '32', name: 'Bélgica', flag: '🇧🇪', placeholder: '470 12 34 56', format: (v: string) => v.replace(/\D/g, '') },
    { code: '31', name: 'Holanda', flag: '🇳🇱', placeholder: '6 12345678', format: (v: string) => v.replace(/\D/g, '') },
    { code: '45', name: 'Dinamarca', flag: '🇩🇰', placeholder: '32 12 34 56', format: (v: string) => v.replace(/\D/g, '') },
    { code: '46', name: 'Suécia', flag: '🇸🇪', placeholder: '70 123 45 67', format: (v: string) => v.replace(/\D/g, '') },
    { code: '47', name: 'Noruega', flag: '🇳🇴', placeholder: '406 12 345', format: (v: string) => v.replace(/\D/g, '') },
    { code: '358', name: 'Finlândia', flag: '🇫🇮', placeholder: '41 2345678', format: (v: string) => v.replace(/\D/g, '') },
    { code: '48', name: 'Polônia', flag: '🇵🇱', placeholder: '512 345 678', format: (v: string) => v.replace(/\D/g, '') },
    { code: '420', name: 'República Tcheca', flag: '🇨🇿', placeholder: '601 123 456', format: (v: string) => v.replace(/\D/g, '') },
    { code: '353', name: 'Irlanda', flag: '🇮🇪', placeholder: '85 123 4567', format: (v: string) => v.replace(/\D/g, '') },
    { code: '30', name: 'Grécia', flag: '🇬🇷', placeholder: '691 234 5678', format: (v: string) => v.replace(/\D/g, '') },
    { code: '7', name: 'Rússia', flag: '🇷🇺', placeholder: '912 345-67-89', format: (v: string) => v.replace(/\D/g, '') },
    { code: '380', name: 'Ucrânia', flag: '🇺🇦', placeholder: '50 123 4567', format: (v: string) => v.replace(/\D/g, '') },
    { code: '90', name: 'Turquia', flag: '🇹🇷', placeholder: '501 234 56 78', format: (v: string) => v.replace(/\D/g, '') },
    
    // Ásia
    { code: '86', name: 'China', flag: '🇨🇳', placeholder: '138 0013 8000', format: (v: string) => v.replace(/\D/g, '') },
    { code: '81', name: 'Japão', flag: '🇯🇵', placeholder: '90-1234-5678', format: (v: string) => v.replace(/\D/g, '') },
    { code: '82', name: 'Coreia do Sul', flag: '🇰🇷', placeholder: '10-1234-5678', format: (v: string) => v.replace(/\D/g, '') },
    { code: '91', name: 'Índia', flag: '🇮🇳', placeholder: '81234 56789', format: (v: string) => v.replace(/\D/g, '') },
    { code: '62', name: 'Indonésia', flag: '🇮🇩', placeholder: '812-345-678', format: (v: string) => v.replace(/\D/g, '') },
    { code: '60', name: 'Malásia', flag: '🇲🇾', placeholder: '12-345 6789', format: (v: string) => v.replace(/\D/g, '') },
    { code: '63', name: 'Filipinas', flag: '🇵🇭', placeholder: '905 123 4567', format: (v: string) => v.replace(/\D/g, '') },
    { code: '65', name: 'Singapura', flag: '🇸🇬', placeholder: '8123 4567', format: (v: string) => v.replace(/\D/g, '') },
    { code: '66', name: 'Tailândia', flag: '🇹🇭', placeholder: '81 234 5678', format: (v: string) => v.replace(/\D/g, '') },
    { code: '84', name: 'Vietnã', flag: '🇻🇳', placeholder: '91 234 56 78', format: (v: string) => v.replace(/\D/g, '') },
    { code: '92', name: 'Paquistão', flag: '🇵🇰', placeholder: '301 2345678', format: (v: string) => v.replace(/\D/g, '') },
    { code: '880', name: 'Bangladesh', flag: '🇧🇩', placeholder: '1812-345678', format: (v: string) => v.replace(/\D/g, '') },
    { code: '94', name: 'Sri Lanka', flag: '🇱🇰', placeholder: '71 234 5678', format: (v: string) => v.replace(/\D/g, '') },
    { code: '98', name: 'Irã', flag: '🇮🇷', placeholder: '912 345 6789', format: (v: string) => v.replace(/\D/g, '') },
    { code: '972', name: 'Israel', flag: '🇮🇱', placeholder: '50-123-4567', format: (v: string) => v.replace(/\D/g, '') },
    { code: '966', name: 'Arábia Saudita', flag: '🇸🇦', placeholder: '50 123 4567', format: (v: string) => v.replace(/\D/g, '') },
    { code: '971', name: 'Emirados Árabes', flag: '🇦🇪', placeholder: '50 123 4567', format: (v: string) => v.replace(/\D/g, '') },
    
    // África
    { code: '27', name: 'África do Sul', flag: '🇿🇦', placeholder: '71 123 4567', format: (v: string) => v.replace(/\D/g, '') },
    { code: '234', name: 'Nigéria', flag: '🇳🇬', placeholder: '802 123 4567', format: (v: string) => v.replace(/\D/g, '') },
    { code: '254', name: 'Quênia', flag: '🇰🇪', placeholder: '712 345678', format: (v: string) => v.replace(/\D/g, '') },
    { code: '20', name: 'Egito', flag: '🇪🇬', placeholder: '100 123 4567', format: (v: string) => v.replace(/\D/g, '') },
    { code: '212', name: 'Marrocos', flag: '🇲🇦', placeholder: '650-123456', format: (v: string) => v.replace(/\D/g, '') },
    { code: '213', name: 'Argélia', flag: '🇩🇿', placeholder: '551 23 45 67', format: (v: string) => v.replace(/\D/g, '') },
    { code: '216', name: 'Tunísia', flag: '🇹🇳', placeholder: '20 123 456', format: (v: string) => v.replace(/\D/g, '') },
    { code: '233', name: 'Gana', flag: '🇬🇭', placeholder: '23 123 4567', format: (v: string) => v.replace(/\D/g, '') },
    { code: '255', name: 'Tanzânia', flag: '🇹🇿', placeholder: '621 123 456', format: (v: string) => v.replace(/\D/g, '') },
    { code: '256', name: 'Uganda', flag: '🇺🇬', placeholder: '712 345678', format: (v: string) => v.replace(/\D/g, '') },
    
    // Oceania
    { code: '61', name: 'Austrália', flag: '🇦🇺', placeholder: '412 345 678', format: (v: string) => v.replace(/\D/g, '') },
    { code: '64', name: 'Nova Zelândia', flag: '🇳🇿', placeholder: '21 123 4567', format: (v: string) => v.replace(/\D/g, '') },
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
    if (!newName.trim()) {
      return;
    }

    try {
      // Obter user_id autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const fullPhone = newPhone.trim() ? `${countryCode}${newPhone.trim()}` : '';
      
      // Buscar uma categoria padrão
      const { data: categories } = await (supabase as any)
        .from('poupeja_categories')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      const categoryId = categories && categories.length > 0 ? categories[0].id : null;

      // Gerar reference_code único
      const referenceCode = Math.floor(Date.now() / 1000).toString();
      
      // Inserir transação temporária para registrar o nome/telefone
      const { error } = await (supabase as any)
        .from('poupeja_transactions')
        .insert({
          user_id: user.id,
          name: newName.trim(),
          phone: fullPhone,
          description: 'Cadastro de usuário',
          amount: 0,
          date: new Date().toISOString(),
          type: 'expense',
          category_id: categoryId,
          reference_code: referenceCode
        });

      if (error) {
        console.error('Erro detalhado:', error);
        throw error;
      }

      // Adicionar à lista local
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
      console.error('❌ Erro ao adicionar usuário:', error);
      alert('Erro ao adicionar usuário. Verifique o console para mais detalhes.');
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