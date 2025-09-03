import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Filter, X } from 'lucide-react';
import { usePreferences } from '@/contexts/PreferencesContext';

interface LembretesFiltersProps {
  selectedRecurrence: string | null;
  selectedCategory: string | null;
  selectedStatus: string | null;
  onRecurrenceFilter: (recurrence: string | null) => void;
  onCategoryFilter: (category: string | null) => void;
  onStatusFilter: (status: string | null) => void;
  availableCategories: string[];
}

const LembretesFilters: React.FC<LembretesFiltersProps> = ({
  selectedRecurrence,
  selectedCategory,
  selectedStatus,
  onRecurrenceFilter,
  onCategoryFilter,
  onStatusFilter,
  availableCategories
}) => {
  const { t } = usePreferences();

  const recurrenceOptions = [
    { value: 'once', label: 'Uma vez' },
    { value: 'daily', label: 'Diário' },
    { value: 'weekly', label: 'Semanal' },
    { value: 'monthly', label: 'Mensal' },
    { value: 'yearly', label: 'Anual' }
  ];

  const statusOptions = [
    { value: 'pending', label: 'Pendente' },
    { value: 'paid', label: 'Concluído' },
    { value: 'overdue', label: 'Atrasado' }
  ];

  const clearAllFilters = () => {
    onRecurrenceFilter(null);
    onCategoryFilter(null);
    onStatusFilter(null);
  };

  const hasActiveFilters = selectedRecurrence || selectedCategory || selectedStatus;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3 mr-1" />
              Limpar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtro por Status */}
        <div>
          <h4 className="font-medium text-sm mb-2">Status</h4>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map(option => (
              <Button
                key={option.value}
                variant={selectedStatus === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => onStatusFilter(selectedStatus === option.value ? null : option.value)}
                className="text-xs h-7"
              >
                {option.label}
                {selectedStatus === option.value && (
                  <X className="ml-1 h-3 w-3" />
                )}
              </Button>
            ))}
          </div>
        </div>

        {/* Filtro por Recorrência */}
        <div>
          <h4 className="font-medium text-sm mb-2">Frequência</h4>
          <div className="flex flex-wrap gap-2">
            {recurrenceOptions.map(option => (
              <Button
                key={option.value}
                variant={selectedRecurrence === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => onRecurrenceFilter(selectedRecurrence === option.value ? null : option.value)}
                className="text-xs h-7"
              >
                {option.label}
                {selectedRecurrence === option.value && (
                  <X className="ml-1 h-3 w-3" />
                )}
              </Button>
            ))}
          </div>
        </div>

        {/* Filtro por Categoria */}
        {availableCategories.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2">Categoria</h4>
            <div className="flex flex-wrap gap-2">
              {availableCategories.map(category => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => onCategoryFilter(selectedCategory === category ? null : category)}
                  className="text-xs h-7"
                >
                  {category}
                  {selectedCategory === category && (
                    <X className="ml-1 h-3 w-3" />
                  )}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Resumo dos filtros ativos */}
        {hasActiveFilters && (
          <div className="pt-2 border-t">
            <div className="flex flex-wrap gap-1">
              {selectedStatus && (
                <Badge variant="secondary" className="text-xs">
                  Status: {statusOptions.find(s => s.value === selectedStatus)?.label}
                </Badge>
              )}
              {selectedRecurrence && (
                <Badge variant="secondary" className="text-xs">
                  Frequência: {recurrenceOptions.find(r => r.value === selectedRecurrence)?.label}
                </Badge>
              )}
              {selectedCategory && (
                <Badge variant="secondary" className="text-xs">
                  Categoria: {selectedCategory}
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LembretesFilters;