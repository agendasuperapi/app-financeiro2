
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, RefreshCw } from 'lucide-react';
import { format, addMonths, subMonths, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } from 'date-fns';
import { pt } from 'date-fns/locale';
import { usePreferences } from '@/contexts/PreferencesContext';
import { cn } from '@/lib/utils';

export type TimeRangeType = 'today' | '7days' | 'thisMonth' | 'thisYear' | 'custom' | 'month';

interface MonthNavigationProps {
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onTimeRangeChange?: (range: { start: Date; end: Date; type: TimeRangeType }) => void;
  onRefresh?: () => void;
}

const MonthNavigation: React.FC<MonthNavigationProps> = ({ 
  currentMonth, 
  onMonthChange,
  onTimeRangeChange,
  onRefresh
}) => {
  const { language } = usePreferences();
  const [timeRangeType, setTimeRangeType] = useState<TimeRangeType>('month');
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();
  
  // Always use Portuguese locale for month names as requested
  const formatLocale = pt;
  
  const handlePreviousMonth = () => {
    onMonthChange(subMonths(currentMonth, 1));
  };
  
  const handleNextMonth = () => {
    onMonthChange(addMonths(currentMonth, 1));
  };

  const handleTimeRangeSelect = (type: TimeRangeType) => {
    setTimeRangeType(type);
    
    if (!onTimeRangeChange) return;
    
    const today = new Date();
    let start: Date, end: Date;
    
    switch (type) {
      case 'today':
        start = startOfDay(today);
        end = endOfDay(today);
        break;
      case '7days':
        start = startOfDay(subDays(today, 6));
        end = endOfDay(today);
        break;
      case 'thisMonth':
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      case 'thisYear':
        start = startOfYear(today);
        end = endOfYear(today);
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          start = startOfDay(customStartDate);
          end = endOfDay(customEndDate);
        } else {
          return;
        }
        break;
      case 'month':
      default:
        start = startOfMonth(currentMonth);
        end = endOfMonth(currentMonth);
        break;
    }
    
    onTimeRangeChange({ start, end, type });
  };

  const handleCustomDateChange = () => {
    if (customStartDate && customEndDate && onTimeRangeChange) {
      onTimeRangeChange({
        start: startOfDay(customStartDate),
        end: endOfDay(customEndDate),
        type: 'custom'
      });
    }
  };

  return (
    <div className="flex items-center justify-center gap-4 py-2 flex-wrap">
      {/* Time Range Selector */}
      <Select value={timeRangeType} onValueChange={(value) => handleTimeRangeSelect(value as TimeRangeType)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Selecionar período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Hoje</SelectItem>
          <SelectItem value="7days">7 dias atrás</SelectItem>
          <SelectItem value="thisMonth">Este mês</SelectItem>
          <SelectItem value="thisYear">Este ano</SelectItem>
          <SelectItem value="month">Navegação mensal</SelectItem>
          <SelectItem value="custom">Período personalizado</SelectItem>
        </SelectContent>
      </Select>

      {/* Month Navigation (only show when month type is selected) */}
      {timeRangeType === 'month' && (
        <>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handlePreviousMonth}
            className="hover:bg-muted rounded-full h-10 w-10"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          
          <div className="text-xl font-medium capitalize min-w-[140px] text-center">
            {format(currentMonth, 'MMMM yyyy', { locale: formatLocale })}
          </div>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleNextMonth}
            className="hover:bg-muted rounded-full h-10 w-10"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </>
      )}

      {/* Custom Date Range Pickers */}
      {timeRangeType === 'custom' && (
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[140px] justify-start text-left font-normal",
                  !customStartDate && "text-muted-foreground"
                )}
                size="sm"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customStartDate ? format(customStartDate, 'dd/MM/yy') : 'Data início'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={customStartDate}
                onSelect={(date) => {
                  setCustomStartDate(date);
                  if (date && customEndDate) {
                    setTimeout(handleCustomDateChange, 100);
                  }
                }}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[140px] justify-start text-left font-normal",
                  !customEndDate && "text-muted-foreground"
                )}
                size="sm"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customEndDate ? format(customEndDate, 'dd/MM/yy') : 'Data fim'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={customEndDate}
                onSelect={(date) => {
                  setCustomEndDate(date);
                  if (customStartDate && date) {
                    setTimeout(handleCustomDateChange, 100);
                  }
                }}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Refresh Button */}
      {onRefresh && (
        <Button 
          variant="outline" 
          size="icon" 
          onClick={onRefresh}
          className="hover:bg-muted rounded-full h-10 w-10"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default MonthNavigation;
