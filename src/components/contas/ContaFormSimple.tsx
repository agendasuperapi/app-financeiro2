import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ContaFormSimpleProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const ContaFormSimple: React.FC<ContaFormSimpleProps> = ({ onSuccess, onCancel }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');

  console.log('🔍 Simple form state:', { description, amount });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('📝 Form submitted:', { description, amount });
    if (onSuccess) onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="description">Descrição (Teste)</Label>
        <Input
          id="description"
          type="text"
          value={description}
          onChange={(e) => {
            console.log('📝 Description changed:', e.target.value);
            setDescription(e.target.value);
          }}
          placeholder="Digite aqui..."
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Valor (Teste)</Label>
        <Input
          id="amount"
          type="number"
          value={amount}
          onChange={(e) => {
            console.log('💰 Amount changed:', e.target.value);
            setAmount(e.target.value);
          }}
          placeholder="0,00"
          className="w-full"
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">
          Salvar
        </Button>
      </div>

      <div className="text-xs bg-gray-100 p-2 rounded">
        Debug: description="{description}", amount="{amount}"
      </div>
    </form>
  );
};

export default ContaFormSimple;