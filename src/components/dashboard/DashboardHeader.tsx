import React from 'react';
import { Button } from '@/components/ui/button';
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
}
const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  currentMonth,
  onMonthChange,
  hideValues,
  toggleHideValues,
  onAddTransaction
}) => {
  const {
    t
  } = usePreferences();
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  return <motion.div style={{
    top: isMobile ? 'calc(3rem + env(safe-area-inset-top))' : '0'
  }} initial={{
    opacity: 0,
    y: 20
  }} animate={{
    opacity: 1,
    y: 0
  }} transition={{
    duration: 0.3
  }} className="fixed left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-b flex flex-col sm:flex-row justify-between items-center gap-4 p-4 md:relative md:top-0 py-[20px]">
      <MonthNavigation currentMonth={currentMonth} onMonthChange={onMonthChange} />
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={toggleHideValues} className="flex items-center gap-2">
          {hideValues ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {hideValues ? t('common.show') : t('common.hide')} {t('common.values')}
        </Button>
        <Button variant="default" size="sm" onClick={() => onAddTransaction('expense')} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          {t('transaction.addTransaction')}
        </Button>
      </div>
    </motion.div>;
};
export default DashboardHeader;