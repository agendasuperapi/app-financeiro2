import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ColorPicker from '@/components/categories/ColorPicker';
import BankIconSelector from '@/components/categories/BankIconSelector';
import { Conta } from '@/services/contasService';

interface ContaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: Conta | null;
  onSave: (conta: Omit<Conta, 'id' | 'user_id'> | Conta) => Promise<void>;
}

const ContaForm: React.FC<ContaFormProps> = ({
  open,
  onOpenChange,
  initialData,
  onSave,
}) => {
  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: {
      name: '',
      descricao: '',
      color: '#3b82f6',
      icon: 'Wallet',
    },
  });

  const color = watch('color');
  const icon = watch('icon');

  useEffect(() => {
    if (initialData) {
      setValue('name', initialData.name);
      setValue('descricao', initialData.descricao || '');
      setValue('color', initialData.color);
      setValue('icon', initialData.icon);
    } else {
      reset({
        name: '',
        descricao: '',
        color: '#3b82f6',
        icon: 'Wallet',
      });
    }
  }, [initialData, setValue, reset]);

  const handleColorSelect = (newColor: string) => {
    setValue('color', newColor);
  };

  const handleIconSelect = (newIcon: string) => {
    setValue('icon', newIcon);
  };

  const onSubmit = async (data: any) => {
    if (initialData) {
      await onSave({ ...data, id: initialData.id, user_id: initialData.user_id });
    } else {
      await onSave(data);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Editar Conta' : 'Nova Conta'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              {...register('name', { required: true })}
              placeholder="Nome da conta"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Input
              id="descricao"
              {...register('descricao')}
              placeholder="Descrição da conta (opcional)"
            />
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <ColorPicker
              selectedColor={color}
              onSelectColor={handleColorSelect}
            />
          </div>

          <div className="space-y-2">
            <Label>Ícone</Label>
            <BankIconSelector
              selectedIcon={icon}
              onSelectIcon={handleIconSelect}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {initialData ? 'Atualizar' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ContaForm;
