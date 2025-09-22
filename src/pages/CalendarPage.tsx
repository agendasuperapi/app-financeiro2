import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import MonthNavigation from '@/components/common/MonthNavigation';
import { Badge } from '@/components/ui/badge';
import { getTransactions } from '@/services/transactionService';
import { Transaction } from '@/types';
import { format, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DayPicker } from 'react-day-picker';

const CalendarPage: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const data = await getTransactions();
      setTransactions(data);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Agrupa transações por data
  const getTransactionsForDate = (date: Date) => {
    return transactions.filter(transaction => 
      isSameDay(parseISO(transaction.date), date)
    );
  };

  // Obtém todas as datas que têm transações no mês atual
  const getDatesWithTransactions = () => {
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    return transactions
      .filter(transaction => {
        const transactionDate = parseISO(transaction.date);
        return transactionDate >= startOfMonth && transactionDate <= endOfMonth;
      })
      .map(transaction => parseISO(transaction.date));
  };

  // Renderiza o conteúdo de cada dia no calendário
  const renderDay = (date: Date) => {
    const dayTransactions = getTransactionsForDate(date);
    const incomeCount = dayTransactions.filter(t => t.type === 'income').length;
    const expenseCount = dayTransactions.filter(t => t.type === 'expense').length;
    
    return (
      <div className="relative w-full h-full">
        <div className="text-center">
          {format(date, 'd')}
        </div>
        {dayTransactions.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 flex gap-1 justify-center">
            {incomeCount > 0 && (
              <div className="w-2 h-2 bg-green-500 rounded-full" title={`${incomeCount} receita(s)`} />
            )}
            {expenseCount > 0 && (
              <div className="w-2 h-2 bg-red-500 rounded-full" title={`${expenseCount} despesa(s)`} />
            )}
          </div>
        )}
      </div>
    );
  };

  const selectedDateTransactions = selectedDate ? getTransactionsForDate(selectedDate) : [];

  return (
    <MainLayout>
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Calendário</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendário */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Calendário de Transações</span>
                <MonthNavigation
                  currentMonth={currentMonth}
                  onMonthChange={setCurrentMonth}
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  locale={ptBR}
                  className="rounded-md border p-3 pointer-events-auto"
                  classNames={{
                    day: cn(
                      "h-12 w-12 p-0 font-normal aria-selected:opacity-100 relative"
                    ),
                    day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                    day_today: "bg-accent text-accent-foreground",
                  }}
                  components={{
                    Day: ({ date, displayMonth }) => {
                      const dayTransactions = getTransactionsForDate(date);
                      const incomeCount = dayTransactions.filter(t => t.type === 'income').length;
                      const expenseCount = dayTransactions.filter(t => t.type === 'expense').length;
                      
                      return (
                        <div className="relative w-full h-full flex flex-col items-center justify-center">
                          <span>{format(date, 'd')}</span>
                          {dayTransactions.length > 0 && (
                            <div className="absolute bottom-1 flex gap-1">
                              {incomeCount > 0 && (
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                              )}
                              {expenseCount > 0 && (
                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                              )}
                            </div>
                          )}
                        </div>
                      );
                    }
                  }}
                />
              </div>
              
              {/* Legenda */}
              <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Receitas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>Despesas</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transações do dia selecionado */}
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedDate
                  ? `Transações - ${format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })}`
                  : 'Selecione uma data'
                }
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDate ? (
                <div className="space-y-3">
                  {selectedDateTransactions.length > 0 ? (
                    selectedDateTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: transaction.categoryColor }}
                          />
                          <div>
                            <p className="font-medium">{transaction.category}</p>
                            {transaction.description && (
                              <p className="text-sm text-muted-foreground">
                                {transaction.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge
                          variant={transaction.type === 'income' ? 'default' : 'destructive'}
                        >
                          {transaction.type === 'income' ? '+' : '-'}
                          R$ {transaction.amount.toFixed(2)}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center">
                      Nenhuma transação nesta data
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-center">
                  Clique em uma data para ver as transações
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Resumo do mês */}
        <Card>
          <CardHeader>
            <CardTitle>
              Resumo de {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {transactions
                    .filter(t => {
                      const date = parseISO(t.date);
                      return date.getMonth() === currentMonth.getMonth() &&
                             date.getFullYear() === currentMonth.getFullYear() &&
                             t.type === 'income';
                    })
                    .length}
                </p>
                <p className="text-sm text-muted-foreground">Receitas</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <p className="text-2xl font-bold text-red-600">
                  {transactions
                    .filter(t => {
                      const date = parseISO(t.date);
                      return date.getMonth() === currentMonth.getMonth() &&
                             date.getFullYear() === currentMonth.getFullYear() &&
                             t.type === 'expense';
                    })
                    .length}
                </p>
                <p className="text-sm text-muted-foreground">Despesas</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <p className="text-2xl font-bold">
                  {transactions
                    .filter(t => {
                      const date = parseISO(t.date);
                      return date.getMonth() === currentMonth.getMonth() &&
                             date.getFullYear() === currentMonth.getFullYear();
                    })
                    .length}
                </p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default CalendarPage;