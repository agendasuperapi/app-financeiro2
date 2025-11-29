import React, { useState } from 'react';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { Transaction } from '@/types';
import { usePreferences } from '@/contexts/PreferencesContext';
import TransactionCard from './TransactionCard';
import TransactionTable from './TransactionTable';
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
  const {
    t
  } = usePreferences();
  const isMobile = useIsMobile();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  // Show 10 transactions per page
  const itemsPerPage = 10;

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
    return <div className="text-center py-10">
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
      </div>;
  }

  // Mobile and tablet card layout
  if (isMobile) {
    return <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-1">
          {currentTransactions.map((transaction, index) => <TransactionCard key={transaction.id} transaction={transaction} onEdit={onEdit} onDelete={onDelete} hideValues={hideValues} index={index} />)}
        </div>
        
        {/* Mobile Pagination */}
        {totalPages > 1 && <div className="flex items-center justify-between mt-6 px-2">
            <div className="text-sm text-muted-foreground">
              {t('common.showing')} {startIndex + 1}-{Math.min(endIndex, transactions.length)} {t('common.of')} {transactions.length}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6"/>
                </svg>
              </Button>
              <span className="text-sm font-medium min-w-[60px] text-center">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6"/>
                </svg>
              </Button>
            </div>
          </div>}
      </div>;
  }
  return <div className="space-y-4">
      <TransactionTable transactions={currentTransactions} onEdit={onEdit} onDelete={onDelete} hideValues={hideValues} />

      {/* Desktop Pagination */}
      {totalPages > 1 && <div className="flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground">
            {t('common.showing')} {startIndex + 1}-{Math.min(endIndex, transactions.length)} {t('common.of')} {transactions.length}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6"/>
              </svg>
            </Button>
            <span className="text-sm font-medium min-w-[60px] text-center">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </Button>
          </div>
        </div>}
    </div>;
};
export default TransactionList;