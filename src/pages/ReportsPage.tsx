
import React, { useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import SubscriptionGuard from '@/components/subscription/SubscriptionGuard';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useClientAwareData } from '@/hooks/useClientAwareData';
import { ReportFormat } from '@/types';
import { useBrandingConfig } from '@/hooks/useBrandingConfig';
import { calculateTotalIncome, calculateTotalExpenses } from '@/utils/transactionUtils';
import { generateReportData, downloadCSV, downloadPDF } from '@/utils/reportUtils';
import ReportFilters from '@/components/reports/ReportFilters';
import ReportSummary from '@/components/reports/ReportSummary';
import TransactionsTable from '@/components/reports/TransactionsTable';
import { User } from 'lucide-react';

const ReportsPage = () => {
  const { t } = usePreferences();
  const { transactions, isClientView, selectedUser } = useClientAwareData();
  const { companyName } = useBrandingConfig();
  const [reportType, setReportType] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date(new Date().setDate(new Date().getDate() - 30))
  );
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());

  const handleDownload = (format: ReportFormat) => {
    // Generate the report data
    const reportData = generateReportData(transactions, reportType, startDate, endDate);
    
    if (format === 'csv') {
      downloadCSV(reportData);
    } else if (format === 'pdf') {
      downloadPDF(reportData, companyName);
    }
  };
  
  // Generate filtered transactions for display
  const filteredTransactions = generateReportData(transactions, reportType, startDate, endDate);
  
  // Calculate summary statistics
  const totalIncome = calculateTotalIncome(filteredTransactions);
  const totalExpenses = calculateTotalExpenses(filteredTransactions);
  const balance = totalIncome - totalExpenses;

  return (
    <MainLayout>
      <SubscriptionGuard feature="relatórios detalhados">
        <div className="w-full max-w-full px-4 py-6 lg:py-8 overflow-hidden">
          {/* Indicador de visualização de cliente */}
          {isClientView && selectedUser && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800">
                <User className="h-4 w-4" />
                <span className="font-medium">
                  Visualizando relatórios de: {selectedUser.name} ({selectedUser.email})
                </span>
              </div>
            </div>
          )}
          
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-6 lg:mb-8">{t('reports.title')}</h1>
          
          <ReportFilters 
            reportType={reportType}
            setReportType={setReportType}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            onDownload={handleDownload}
          />
          
          <ReportSummary 
            totalIncome={totalIncome}
            totalExpenses={totalExpenses}
            balance={balance}
          />
          
          <TransactionsTable transactions={filteredTransactions} />
        </div>
      </SubscriptionGuard>
    </MainLayout>
  );
};

export default ReportsPage;
