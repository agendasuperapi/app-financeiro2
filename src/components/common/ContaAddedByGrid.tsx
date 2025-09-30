import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import ContaInputForm from '@/components/contas/ContaInputForm';
import SubContaInput from '@/components/contas/SubContaInput';
import AddedByFieldForm from '@/components/contas/AddedByFieldForm';

interface ContaAddedByGridProps {
  form: UseFormReturn<any>;
}

const ContaAddedByGrid: React.FC<ContaAddedByGridProps> = ({ form }) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ContaInputForm form={form} />
        <SubContaInput form={form} />
      </div>
      <AddedByFieldForm form={form} />
    </div>
  );
};

export default ContaAddedByGrid;