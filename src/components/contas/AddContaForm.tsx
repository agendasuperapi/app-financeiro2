import React from 'react';
import ReminderForm from '@/components/lembretes/ReminderForm';

interface AddContaFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
  mode?: 'create' | 'edit';
  targetUserId?: string;
}

const AddContaForm: React.FC<AddContaFormProps> = ({
  onSuccess,
  onCancel,
  initialData,
  mode = 'create',
  targetUserId
}) => {
  return (
    <ReminderForm
      open={true}
      onOpenChange={onCancel}
      initialData={initialData}
      mode={mode}
      onSuccess={onSuccess}
      targetUserId={targetUserId}
    />
  );
};

export default AddContaForm;