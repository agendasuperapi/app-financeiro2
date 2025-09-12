
import React, { useState } from 'react';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { 
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Transaction } from '@/types';
import { formatCurrency, formatDateTime } from '@/utils/transactionUtils';
import { MoreHorizontal, TrendingUp, TrendingDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAppContext } from '@/contexts/AppContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import CategoryIcon from '../categories/CategoryIcon';
import TransactionCard from './TransactionCard';
import { useIsMobile } from '@/hooks/use-mobile';

interface TransactionListProps {
  transactions: Transaction[];
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (id: string) => void;
  hideValues?: boolean;
}

const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  onEdit,
  onDelete,
  hideValues = false
}) => {
  const { t, currency } = usePreferences();
  const isMobile = useIsMobile();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  // More items per page for tablets
  const itemsPerPage = isMobile ? 10 : 15;

  // Calculate pagination
  const totalPages = Math.ceil(transactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTransactions = transactions.slice(startIndex, endIndex);

  // Reset to first page when transactions change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [transactions.length]);


  // Helper to render masked values
  const renderHiddenValue = () => {
    return '******';
  };

  if (transactions.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
              <path d="M16 6h6"></path><path d="M21 12h1"></path><path d="M16 18h6"></path><path d="M8 6H3a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h5"></path><path d="M10 18H3a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h7"></path><path d="m7 14 4-4"></path><path d="m7 10 4 4"></path>
            </svg>
          </div>
          <div className="space-y-2">
            <p className="font-medium text-foreground">{t('common.noData')}</p>
            <p className="text-sm text-muted-foreground">{t('transactions.empty')}</p>
          </div>
        </div>
      </div>
    );
  }

  // Mobile and tablet card layout
  if (isMobile) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-1">
          {currentTransactions.map((transaction, index) => (
            <TransactionCard
              key={transaction.id}
              transaction={transaction}
              onEdit={onEdit}
              onDelete={onDelete}
              hideValues={hideValues}
              index={index}
            />
          ))}
        </div>
        
        {/* Mobile Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-6">
            <Pagination>
              <PaginationContent>
                {currentPage > 1 && (
                  <PaginationItem>
                    <PaginationPrevious 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(currentPage - 1);
                      }}
                    />
                  </PaginationItem>
                )}
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      href="#"
                      isActive={page === currentPage}
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(page);
                      }}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                
                {currentPage < totalPages && (
                  <PaginationItem>
                    <PaginationNext 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(currentPage + 1);
                      }}
                    />
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table className="w-full table-fixed">
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[15%] min-w-[80px]">{t('common.type')}</TableHead>
                <TableHead className="w-[20%] min-w-[100px]">{t('common.date')}</TableHead>
                <TableHead className="w-[20%] min-w-[120px]">{t('common.category')}</TableHead>
                <TableHead className="w-[25%] hidden md:table-cell">{t('common.description')}</TableHead>
                <TableHead className="text-right w-[15%] min-w-[80px] hidden lg:table-cell">{t('common.amount')}</TableHead>
                <TableHead className="w-[5%] min-w-[40px] hidden lg:table-cell"></TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {currentTransactions.map((transaction, index) => {
              // Use different icons and colors based on transaction type
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
                          <span className="text-xs md:text-sm">{t('income.title')}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center">
                          <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-metacash-error flex items-center justify-center mr-2">
                            <ArrowDown className="w-3 h-3 md:w-4 md:h-4 text-white" />
                          </div>
                          <span className="text-xs md:text-sm">{t('expense.title')}</span>
                        </div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-xs md:text-sm">
                    <div className="space-y-1">
                      <div className="font-medium">{formatDateTime(transaction.created_at || transaction.date)}</div>
                      <div className="md:hidden text-xs text-muted-foreground break-words">
                        {transaction.description}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CategoryIcon 
                          icon={transaction.type === 'income' ? 'trending-up' : transaction.type === 'expense' ? transaction.category.toLowerCase().includes('food') ? 'utensils' : 'shopping-bag' : 'circle'} 
                          color={iconColor} 
                          size={14}
                        />
                        <Badge variant="outline" className={cn(
                          "text-xs whitespace-nowrap max-w-[100px] truncate",
                          transaction.type === 'income' 
                            ? "bg-green-50 text-green-600 hover:bg-green-100 border-green-200"
                            : "bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
                        )}>
                          {transaction.category}
                        </Badge>
                      </div>
                      <div className="md:flex lg:hidden items-center justify-between mt-1">
                        <div className={cn(
                          "font-semibold text-sm",
                          transaction.type === 'income' ? 'text-metacash-success' : 'text-metacash-error'
                        )}>
                          {transaction.type === 'income' ? '+' : '-'}
                          {hideValues ? renderHiddenValue() : formatCurrency(transaction.amount, currency)}
                        </div>
                        <div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">{t('common.edit')}</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="z-50">
                              {onEdit && (
                                <DropdownMenuItem onClick={() => onEdit(transaction)}>
                                  {t('common.edit')}
                                </DropdownMenuItem>
                              )}
                              {onDelete && (
                                <DropdownMenuItem 
                                  onClick={() => onDelete(transaction.id)}
                                  className="text-metacash-error"
                                >
                                  {t('common.delete')}
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs md:text-sm hidden md:table-cell">
                    <div className="truncate pr-2">
                      {transaction.description}
                    </div>
                  </TableCell>
                  <TableCell className={cn(
                    "text-right font-semibold text-xs md:text-sm hidden lg:table-cell",
                    transaction.type === 'income' ? 'text-metacash-success' : 'text-metacash-error'
                  )}>
                    {transaction.type === 'income' ? '+' : '-'}
                    {hideValues ? renderHiddenValue() : formatCurrency(transaction.amount, currency)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
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
                            onClick={() => onDelete(transaction.id)}
                            className="text-metacash-error"
                          >
                            {t('common.delete')}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </motion.tr>
              );
            })}
          </TableBody>
        </Table>
        </div>
      </div>

      {/* Desktop Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination>
            <PaginationContent>
              {currentPage > 1 && (
                <PaginationItem>
                  <PaginationPrevious 
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage(currentPage - 1);
                    }}
                  />
                </PaginationItem>
              )}
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    href="#"
                    isActive={page === currentPage}
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage(page);
                    }}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}
              
              {currentPage < totalPages && (
                <PaginationItem>
                  <PaginationNext 
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage(currentPage + 1);
                    }}
                  />
                </PaginationItem>
              )}
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
};

export default TransactionList;
