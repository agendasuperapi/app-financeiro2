import React, { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePreferences } from '@/contexts/PreferencesContext';
import { supabase } from '@/integrations/supabase/client';

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
      const newUser = { name: newName.trim(), phone: newPhone.trim() };
      setUsers([...users, newUser].sort((a, b) => a.name.localeCompare(b.name)));
      
      // Definir no formulário
      form.setValue('name', newUser.name);
      form.setValue('phone', newUser.phone);
      
      // Limpar e fechar
      setNewName('');
      setNewPhone('');
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
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Digite o nome"
              />
            </div>
            <div>
              <Label htmlFor="phone">Telefone (opcional)</Label>
              <Input
                id="phone"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="Digite o telefone"
              />
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