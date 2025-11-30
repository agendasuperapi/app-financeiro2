import React, { useState, useEffect } from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Transaction } from '@/types';
import { formatCurrency, formatDateTime, createLocalDate } from '@/utils/transactionUtils';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import CategoryIcon from '../categories/CategoryIcon';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useClientAwareData } from '@/hooks/useClientAwareData';
import { useAppContext } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowUp, ArrowDown, Edit, Trash2, ChevronUp, ChevronDown, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface TransactionTableProps {
  transactions: Transaction[];
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (id: string) => void;
  hideValues?: boolean;
}

type SortDirection = 'asc' | 'desc' | null;
type SortField = 'created_at' | 'date' | 'type' | 'category' | 'description' | 'amount';

const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  onEdit,
  onDelete,
  hideValues = false
}) => {
  const { t, currency } = usePreferences();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc'); // Default to newest first
  
  // Related transactions state
  const [showDeleteScopeDialog, setShowDeleteScopeDialog] = useState(false);
  const [deleteScope, setDeleteScope] = useState<'single' | 'all'>('single');
  const [relatedCount, setRelatedCount] = useState(0);
  const [codigoTransToDelete, setCodigoTransToDelete] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Timezone handling (client view or own account)
  const { userTimezone } = useClientAwareData();
  const appCtx = useAppContext();
  const effectiveTimezone = userTimezone || appCtx.userTimezone;

  const renderHiddenValue = () => '******';

  const handleDeleteClick = async (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    
    // Check if transaction has codigo-trans
    const { data: txRow } = await (supabase as any)
      .from('poupeja_transactions')
      .select('id, "codigo-trans"')
      .eq('id', transaction.id)
      .maybeSingle();
    
    const codigoTrans = txRow?.['codigo-trans'];
    
    if (codigoTrans) {
      // Count related transactions
      const { data: relatedTxs, count } = await (supabase as any)
        .from('poupeja_transactions')
        .select('id', { count: 'exact' })
        .eq('codigo-trans', codigoTrans);
      
      if (count && count > 1) {
        setRelatedCount(count);
        setCodigoTransToDelete(codigoTrans);
        setShowDeleteScopeDialog(true);
        return;
      }
    }
    
    // No related transactions, proceed with normal delete
    setDeleteDialogOpen(true);
  };

  const handleConfirmDeleteScope = () => {
    setShowDeleteScopeDialog(false);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!transactionToDelete || !onDelete) return;
    
    if (deleteScope === 'all' && codigoTransToDelete) {
      // Delete all related transactions
      const { data: relatedTxs } = await (supabase as any)
        .from('poupeja_transactions')
        .select('id')
        .eq('codigo-trans', codigoTransToDelete);
      
      if (relatedTxs && relatedTxs.length > 0) {
        for (const tx of relatedTxs) {
          await onDelete(tx.id);
        }
      }
    } else {
      // Delete only this transaction
      onDelete(transactionToDelete.id);
    }
    
    setDeleteDialogOpen(false);
    setTransactionToDelete(null);
    setDeleteScope('single');
    setRelatedCount(0);
    setCodigoTransToDelete(null);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Reset to first page when transactions change
  useEffect(() => {
    setCurrentPage(1);
  }, [transactions.length]);

  const sortedTransactions = React.useMemo(() => {
    if (!sortDirection) return transactions;
    
    return [...transactions].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'created_at':
          const createdA = new Date((a.created_at as string) || '').getTime();
          const createdB = new Date((b.created_at as string) || '').getTime();
          comparison = createdA - createdB;
          break;
        case 'date':
          const dateA = createLocalDate((a.date as string) || '', effectiveTimezone);
          const dateB = createLocalDate((b.date as string) || '', effectiveTimezone);
          comparison = dateA.getTime() - dateB.getTime();
          break;
        case 'type':
          comparison = (a.type || '').localeCompare(b.type || '');
          break;
        case 'category':
          comparison = (a.category || '').localeCompare(b.category || '');
          break;
        case 'description':
          comparison = (a.description || '').localeCompare(b.description || '');
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [transactions, sortField, sortDirection, effectiveTimezone]);

  // Calculate pagination
  const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTransactions = sortedTransactions.slice(startIndex, endIndex);

  return (
    <div className="border rounded-lg overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <Table className="w-full table-fixed">
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-[13%] min-w-[100px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-medium text-xs hover:bg-transparent"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center gap-1">
                    Data de Criação
                    {sortField === 'created_at' && sortDirection === 'asc' && <ChevronUp className="h-3 w-3" />}
                    {sortField === 'created_at' && sortDirection === 'desc' && <ChevronDown className="h-3 w-3" />}
                    {sortField !== 'created_at' && <ArrowUpDown className="h-3 w-3 text-muted-foreground" />}
                  </div>
                </Button>
              </TableHead>
              <TableHead className="w-[11%] min-w-[70px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-medium text-xs hover:bg-transparent"
                  onClick={() => handleSort('type')}
                >
                  <div className="flex items-center gap-1">
                    {t('common.type')}
                    {sortField === 'type' && sortDirection === 'asc' && <ChevronUp className="h-3 w-3" />}
                    {sortField === 'type' && sortDirection === 'desc' && <ChevronDown className="h-3 w-3" />}
                    {sortField !== 'type' && <ArrowUpDown className="h-3 w-3 text-muted-foreground" />}
                  </div>
                </Button>
              </TableHead>
              <TableHead className="w-[12%] min-w-[90px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-medium text-xs hover:bg-transparent"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-1">
                    {t('common.date')}
                    {sortField === 'date' && sortDirection === 'asc' && <ChevronUp className="h-3 w-3" />}
                    {sortField === 'date' && sortDirection === 'desc' && <ChevronDown className="h-3 w-3" />}
                    {sortField !== 'date' && <ArrowUpDown className="h-3 w-3 text-muted-foreground" />}
                  </div>
                </Button>
              </TableHead>
              <TableHead className="w-[13%] min-w-[80px]">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-medium text-xs hover:bg-transparent"
                  onClick={() => handleSort('category')}
                >
                  <div className="flex items-center gap-1">
                    {t('common.category')}
                    {sortField === 'category' && sortDirection === 'asc' && <ChevronUp className="h-3 w-3" />}
                    {sortField === 'category' && sortDirection === 'desc' && <ChevronDown className="h-3 w-3" />}
                    {sortField !== 'category' && <ArrowUpDown className="h-3 w-3 text-muted-foreground" />}
                  </div>
                </Button>
              </TableHead>
              <TableHead className="w-[20%] hidden lg:table-cell">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-medium text-xs hover:bg-transparent"
                  onClick={() => handleSort('description')}
                >
                  <div className="flex items-center gap-1">
                    {t('common.description')}
                    {sortField === 'description' && sortDirection === 'asc' && <ChevronUp className="h-3 w-3" />}
                    {sortField === 'description' && sortDirection === 'desc' && <ChevronDown className="h-3 w-3" />}
                    {sortField !== 'description' && <ArrowUpDown className="h-3 w-3 text-muted-foreground" />}
                  </div>
                </Button>
              </TableHead>
              <TableHead className="text-right w-[10%] min-w-[75px] hidden lg:table-cell">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-medium text-xs hover:bg-transparent"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center gap-1">
                    {t('common.amount')}
                    {sortField === 'amount' && sortDirection === 'asc' && <ChevronUp className="h-3 w-3" />}
                    {sortField === 'amount' && sortDirection === 'desc' && <ChevronDown className="h-3 w-3" />}
                    {sortField !== 'amount' && <ArrowUpDown className="h-3 w-3 text-muted-foreground" />}
                  </div>
                </Button>
              </TableHead>
              <TableHead className="w-[12%] min-w-[90px]">{t('common.actions') || 'Ações'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentTransactions.map((transaction, index) => {
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
                  <TableCell className="font-medium text-[10px] md:text-xs">
                    <div className="text-muted-foreground">
                      {transaction.created_at 
                        ? formatDateTime(transaction.created_at as string, effectiveTimezone)
                        : '-'
                      }
                    </div>
                  </TableCell>
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
                       <div className="font-medium">{formatDateTime(transaction.date as string, effectiveTimezone)}</div>
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

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <div className="text-sm text-muted-foreground">
            {t('common.showing')} {startIndex + 1}-{Math.min(endIndex, sortedTransactions.length)} {t('common.of')} {sortedTransactions.length}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t('common.previous')}
            </Button>
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium">
                {currentPage} / {totalPages}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              {t('common.next')}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete scope dialog - shown when transaction has related transactions */}
      <AlertDialog open={showDeleteScopeDialog} onOpenChange={setShowDeleteScopeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transações Relacionadas</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Esta transação faz parte de um grupo de <strong>{relatedCount} transações relacionadas</strong>.
              </p>
              <RadioGroup value={deleteScope} onValueChange={(v) => setDeleteScope(v as 'single' | 'all')}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="single" id="single-delete" />
                  <Label htmlFor="single-delete" className="cursor-pointer">
                    Excluir apenas esta transação
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="all-delete" />
                  <Label htmlFor="all-delete" className="cursor-pointer">
                    Excluir todas as {relatedCount} transações relacionadas
                  </Label>
                </div>
              </RadioGroup>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteScope('single');
              setRelatedCount(0);
              setCodigoTransToDelete(null);
            }}>
              {t('common.cancel') || 'Cancelar'}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteScope}>
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Final delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirmDelete') || 'Confirmar Exclusão'}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              {deleteScope === 'all' && relatedCount > 0 && (
                <div className="bg-destructive/10 p-3 rounded-md border border-destructive/20">
                  <p className="text-sm font-medium text-destructive">
                    ⚠️ Você está prestes a excluir {relatedCount} transações relacionadas
                  </p>
                </div>
              )}
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
            <AlertDialogCancel onClick={() => {
              setDeleteScope('single');
              setRelatedCount(0);
              setCodigoTransToDelete(null);
            }}>
              {t('common.cancel') || 'Cancelar'}
            </AlertDialogCancel>
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
