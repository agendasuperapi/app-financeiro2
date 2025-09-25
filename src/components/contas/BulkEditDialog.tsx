import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { usePreferences } from '@/contexts/PreferencesContext';

interface BulkEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  futureTransactionsCount: number;
  onConfirm: (editAll: boolean) => void;
}

const BulkEditDialog: React.FC<BulkEditDialogProps> = ({
  open,
  onOpenChange,
  futureTransactionsCount,
  onConfirm
}) => {
  const { t } = usePreferences();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Transações Relacionadas Encontradas</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Encontramos <strong>{futureTransactionsCount}</strong> transação(ões) futura(s) 
              com o mesmo código desta transação.
            </p>
            <p>
              Como você gostaria de proceder com a edição?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
          <AlertDialogCancel 
            onClick={() => onConfirm(false)}
            className="w-full sm:w-auto"
          >
            Editar Apenas Esta Transação
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={() => onConfirm(true)}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
          >
            Editar Todas as Transações Futuras ({futureTransactionsCount + 1})
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default BulkEditDialog;