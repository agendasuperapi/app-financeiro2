import React from 'react';
import ReminderForm from '@/components/lembretes/ReminderForm';

interface AddContaFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
  mode?: 'create' | 'edit';
}

const AddContaForm: React.FC<AddContaFormProps> = ({
  onSuccess,
  onCancel,
  initialData,
  mode = 'create'
}) => {
  return (
    <ReminderForm
      open={true}
      onOpenChange={onCancel}
      initialData={initialData}
      mode={mode}
      onSuccess={onSuccess}
    />
  );
};

export default AddContaForm;