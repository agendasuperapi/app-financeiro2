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
type SortField = 'created_at' | 'date' | 'type' | 'category' | 'status' | 'description' | 'amount';

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
        case 'status':
          const statusA = (a as any).status || '';
          const statusB = (a as any).status || '';
          comparison = statusA.localeCompare(statusB);
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
        <Table className="w-full">
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="w-[90px] lg:w-[110px] px-2 lg:px-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-medium text-[10px] lg:text-xs hover:bg-transparent whitespace-nowrap"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center gap-1">
                    <span className="hidden lg:inline">Data de Criação</span>
                    <span className="lg:hidden">Criação</span>
                    {sortField === 'created_at' && sortDirection === 'asc' && <ChevronUp className="h-3 w-3" />}
                    {sortField === 'created_at' && sortDirection === 'desc' && <ChevronDown className="h-3 w-3" />}
                    {sortField !== 'created_at' && <ArrowUpDown className="h-3 w-3 text-muted-foreground" />}
                  </div>
                </Button>
              </TableHead>
              <TableHead className="w-[85px] lg:w-[100px] px-2 lg:px-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-medium text-[10px] lg:text-xs hover:bg-transparent"
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
              <TableHead className="px-2 lg:px-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-medium text-[10px] lg:text-xs hover:bg-transparent"
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
              <TableHead className="w-[70px] px-2 lg:px-4 hidden xl:table-cell">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 font-medium text-xs hover:bg-transparent"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-1">
                    Status
                    {sortField === 'status' && sortDirection === 'asc' && <ChevronUp className="h-3 w-3" />}
                    {sortField === 'status' && sortDirection === 'desc' && <ChevronDown className="h-3 w-3" />}
                    {sortField !== 'status' && <ArrowUpDown className="h-3 w-3 text-muted-foreground" />}
                  </div>
                </Button>
              </TableHead>
              <TableHead className="hidden xl:table-cell px-4">
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
              <TableHead className="text-right w-[85px] lg:w-[100px] px-2 lg:px-4 hidden lg:table-cell">
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
              <TableHead className="w-[80px] lg:w-[90px] px-2 lg:px-4">{t('common.actions') || 'Ações'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentTransactions.map((transaction, index) => {
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
                  <TableCell className="font-medium text-[10px] md:text-xs px-2 lg:px-4">
                    <div className="text-muted-foreground">
                      {transaction.created_at 
                        ? (() => {
                            const formatted = formatDateTime(transaction.created_at as string, effectiveTimezone);
                            const parts = formatted.split(' ');
                            return (
                              <>
                                <div>{parts[0]}</div>
                                <div>{parts[1]}</div>
                              </>
                            );
                          })()
                        : '-'
                      }
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-[10px] md:text-xs px-2 lg:px-4">
                    <div>
                      <div className="font-medium truncate">{formatDateTime(transaction.date as string, effectiveTimezone)}</div>
                      <div className="xl:hidden text-[10px] text-muted-foreground truncate">
                        {transaction.description}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-2 lg:px-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 flex-wrap">
                        {transaction.type === 'income' ? (
                          <div className="w-5 h-5 rounded-full bg-metacash-success flex items-center justify-center flex-shrink-0">
                            <ArrowUp className="w-3 h-3 text-white" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-metacash-error flex items-center justify-center flex-shrink-0">
                            <ArrowDown className="w-3 h-3 text-white" />
                          </div>
                        )}
                        <CategoryIcon
                          icon={transaction.categoryIcon || 'circle'}
                          color={transaction.categoryColor || (transaction.type === 'income' ? '#4CAF50' : '#E57373')}
                          size={12}
                        />
                        <Badge
                          variant="outline"
                          className="text-[9px] lg:text-[10px] whitespace-nowrap max-w-[80px] lg:max-w-[120px] truncate px-1"
                          style={{
                            backgroundColor: `${transaction.categoryColor || (transaction.type === 'income' ? '#4CAF50' : '#E57373')}15`,
                            color: transaction.categoryColor || (transaction.type === 'income' ? '#4CAF50' : '#E57373'),
                            borderColor: `${transaction.categoryColor || (transaction.type === 'income' ? '#4CAF50' : '#E57373')}30`
                          }}
                        >
                          {transaction.category}
                        </Badge>
                      </div>
                      {transaction.creatorName && (
                        <span className="inline-flex items-center px-1 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-medium">
                          {transaction.creatorName}
                        </span>
                      )}
                      {(transaction as any).__isSimulation && (
                        <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 text-[9px]">
                          Simulação
                        </Badge>
                      )}
                      <div className="lg:hidden">
                        <div
                          className={cn(
                            'font-semibold text-[10px]',
                            transaction.type === 'income' ? 'text-metacash-success' : 'text-metacash-error'
                          )}
                        >
                          {hideValues ? renderHiddenValue() : formatCurrency(Math.abs(transaction.amount), currency)}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-[10px] md:text-xs hidden xl:table-cell px-2 lg:px-4">
                    {(() => {
                      const status = (transaction as any).status;
                      const isPago = status === 'paid';
                      const isPendente = status === 'pending';
                      
                      return (
                        <Badge 
                          variant="outline" 
                          className="text-[10px] whitespace-nowrap"
                          style={{
                            backgroundColor: isPago ? '#4CAF5015' : isPendente ? '#FF980015' : '#9E9E9E15',
                            color: isPago ? '#4CAF50' : isPendente ? '#FF9800' : '#9E9E9E',
                            borderColor: isPago ? '#4CAF5030' : isPendente ? '#FF980030' : '#9E9E9E30'
                          }}
                        >
                          {isPago ? 'Pago' : isPendente ? 'Pendente' : status || '-'}
                        </Badge>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="text-[10px] md:text-xs hidden xl:table-cell px-4">
                    <div className="truncate max-w-[200px]">
                      {transaction.description}
                    </div>
                  </TableCell>
                  <TableCell
                    className={cn(
                      'text-right font-semibold text-[10px] md:text-xs hidden lg:table-cell px-2 lg:px-4',
                      transaction.type === 'income' ? 'text-metacash-success' : 'text-metacash-error'
                    )}
                  >
                    {hideValues ? renderHiddenValue() : formatCurrency(Math.abs(transaction.amount), currency)}
                  </TableCell>
                  <TableCell className="px-2 lg:px-4">
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
