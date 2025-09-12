import React from 'react';
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

  // Debug: confirm component render and props
  console.log('[TransactionTable] render', {
    rows: transactions.length,
    hasEdit: !!onEdit,
    hasDelete: !!onDelete,
  });

  const renderHiddenValue = () => '******';

  return (
    <div className="border rounded-lg overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <Table className="w-full min-w-[760px] table-fixed">
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-[12%] min-w-[70px]">{t('common.type')}</TableHead>
              <TableHead className="w-[13%] min-w-[90px]">{t('common.date')}</TableHead>
              <TableHead className="w-[22%] min-w-[110px]">{t('common.category')}</TableHead>
              <TableHead className="w-[24%] hidden lg:table-cell">{t('common.description')}</TableHead>
              <TableHead className="text-right w-[120px] min-w-[120px]">Ações</TableHead>
              <TableHead className="text-right w-[10%] min-w-[75px] hidden lg:table-cell">{t('common.amount')}</TableHead>
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
                  className="group"
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
                      <div className="font-medium">{formatDateTime(transaction.created_at || transaction.date)}</div>
                      <div className="lg:hidden text-[10px] text-muted-foreground break-words">
                        {transaction.description}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
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
                      </div>
                      <div className="md:flex md:flex-col md:items-start md:gap-1 lg:hidden mt-1">
                        <div
                          className={cn(
                            'font-semibold text-xs',
                            transaction.type === 'income' ? 'text-metacash-success' : 'text-metacash-error'
                          )}
                        >
                          {transaction.type === 'income' ? '+' : '-'}
                          {hideValues ? renderHiddenValue() : formatCurrency(transaction.amount, currency)}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-[10px] md:text-xs hidden lg:table-cell">
                    <div className="truncate pr-2">{transaction.description}</div>
                  </TableCell>
                  <TableCell className="pl-2 pr-2 w-[120px] min-w-[120px]">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        disabled={!onEdit}
                        onClick={onEdit ? () => onEdit(transaction) : undefined}
                        aria-label={t('common.edit') || 'Editar'}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-metacash-error hover:text-metacash-error disabled:text-muted-foreground"
                        disabled={!onDelete}
                        onClick={onDelete ? () => onDelete(transaction.id) : undefined}
                        aria-label={t('common.delete') || 'Excluir'}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right font-semibold text-[10px] md:text-xs hidden lg:table-cell',
                      transaction.type === 'income' ? 'text-metacash-success' : 'text-metacash-error'
                    )}
                  >
                    {transaction.type === 'income' ? '+' : '-'}
                    {hideValues ? renderHiddenValue() : formatCurrency(transaction.amount, currency)}
                  </TableCell>
                </motion.tr>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default TransactionTable;
