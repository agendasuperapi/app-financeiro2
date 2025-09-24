import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import MonthNavigation from '@/components/common/MonthNavigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getTransactions, deleteTransaction } from '@/services/transactionService';
import { getScheduledTransactions, deleteScheduledTransaction } from '@/services/scheduledTransactionService';
import { Transaction, ScheduledTransaction } from '@/types';
import { format, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Edit, Trash2, MoreVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import TransactionForm from '@/components/common/TransactionForm';
import ScheduledTransactionForm from '@/components/schedule/ScheduledTransactionForm';
import AddContaForm from '@/components/contas/AddContaForm';

const CalendarPage: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reminders, setReminders] = useState<ScheduledTransaction[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editReminderDialogOpen, setEditReminderDialogOpen] = useState(false);
  const [editContaDialogOpen, setEditContaDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedReminder, setSelectedReminder] = useState<ScheduledTransaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleEditTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    
    // Verificar o campo formato para abrir o diálogo correto
    const formato = (transaction as any).formato || 'transacao';
    
    if (formato === 'agenda') {
      // Abrir formulário da aba "contas"
      setEditContaDialogOpen(true);
    } else if (formato === 'lembrete') {
      // Abrir formulário da aba "lembrar"
      // Converter transaction para ScheduledTransaction
      const scheduledTransaction: ScheduledTransaction = {
        ...transaction,
        scheduledDate: transaction.date,
        type: transaction.type as any
      };
      setSelectedReminder(scheduledTransaction);
      setEditReminderDialogOpen(true);
    } else {
      // formato === 'transacao' - abrir formulário da aba "transactions"
      setEditDialogOpen(true);
    }
  };

  const handleDeleteTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setDeleteDialogOpen(true);
  };

  const handleEditReminder = (reminder: ScheduledTransaction) => {
    setSelectedReminder(reminder);
    setEditReminderDialogOpen(true);
  };

  const handleDeleteReminder = (reminder: ScheduledTransaction) => {
    setSelectedReminder(reminder);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedTransaction && !selectedReminder) return;
    
    setIsDeleting(true);
    try {
      if (selectedTransaction) {
        await deleteTransaction(selectedTransaction.id);
        toast({
          title: "Sucesso",
          description: "Transação excluída com sucesso!",
        });
      } else if (selectedReminder) {
        await deleteScheduledTransaction(selectedReminder.id);
        toast({
          title: "Sucesso",
          description: "Lembrete excluído com sucesso!",
        });
      }
      
      await loadData();
      setDeleteDialogOpen(false);
      setSelectedTransaction(null);
      setSelectedReminder(null);
    } catch (error) {
      console.error('Error deleting:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTransactionSuccess = async () => {
    setEditDialogOpen(false);
    setEditReminderDialogOpen(false);
    setEditContaDialogOpen(false);
    setSelectedTransaction(null);
    setSelectedReminder(null);
    await loadData();
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [transactionsData, scheduledData] = await Promise.all([
        getTransactions(),
        getScheduledTransactions()
      ]);
      
      setTransactions(transactionsData);
      
      console.log('DEBUG Calendar: Scheduled data loaded:', scheduledData);
      console.log('DEBUG Calendar: First scheduled item:', scheduledData[0]);
      
      // Filtrar lembretes - incluir todas as transações agendadas com status pending
      // pois os lembretes estão salvos como transações normais mas com status pending
      const remindersList = scheduledData.filter(item => 
        item.status === 'pending' || item.type === 'lembrete' || item.type === 'reminder'
      );
      
      console.log('DEBUG Calendar: Filtered reminders:', remindersList);
      setReminders(remindersList);
    } catch (error) {
      console.error('Error loading data:', error);
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

  // Agrupa lembretes por data
  const getRemindersForDate = (date: Date) => {
    return reminders.filter(reminder => 
      isSameDay(parseISO(reminder.scheduledDate), date)
    );
  };

  // Obtém todas as datas que têm transações no mês atual
  const getDatesWithTransactions = () => {
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    const transactionDates = transactions
      .filter(transaction => {
        const transactionDate = parseISO(transaction.date);
        return transactionDate >= startOfMonth && transactionDate <= endOfMonth;
      })
      .map(transaction => parseISO(transaction.date));

    const reminderDates = reminders
      .filter(reminder => {
        const reminderDate = parseISO(reminder.scheduledDate);
        return reminderDate >= startOfMonth && reminderDate <= endOfMonth;
      })
      .map(reminder => parseISO(reminder.scheduledDate));

    return [...transactionDates, ...reminderDates];
  };

  const selectedDateTransactions = selectedDate ? getTransactionsForDate(selectedDate) : [];
  const selectedDateReminders = selectedDate ? getRemindersForDate(selectedDate) : [];

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
                      "h-12 w-12 p-0 font-normal aria-selected:opacity-100 relative cursor-pointer hover:bg-accent hover:text-accent-foreground"
                    ),
                    day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                    day_today: "bg-accent text-accent-foreground",
                  }}
                  modifiers={{
                    hasTransactions: getDatesWithTransactions()
                  }}
                  modifiersClassNames={{
                    hasTransactions: "font-semibold"
                  }}
                  components={{
                    Day: ({ date, displayMonth, ...props }) => {
                      const dayTransactions = getTransactionsForDate(date);
                      const dayReminders = getRemindersForDate(date);
                      const incomeCount = dayTransactions.filter(t => t.type === 'income').length;
                      const expenseCount = dayTransactions.filter(t => t.type === 'expense').length;
                      const reminderCount = dayReminders.length;
                      
                      return (
                        <button
                          {...props}
                          className={cn(
                            "relative w-full h-full flex flex-col items-center justify-center rounded-md transition-colors",
                            "hover:bg-accent hover:text-accent-foreground",
                            selectedDate && isSameDay(date, selectedDate) && "bg-primary text-primary-foreground",
                            isSameDay(date, new Date()) && !selectedDate && "bg-accent text-accent-foreground"
                          )}
                          onClick={() => setSelectedDate(date)}
                        >
                          <span>{format(date, 'd')}</span>
                          {(dayTransactions.length > 0 || dayReminders.length > 0) && (
                            <div className="absolute bottom-1 flex gap-1">
                              {incomeCount > 0 && (
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                              )}
                              {expenseCount > 0 && (
                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                              )}
                              {reminderCount > 0 && (
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                              )}
                            </div>
                          )}
                        </button>
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
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Lembretes</span>
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
                  {(selectedDateTransactions.length > 0 || selectedDateReminders.length > 0) ? (
                    <>
                      {/* Transações */}
                      {selectedDateTransactions.map((transaction) => (
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
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={transaction.type === 'income' ? 'default' : 'destructive'}
                            >
                              {transaction.type === 'income' ? '+' : '-'}
                              R$ {transaction.amount.toFixed(2)}
                            </Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => handleEditTransaction(transaction)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteTransaction(transaction)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                      
                      {/* Lembretes */}
                      {selectedDateReminders.map((reminder) => (
                        <div
                          key={reminder.id}
                          className="flex items-center justify-between p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/20"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                            <div>
                              <p className="font-medium">{reminder.category}</p>
                              {reminder.description && (
                                <p className="text-sm text-muted-foreground">
                                  {reminder.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="border-blue-500 text-blue-600">
                              Lembrete
                            </Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => handleEditReminder(reminder)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteReminder(reminder)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <p className="text-muted-foreground text-center">
                      Nenhuma transação ou lembrete nesta data
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-center">
                  Clique em uma data para ver as transações e lembretes
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <p className="text-2xl font-bold text-blue-600">
                  {reminders
                    .filter(r => {
                      const date = parseISO(r.scheduledDate);
                      return date.getMonth() === currentMonth.getMonth() &&
                             date.getFullYear() === currentMonth.getFullYear();
                    })
                    .length}
                </p>
                <p className="text-sm text-muted-foreground">Lembretes</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <p className="text-2xl font-bold">
                  {transactions
                    .filter(t => {
                      const date = parseISO(t.date);
                      return date.getMonth() === currentMonth.getMonth() &&
                             date.getFullYear() === currentMonth.getFullYear();
                    })
                    .length + 
                  reminders
                    .filter(r => {
                      const date = parseISO(r.scheduledDate);
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

      {/* Dialogs */}
      {selectedTransaction && (
        <TransactionForm
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          initialData={selectedTransaction}
          mode="edit"
        />
      )}

      {selectedTransaction && editReminderDialogOpen && selectedReminder && (
        <ScheduledTransactionForm
          open={editReminderDialogOpen}
          onOpenChange={setEditReminderDialogOpen}
          initialData={selectedReminder}
          mode="edit"
          onSuccess={handleTransactionSuccess}
        />
      )}

      {selectedTransaction && editContaDialogOpen && (
        <AddContaForm
          onSuccess={handleTransactionSuccess}
          onCancel={() => setEditContaDialogOpen(false)}
          initialData={selectedTransaction}
          mode="edit"
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default CalendarPage;