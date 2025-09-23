import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Transaction } from '@/types';
import { formatCurrency, formatDateTime } from '@/utils/transactionUtils';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import CategoryIcon from '../categories/CategoryIcon';
import { usePreferences } from '@/contexts/PreferencesContext';
import { ArrowUp, ArrowDown, Edit, Trash2 } from 'lucide-react';

interface TransactionTableProps {
  transactions: Transaction[];
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (id: string) => void;
  hideValues?: boolean;
}

const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  onEdit,
  onDelete,
  hideValues = false
}) => {
  const { t, currency } = usePreferences();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);

  const renderHiddenValue = () => '******';

  const handleDeleteClick = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (transactionToDelete && onDelete) {
      onDelete(transactionToDelete.id);
    }
    setDeleteDialogOpen(false);
    setTransactionToDelete(null);
  };

  return (
    <div className="border rounded-lg overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <Table className="w-full table-fixed">
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-[12%] min-w-[70px]">{t('common.type')}</TableHead>
              <TableHead className="w-[13%] min-w-[90px]">{t('common.date')}</TableHead>
              <TableHead className="w-[22%] min-w-[110px]">{t('common.category')}</TableHead>
              <TableHead className="w-[24%] hidden lg:table-cell">{t('common.description')}</TableHead>
              <TableHead className="text-right w-[10%] min-w-[75px] hidden lg:table-cell">{t('common.amount')}</TableHead>
              <TableHead className="w-[12%] min-w-[90px]">{t('common.actions') || 'Ações'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction, index) => {
              const iconColor = transaction.type === 'income' ? '#26DE81' : '#EF4444';

              return (
                <motion.tr
                  key={transaction.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  className={cn(
                    "group",
                    (transaction as any).__isSimulation && "border-dashed border-orange-400"
                  )}
                >
                  <TableCell>
                    {transaction.type === 'income' ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center">
                          <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-metacash-success flex items-center justify-center mr-2">
                            <ArrowUp className="w-3 h-3 md:w-4 md:h-4 text-white" />
                          </div>
                          <span className="text-[10px] md:text-xs">{t('income.title')}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center">
                          <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-metacash-error flex items-center justify-center mr-2">
                            <ArrowDown className="w-3 h-3 md:w-4 md:h-4 text-white" />
                          </div>
                          <span className="text-[10px] md:text-xs">{t('expense.title')}</span>
                        </div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-[10px] md:text-xs">
                     <div className="space-y-1">
                       <div className="font-medium">{formatDateTime(transaction.date)}</div>
                       <div className="lg:hidden text-[10px] text-muted-foreground break-words">
                         {transaction.description}
                       </div>
                     </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CategoryIcon
                          icon={
                            transaction.type === 'income'
                              ? 'trending-up'
                              : transaction.type === 'expense'
                              ? transaction.category.toLowerCase().includes('food')
                                ? 'utensils'
                                : 'shopping-bag'
                              : 'circle'
                          }
                          color={iconColor}
                          size={14}
                        />
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] whitespace-nowrap max-w-[100px] md:max-w-[160px] truncate',
                            transaction.type === 'income'
                              ? 'bg-green-50 text-green-600 hover:bg-green-100 border-green-200'
                              : 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200'
                          )}
                        >
                          {transaction.category}
                        </Badge>
                        {transaction.creatorName && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-primary text-[10px] font-medium">
                            {transaction.creatorName}
                          </span>
                        )}
                        {(transaction as any).__isSimulation && (
                          <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 text-[10px]">
                            Simulação
                          </Badge>
                        )}
                      </div>
                      <div className="md:flex md:flex-col md:items-start md:gap-1 lg:hidden mt-1">
                        <div
                          className={cn(
                            'font-semibold text-xs',
                            transaction.type === 'income' ? 'text-metacash-success' : 'text-metacash-error'
                          )}
                        >
                          {transaction.type === 'income' ? '+' : '-'}
                          {hideValues ? renderHiddenValue() : formatCurrency(Math.abs(transaction.amount), currency)}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                   <TableCell className="text-[10px] md:text-xs hidden lg:table-cell">
                     <div className="truncate pr-2">
                       {transaction.description}
                     </div>
                   </TableCell>
                  <TableCell
                    className={cn(
                      'text-right font-semibold text-[10px] md:text-xs hidden lg:table-cell',
                      transaction.type === 'income' ? 'text-metacash-success' : 'text-metacash-error'
                    )}
                  >
                    {transaction.type === 'income' ? '+' : '-'}
                    {hideValues ? renderHiddenValue() : formatCurrency(Math.abs(transaction.amount), currency)}
                  </TableCell>
                  <TableCell className="pl-2 pr-2 w-[12%] min-w-[90px]">
                    <div className="flex justify-end gap-1">
                      {!(transaction as any).__isSimulation && onEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => onEdit(transaction)}
                        >
                          <Edit className="h-3 w-3" />
                          <span className="sr-only">{t('common.edit')}</span>
                        </Button>
                      )}
                      {!(transaction as any).__isSimulation && onDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-metacash-error hover:text-metacash-error"
                          onClick={() => handleDeleteClick(transaction)}
                        >
                          <Trash2 className="h-3 w-3" />
                          <span className="sr-only">{t('common.delete')}</span>
                        </Button>
                      )}
                      {(transaction as any).__isSimulation && (
                        <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 text-[10px]">
                          Previsto
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </motion.tr>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirmDelete') || 'Confirmar Exclusão'}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              {transactionToDelete && (
                <div className="bg-muted p-3 rounded-md">
                  <p className="font-medium">
                    {transactionToDelete.description}
                  </p>
                  <p className={cn(
                    "text-sm font-semibold",
                    transactionToDelete.type === 'income' ? 'text-metacash-success' : 'text-metacash-error'
                  )}>
                    {transactionToDelete.type === 'income' ? '+' : '-'}
                    {hideValues ? renderHiddenValue() : formatCurrency(Math.abs(transactionToDelete.amount), currency)}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel') || 'Cancelar'}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              {t('common.delete') || 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TransactionTable;
