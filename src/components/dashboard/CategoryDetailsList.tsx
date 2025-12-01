import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/utils/transactionUtils';
import { usePreferences } from '@/contexts/PreferencesContext';

interface CategoryDetail {
  category: string;
  amount: number;
  color: string;
  percentage: number;
}

interface CategoryDetailsListProps {
  categories: CategoryDetail[];
  hideValues?: boolean;
}

const CategoryDetailsList: React.FC<CategoryDetailsListProps> = ({ 
  categories, 
  hideValues = false 
}) => {
  const { currency } = usePreferences();

  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {categories.map((item, index) => (
        <div key={index} className="space-y-2">
          <div className="flex items-center justify-between">
            <Badge 
              style={{ 
                backgroundColor: item.color,
                color: '#fff',
                borderColor: item.color
              }}
              className="font-medium"
            >
              {item.category}
            </Badge>
            <span className="text-sm font-medium">
              {hideValues ? '******' : formatCurrency(item.amount, currency)} ({item.percentage.toFixed(1)}%)
            </span>
          </div>
          <Progress 
            value={item.percentage} 
            className="h-2"
            style={{
              // @ts-ignore - CSS custom property
              '--progress-color': item.color
            } as React.CSSProperties}
          />
        </div>
      ))}
    </div>
  );
};

export default CategoryDetailsList;
