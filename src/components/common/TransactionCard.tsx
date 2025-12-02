import React, { useState } from 'react';
import { Transaction } from '@/types';
import { formatCurrency, formatDateTime } from '@/utils/transactionUtils';
import { MoreHorizontal, Target, ArrowUp, ArrowDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
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
import { useAppContext } from '@/contexts/AppContext';
import { useClientAwareData } from '@/hooks/useClientAwareData';
import { usePreferences } from '@/contexts/PreferencesContext';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import CategoryIcon from '../categories/CategoryIcon';
import { supabase } from '@/integrations/supabase/client';

interface TransactionCardProps {
  transaction: Transaction;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (id: string) => void;
  hideValues?: boolean;
  index?: number;
}

const TransactionCard: React.FC<TransactionCardProps> = ({
  transaction,
  onEdit,
  onDelete,
  hideValues = false,
  index = 0
}) => {
  const { goals } = useAppContext();
  const { t, currency } = usePreferences();
  const { userTimezone } = useClientAwareData();
  const appCtx = useAppContext();
  const effectiveTimezone = userTimezone || appCtx.userTimezone;

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showDeleteScopeDialog, setShowDeleteScopeDialog] = useState(false);
  const [deleteScope, setDeleteScope] = useState<'single' | 'all'>('single');
  const [relatedCount, setRelatedCount] = useState(0);
  const [codigoTransToDelete, setCodigoTransToDelete] = useState<string | null>(null);

  // Helper to get goal name
  const getGoalName = (goalId?: string) => {
    if (!goalId) return null;
    const goal = goals.find(g => g.id === goalId);
    return goal ? goal.name : null;
  };

  // Helper to render masked values
  const renderHiddenValue = () => {
    return '******';
  };

  const handleDeleteClick = async () => {
    // Check if transaction has codigo-trans
    const { data: txRow } = await (supabase as any)
      .from('poupeja_transactions')
      .select('id, "codigo-trans"')
      .eq('id', transaction.id)
      .maybeSingle();
    
    const codigoTrans = txRow?.['codigo-trans'];
    
    if (codigoTrans) {
      // Count related transactions
      const { count } = await (supabase as any)
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
    
    // No related transactions, proceed with normal delete confirmation
    setDeleteDialogOpen(true);
  };

  const handleConfirmDeleteScope = () => {
    setShowDeleteScopeDialog(false);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!onDelete) return;
    
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
      onDelete(transaction.id);
    }
    
    setDeleteDialogOpen(false);
    setDeleteScope('single');
    setRelatedCount(0);
    setCodigoTransToDelete(null);
  };

  const iconColor = transaction.type === 'income' ? '#26DE81' : '#EF4444';
  const isIncome = transaction.type === 'income';

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, duration: 0.3 }}
        className={cn(
          "bg-card border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow",
          (transaction as any).__isSimulation && "border-dashed border-orange-400"
        )}
      >
        {/* Header: Type Icon + Amount */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              isIncome ? "bg-green-100" : "bg-red-100"
            )}>
              {isIncome ? (
                <ArrowUp className="w-5 h-5 text-green-600" />
              ) : (
                <ArrowDown className="w-5 h-5 text-red-600" />
              )}
            </div>
            <div>
              <span className={cn(
                "text-lg font-semibold",
                isIncome ? "text-green-600" : "text-red-600"
              )}>
                {isIncome ? '+' : '-'}
                {hideValues ? renderHiddenValue() : formatCurrency(Math.abs(transaction.amount), currency)}
              </span>
              <p className="text-sm text-muted-foreground">
                {formatDateTime(transaction.date as string, effectiveTimezone)}
              </p>
            </div>
          </div>
          
          {/* Status Badge for simulations */}
          {(transaction as any).__isSimulation && (
            <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">
              Simulação
            </Badge>
          )}
          
          {/* Actions Menu - Hide for simulations */}
          {!(transaction as any).__isSimulation && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">{t('common.edit')}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(transaction)}>
                    {t('common.edit')}
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem 
                    onClick={handleDeleteClick}
                    className="text-red-600"
                  >
                    {t('common.delete')}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Category and Description */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <CategoryIcon 
              icon={transaction.type === 'income' ? 'trending-up' : transaction.type === 'expense' ? transaction.category.toLowerCase().includes('food') ? 'utensils' : 'shopping-bag' : 'circle'} 
              color={iconColor} 
              size={16}
            />
            <Badge variant="outline" className={cn(
              "text-xs",
              isIncome 
                ? "bg-green-50 text-green-600 border-green-200"
                : "bg-red-50 text-red-600 border-red-200"
            )}>
              {transaction.category}
            </Badge>
            {transaction.creatorName && (
              <span className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                {transaction.creatorName}
              </span>
            )}
          </div>
          
          {transaction.description && (
            <p className="text-sm text-foreground font-medium">
              {transaction.description}
            </p>
          )}
        </div>

        {/* Goal (if exists) */}
        {transaction.goalId && (
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <Target className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">
              {getGoalName(transaction.goalId)}
            </span>
          </div>
        )}
      </motion.div>

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
                  <RadioGroupItem value="single" id={`single-delete-${transaction.id}`} />
                  <Label htmlFor={`single-delete-${transaction.id}`} className="cursor-pointer">
                    Excluir apenas esta transação
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id={`all-delete-${transaction.id}`} />
                  <Label htmlFor={`all-delete-${transaction.id}`} className="cursor-pointer">
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
              <div className="bg-muted p-3 rounded-md">
                <p className="font-medium">
                  {transaction.description}
                </p>
                <p className={cn(
                  "text-sm font-semibold",
                  transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                )}>
                  {transaction.type === 'income' ? '+' : '-'}
                  {hideValues ? renderHiddenValue() : formatCurrency(Math.abs(transaction.amount), currency)}
                </p>
              </div>
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
    </>
  );
};

export default TransactionCard;