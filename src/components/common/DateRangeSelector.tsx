
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, RefreshCw } from 'lucide-react';
import { format, startOfDay, subDays, startOfMonth, startOfYear } from 'date-fns';
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
  const { t } = usePreferences();
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();

  const handleRangeTypeChange = (type: DateRangeType) => {
    const today = startOfDay(new Date());
    let newRange: DateRange;

    switch (type) {
      case 'today':
        newRange = {
          startDate: today,
          endDate: today,
          type: 'today'
        };
        break;
      case '7days':
        newRange = {
          startDate: subDays(today, 6),
          endDate: today,
          type: '7days'
        };
        break;
      case 'month':
        newRange = {
          startDate: startOfMonth(today),
          endDate: today,
          type: 'month'
        };
        break;
      case 'year':
        newRange = {
          startDate: startOfYear(today),
          endDate: today,
          type: 'year'
        };
        break;
      case 'custom':
        newRange = {
          startDate: customStartDate || today,
          endDate: customEndDate || today,
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
        endDate: customEndDate,
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

        <div className="text-sm font-medium text-muted-foreground">
          {getRangeLabel()}
        </div>
        
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

      {currentRange.type === 'custom' && (
        <div className="flex items-center gap-2">
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
    </div>
  );
};

export default DateRangeSelector;
