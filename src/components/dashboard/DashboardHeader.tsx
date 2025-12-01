
import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MonthNavigation from '@/components/common/MonthNavigation';
import { Eye, EyeOff, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePreferences } from '@/contexts/PreferencesContext';

interface DashboardHeaderProps {
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  hideValues: boolean;
  toggleHideValues: () => void;
  onAddTransaction: (type?: 'income' | 'expense') => void;
  creatorNames?: string[];
  selectedPerson?: string;
  onPersonChange?: (person: string) => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  currentMonth,
  onMonthChange,
  hideValues,
  toggleHideValues,
  onAddTransaction,
  creatorNames = [],
  selectedPerson = 'all',
  onPersonChange
}) => {
  const { t } = usePreferences();

  return (
    <motion.div 
      className="sticky top-0 md:top-0 z-40 bg-background border-b flex flex-col sm:flex-row justify-between items-center gap-4 p-4"
      style={{ top: 'max(0px, env(safe-area-inset-top))' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <MonthNavigation currentMonth={currentMonth} onMonthChange={onMonthChange} />
        {creatorNames.length > 0 && onPersonChange && (
          <Select value={selectedPerson} onValueChange={onPersonChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('charts.allPeople')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('charts.allPeople')}</SelectItem>
              {creatorNames.map(name => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleHideValues}
          className="flex items-center gap-2"
        >
          {hideValues ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {hideValues ? `${t('common.show')} ${t('common.values')}` : `${t('common.hide')} ${t('common.values')}`}
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={() => onAddTransaction('expense')}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          {t('transaction.addTransaction')}
        </Button>
      </div>
    </motion.div>
  );
};

export default DashboardHeader;
