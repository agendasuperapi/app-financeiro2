
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, File, Filter } from 'lucide-react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { ReportFormat } from '@/types';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';

interface ReportFiltersProps {
  reportType: string;
  setReportType: (type: string) => void;
  startDate: Date | undefined;
  setStartDate: (date: Date | undefined) => void;
  endDate: Date | undefined;
  setEndDate: (date: Date | undefined) => void;
  onDownload: (format: ReportFormat) => void;
}

const ReportFilters: React.FC<ReportFiltersProps> = ({
  reportType,
  setReportType,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  onDownload
}) => {
  const { t } = usePreferences();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const FiltersContent = () => (
    <>
      <div className="grid grid-cols-1 gap-4 mb-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium">{t('reports.reportType')}</label>
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('reports.selectReportType')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('reports.allTransactions')}</SelectItem>
              <SelectItem value="income">{t('reports.incomeOnly')}</SelectItem>
              <SelectItem value="expenses">{t('reports.expensesOnly')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium">{t('reports.startDate')}</label>
          <DatePicker date={startDate} setDate={setStartDate} />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium">{t('reports.endDate')}</label>
          <DatePicker date={endDate} setDate={setEndDate} />
        </div>
      </div>
      
      <div className="flex flex-col gap-2">
        <Button 
          variant="outline" 
          onClick={() => {
            onDownload('csv');
            if (isMobile) setOpen(false);
          }}
          className="flex items-center justify-center gap-2 w-full"
        >
          <FileText className="h-4 w-4" />
          {t('reports.downloadCSV')}
        </Button>
        <Button 
          onClick={() => {
            onDownload('pdf');
            if (isMobile) setOpen(false);
          }}
          className="flex items-center justify-center gap-2 w-full"
        >
          <File className="h-4 w-4" />
          {t('reports.downloadPDF')}
        </Button>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <div className="mb-4">
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>
            <Button variant="outline" className="w-full gap-2">
              <Filter className="h-4 w-4" />
              {t('reports.filters')}
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{t('reports.filters')}</DrawerTitle>
              <DrawerDescription>{t('reports.filtersDescription')}</DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-4">
              <FiltersContent />
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    );
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>{t('reports.filters')}</CardTitle>
        <CardDescription>{t('reports.filtersDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium">{t('reports.reportType')}</label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('reports.selectReportType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('reports.allTransactions')}</SelectItem>
                <SelectItem value="income">{t('reports.incomeOnly')}</SelectItem>
                <SelectItem value="expenses">{t('reports.expensesOnly')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium">{t('reports.startDate')}</label>
            <DatePicker date={startDate} setDate={setStartDate} />
          </div>
          <div className="space-y-2 sm:col-span-2 lg:col-span-1">
            <label className="block text-sm font-medium">{t('reports.endDate')}</label>
            <DatePicker date={endDate} setDate={setEndDate} />
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4">
          <Button 
            variant="outline" 
            onClick={() => onDownload('csv')}
            className="flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <FileText className="h-4 w-4" />
            {t('reports.downloadCSV')}
          </Button>
          <Button 
            onClick={() => onDownload('pdf')}
            className="flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <File className="h-4 w-4" />
            {t('reports.downloadPDF')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportFilters;
