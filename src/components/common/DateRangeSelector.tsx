
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfDay, subDays, startOfMonth, startOfYear, addMonths, subMonths } from 'date-fns';
import { pt } from 'date-fns/locale';
import { usePreferences } from '@/contexts/PreferencesContext';
import { cn } from '@/lib/utils';

export type DateRangeType = 'today' | '7days' | 'month' | 'year' | 'custom';

export interface DateRange {
  startDate: Date;
  endDate: Date;
  type: DateRangeType;
}

interface DateRangeSelectorProps {
  currentRange: DateRange;
  onRangeChange: (range: DateRange) => void;
  onRefresh?: () => void;
}

const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({ 
  currentRange, 
  onRangeChange,
  onRefresh
}) => {
  const { t, timezone } = usePreferences();
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();

  // Helper function to get current date in user's timezone
  const getTodayInTimezone = () => {
    const now = new Date();
    // Create a date in the user's timezone by adjusting for timezone offset
    const timezoneOffsets: Record<string, number> = {
      'America/Sao_Paulo': -3,
      'America/New_York': -5,
      'Europe/London': 0,
      'Europe/Paris': 1,
      'Asia/Tokyo': 9,
      'Australia/Sydney': 11,
      'America/Los_Angeles': -8,
      'America/Chicago': -6,
      'Europe/Berlin': 1,
      'Asia/Shanghai': 8,
    };
    
    const offsetHours = timezoneOffsets[timezone] || -3;
    const utcMs = now.getTime();
    const timezoneDate = new Date(utcMs + (offsetHours * 3600000));
    const todayInTimezone = startOfDay(timezoneDate);
    
    console.log('DateRangeSelector - getTodayInTimezone:', {
      timezone,
      now: now.toISOString(),
      offsetHours,
      timezoneDate: timezoneDate.toISOString(),
      todayInTimezone: todayInTimezone.toISOString(),
      todayFormatted: format(todayInTimezone, 'dd/MM/yyyy')
    });
    
    return todayInTimezone;
  };

  const handleRangeTypeChange = (type: DateRangeType) => {
    const today = getTodayInTimezone();
    let newRange: DateRange;

    switch (type) {
      case 'today':
        newRange = {
          startDate: today,
          endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59),
          type: 'today'
        };
        console.log('DateRangeSelector - "today" selected:', {
          startDate: newRange.startDate.toISOString(),
          endDate: newRange.endDate.toISOString(),
          startDateFormatted: format(newRange.startDate, 'dd/MM/yyyy'),
          endDateFormatted: format(newRange.endDate, 'dd/MM/yyyy')
        });
        break;
      case '7days':
        newRange = {
          startDate: subDays(today, 6),
          endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59),
          type: '7days'
        };
        break;
      case 'month':
        const monthStart = startOfMonth(today);
        newRange = {
          startDate: monthStart,
          endDate: new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59),
          type: 'month'
        };
        break;
      case 'year':
        const yearStart = startOfYear(today);
        newRange = {
          startDate: yearStart,
          endDate: new Date(today.getFullYear(), 11, 31, 23, 59, 59),
          type: 'year'
        };
        break;
      case 'custom':
        newRange = {
          startDate: customStartDate || today,
          endDate: customEndDate ? new Date(customEndDate.getFullYear(), customEndDate.getMonth(), customEndDate.getDate(), 23, 59, 59) : new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59),
          type: 'custom'
        };
        break;
      default:
        return;
    }

    onRangeChange(newRange);
  };

  const handleCustomDateChange = () => {
    if (customStartDate && customEndDate) {
      onRangeChange({
        startDate: customStartDate,
        endDate: new Date(customEndDate.getFullYear(), customEndDate.getMonth(), customEndDate.getDate(), 23, 59, 59),
        type: 'custom'
      });
    }
  };

  const getRangeLabel = () => {
    const { startDate, endDate, type } = currentRange;
    
    if (type === 'custom') {
      return `${format(startDate, 'dd/MM/yyyy')} - ${format(endDate, 'dd/MM/yyyy')}`;
    }
    
    switch (type) {
      case 'today':
        return 'Hoje';
      case '7days':
        return 'Últimos 7 dias';
      case 'month':
        return format(startDate, 'MMMM yyyy', { locale: pt });
      case 'year':
        return format(startDate, 'yyyy');
      default:
        return '';
    }
  };

  const handlePreviousMonth = () => {
    if (currentRange.type === 'month') {
      const previousMonth = subMonths(currentRange.startDate, 1);
      onRangeChange({
        startDate: startOfMonth(previousMonth),
        endDate: new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0),
        type: 'month'
      });
    }
  };

  const handleNextMonth = () => {
    if (currentRange.type === 'month') {
      const nextMonth = addMonths(currentRange.startDate, 1);
      onRangeChange({
        startDate: startOfMonth(nextMonth),
        endDate: new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0),
        type: 'month'
      });
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="flex items-center gap-2">
        <Select value={currentRange.type} onValueChange={handleRangeTypeChange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="7days">7 dias atrás</SelectItem>
            <SelectItem value="month">Mês</SelectItem>
            <SelectItem value="year">Ano</SelectItem>
            <SelectItem value="custom">Escolher Período</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          {currentRange.type === 'month' && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePreviousMonth}
                className="h-6 w-6"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </>
          )}
          
          {(currentRange.type === 'month' || currentRange.type === 'year') && (
            <div className="text-sm font-medium text-muted-foreground">
              {getRangeLabel()}
            </div>
          )}
          
          {currentRange.type === 'month' && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextMonth}
                className="h-6 w-6"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {currentRange.type === 'custom' && (
        <div className="flex flex-col items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "justify-start text-left font-normal",
                  !customStartDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customStartDate ? format(customStartDate, "dd/MM/yyyy") : "Data inicial"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customStartDate}
                onSelect={(date) => {
                  setCustomStartDate(date);
                  if (date && customEndDate) {
                    handleCustomDateChange();
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
                size="sm"
                className={cn(
                  "justify-start text-left font-normal",
                  !customEndDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customEndDate ? format(customEndDate, "dd/MM/yyyy") : "Data final"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customEndDate}
                onSelect={(date) => {
                  setCustomEndDate(date);
                  if (customStartDate && date) {
                    handleCustomDateChange();
                  }
                }}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
      
      {onRefresh && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          className="h-8 w-8"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default DateRangeSelector;
