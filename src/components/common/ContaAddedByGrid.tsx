import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import ContaInput from './ContaInput';
import AddedByField from './AddedByField';

interface ContaAddedByGridProps {
  form: UseFormReturn<any>;
}

const ContaAddedByGrid: React.FC<ContaAddedByGridProps> = ({ form }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ContaInput form={form} />
      <AddedByField form={form} />
    </div>
  );
};

export default ContaAddedByGrid;