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
import { Form } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
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
import ContaFormFields from '@/components/common/ContaFormFields';
import TransactionFormFields from '@/components/common/TransactionFormFields';
const CalendarPage: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reminders, setReminders] = useState<ScheduledTransaction[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editReminderDialogOpen, setEditReminderDialogOpen] = useState(false);
  const [editContaDialogOpen, setEditContaDialogOpen] = useState(false);
  const [editContaFormDialogOpen, setEditContaFormDialogOpen] = useState(false);
  const [editTransactionFormDialogOpen, setEditTransactionFormDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedReminder, setSelectedReminder] = useState<ScheduledTransaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const {
    toast
  } = useToast();

  // Form for ContaFormFields
  const contaForm = useForm({
    defaultValues: {
      type: 'expense',
      description: '',
      amount: 0,
      conta: '',
      addedBy: '',
      recurrence: 'once',
      category: '',
      scheduledDate: '',
      installments: 1
    }
  });

  // Form for TransactionFormFields
  const transactionForm = useForm({
    defaultValues: {
      type: 'expense',
      description: '',
      amount: 0,
      conta_id: '',
      addedBy: '',
      category: '',
      date: '',
      goalId: ''
    }
  });
  const handleEditTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);

    // Verificar o campo formato para abrir o diálogo correto
    const formato = (transaction as any).formato || 'transacao';
    if (formato === 'agenda') {
      // Abrir ContaFormFields quando formato for "agenda"
      contaForm.reset({
        type: transaction.type,
        description: transaction.description || '',
        amount: transaction.amount,
        conta: (transaction as any).conta || '',
        addedBy: (transaction as any).addedBy || '',
        recurrence: 'once',
        category: transaction.category,
        scheduledDate: transaction.date,
        installments: 1
      });
      setEditContaFormDialogOpen(true);
    } else if (formato === 'lembrete') {
      // Abrir formulário da aba "contas" (AddContaForm que usa ReminderForm para lembretes)
      setEditContaDialogOpen(true);
    } else if (formato === 'transacao') {
      // Abrir TransactionFormFields quando formato for "transacao"
      transactionForm.reset({
        type: transaction.type as 'income' | 'expense',
        description: transaction.description || '',
        amount: transaction.amount,
        conta_id: (transaction as any).conta_id || '',
        addedBy: (transaction as any).addedBy || '',
        category: (transaction as any).category_id || '',
        date: new Date(transaction.date).toISOString().split('T')[0],
        goalId: (transaction as any).goalId || ''
      });
      setEditTransactionFormDialogOpen(true);
    } else {
      // formato padrão - abrir formulário da aba "transactions"
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
          description: "Transação excluída com sucesso!"
        });
      } else if (selectedReminder) {
        await deleteScheduledTransaction(selectedReminder.id);
        toast({
          title: "Sucesso",
          description: "Lembrete excluído com sucesso!"
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
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };
  const handleTransactionSuccess = async () => {
    setEditDialogOpen(false);
    setEditReminderDialogOpen(false);
    setEditContaDialogOpen(false);
    setEditContaFormDialogOpen(false);
    setEditTransactionFormDialogOpen(false);
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
      const [transactionsData, scheduledData] = await Promise.all([getTransactions(), getScheduledTransactions()]);
      setTransactions(transactionsData);
      console.log('DEBUG Calendar: Scheduled data loaded:', scheduledData);
      console.log('DEBUG Calendar: First scheduled item:', scheduledData[0]);

      // Filtrar lembretes - incluir todas as transações agendadas com status pending
      // pois os lembretes estão salvos como transações normais mas com status pending
      const remindersList = scheduledData.filter(item => item.status === 'pending' || item.type === 'lembrete' || item.type === 'reminder');
      console.log('DEBUG Calendar: Filtered reminders:', remindersList);
      setReminders(remindersList);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helpers de data ignorando fuso para manter o "dia do ISO" original
  const getISODateKey = (iso?: string) => (iso ? iso.slice(0, 10) : ''); // yyyy-MM-dd do próprio ISO
  const getLocalDateKey = (d: Date) => format(d, 'yyyy-MM-dd'); // yyyy-MM-dd da célula do calendário

  // Agrupa todas as transações e lembretes do dia (evitando duplicatas) usando chaves de data
  const getAllItemsForDate = (date: Date) => {
    const targetKey = getLocalDateKey(date);
    const items = new Map<string, any>();

    // Transações normais
    for (const t of transactions) {
      if (getISODateKey(t.date) === targetKey) {
        items.set(t.id, { ...t, sourceType: 'transaction' });
      }
    }

    // Lembretes/agendados
    for (const r of reminders) {
      if (getISODateKey(r.scheduledDate) === targetKey && !items.has(r.id)) {
        items.set(r.id, { ...r, date: r.scheduledDate, sourceType: 'reminder' });
      }
    }

    return Array.from(items.values());
  };

  // Obtém todas as datas que têm transações/lembretes no mês atual (baseado na parte da data do ISO)
  const getDatesWithTransactions = () => {
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const keys = new Set<string>();
    transactions.forEach(t => keys.add(getISODateKey(t.date)));
    reminders.forEach(r => keys.add(getISODateKey(r.scheduledDate)));

    // Converter cada key (yyyy-MM-dd) para Date local correspondente e filtrar pelo mês atual
    const dates = Array.from(keys)
      .filter(k => !!k)
      .map(k => {
        const [y, m, d] = k.split('-').map(Number);
        return new Date(y, (m || 1) - 1, d || 1);
      })
      .filter(d => d >= startOfMonth && d <= endOfMonth);

    return dates;
  };
  const selectedDateItems = selectedDate ? getAllItemsForDate(selectedDate) : [];
  return <MainLayout>
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Calendário</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendário */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex flex-col gap-2 items-start">
                <span>Calendário de Transações</span>
                <MonthNavigation currentMonth={currentMonth} onMonthChange={setCurrentMonth} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} month={currentMonth} onMonthChange={setCurrentMonth} locale={ptBR} className="rounded-md border p-3 pointer-events-auto" classNames={{
                day: cn("h-12 w-12 p-0 font-normal aria-selected:opacity-100 relative cursor-pointer hover:bg-accent hover:text-accent-foreground"),
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                day_today: "bg-accent text-accent-foreground"
              }} modifiers={{
                hasTransactions: getDatesWithTransactions()
              }} modifiersClassNames={{
                hasTransactions: "font-semibold"
              }} components={{
                Day: (props) => {
                  const date = props.day.date;
                  const dayItems = getAllItemsForDate(date);
                  
                  // Contar por formato
                  const formatCounts = {
                    transacao: 0,
                    agenda: 0,
                    lembrete: 0
                  };
                  
                  dayItems.forEach(item => {
                    const formato = (item as any).formato || 
                                   (item.sourceType === 'reminder' || item.status === 'pending' ? 'lembrete' : 'transacao');
                    if (formato === 'transacao') formatCounts.transacao++;
                    else if (formato === 'agenda') formatCounts.agenda++;
                    else if (formato === 'lembrete') formatCounts.lembrete++;
                  });
                  
                  return <div {...props} className={cn("relative w-full h-full flex flex-col items-center justify-center rounded-md transition-colors cursor-pointer", "hover:bg-accent hover:text-accent-foreground", selectedDate && isSameDay(date, selectedDate) && "bg-primary text-primary-foreground", isSameDay(date, new Date()) && !selectedDate && "bg-accent text-accent-foreground")} onClick={() => setSelectedDate(date)}>
                          <span>{format(date, 'd')}</span>
                          {dayItems.length > 0 && <div className="absolute bottom-1 flex gap-1">
                              {formatCounts.transacao > 0 && <div className="w-1.5 h-1.5 bg-gray-900 dark:bg-gray-100 rounded-full" title="Transações" />}
                              {formatCounts.agenda > 0 && <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" title="Agendamentos" />}
                              {formatCounts.lembrete > 0 && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" title="Lembretes" />}
                            </div>}
                        </div>;
                }
              }} />
              </div>
              
              {/* Legenda - Formatos */}
              <div className="flex items-center justify-center gap-6 mt-4 text-sm flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-900 dark:bg-gray-100 rounded-full"></div>
                  <span>Transações</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span>Agendamentos</span>
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
                {selectedDate ? `Transações - ${format(selectedDate, 'dd/MM/yyyy', {
                locale: ptBR
              })}` : 'Selecione uma data'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDate ? <div className="space-y-2">
                  {selectedDateItems.length > 0 ? <>
                      {/* Todas as transações e lembretes do dia */}
                      {selectedDateItems.map(item => {
                  const isReminder = item.sourceType === 'reminder' || item.status === 'pending';
                  const formato = (item as any).formato || (isReminder ? 'lembrete' : 'transacao');
                  const itemDate = parseISO(item.date);
                  const hora = format(itemDate, 'HH:mm');

                  // Definir cor da bolinha e estilo baseado no formato
                  let bolinhaColor = 'bg-gray-900'; // Preta para "transacao"
                  let cardClassName = 'flex items-center justify-between p-2 border rounded-lg';
                  
                  if (formato === 'agenda') {
                    bolinhaColor = 'bg-purple-500'; // Roxa para "agenda"
                  } else if (formato === 'lembrete' || isReminder) {
                    bolinhaColor = 'bg-blue-500'; // Azul para "lembrete"
                    cardClassName = 'flex items-center justify-between p-2 border rounded-lg bg-blue-50 dark:bg-blue-950/20';
                  }
                  
                  return <div key={item.id} className={cardClassName}>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${bolinhaColor}`} />
                              <div>
                                <p className="text-sm font-medium">{item.description || item.category}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  {(formato === 'agenda' || formato === 'lembrete') && <span>{hora}</span>}
                                  {(formato === 'agenda' || formato === 'transacao') && item.amount && <span>
                                      {item.type === 'income' ? '+' : '-'}
                                      R$ {Math.abs(item.amount).toFixed(2)}
                                    </span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {isReminder && <Badge variant="outline" className="border-blue-500 text-blue-600 text-xs px-1.5 py-0">
                                Lembrete
                              </Badge>}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="text-xs">
                                  <DropdownMenuItem onClick={() => isReminder ? handleEditReminder(item) : handleEditTransaction(item)}>
                                    <Edit className="h-3 w-3 mr-1.5" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => isReminder ? handleDeleteReminder(item) : handleDeleteTransaction(item)} className="text-destructive">
                                    <Trash2 className="h-3 w-3 mr-1.5" />
                                    Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>;
                })}
                    </> : <p className="text-muted-foreground text-center">
                      Nenhuma transação ou lembrete nesta data
                    </p>}
                </div> : <p className="text-muted-foreground text-center">
                  Clique em uma data para ver as transações e lembretes
                </p>}
            </CardContent>
          </Card>
        </div>

        {/* Resumo do mês */}
        
      </div>

      {/* Dialogs */}
      {selectedTransaction && <TransactionForm open={editDialogOpen} onOpenChange={setEditDialogOpen} initialData={selectedTransaction} mode="edit" />}

      {selectedTransaction && editReminderDialogOpen && selectedReminder && <ScheduledTransactionForm open={editReminderDialogOpen} onOpenChange={setEditReminderDialogOpen} initialData={selectedReminder} mode="edit" onSuccess={handleTransactionSuccess} />}

      {selectedTransaction && editContaDialogOpen && <AddContaForm onSuccess={handleTransactionSuccess} onCancel={() => setEditContaDialogOpen(false)} initialData={selectedTransaction} mode="edit" />}

      {/* ContaFormFields Dialog for "agenda" format */}
      {selectedTransaction && editContaFormDialogOpen && <Dialog open={editContaFormDialogOpen} onOpenChange={setEditContaFormDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Editar Transação (Formato Agenda)</DialogTitle>
            </DialogHeader>
            <Form {...contaForm}>
              <form onSubmit={contaForm.handleSubmit(() => handleTransactionSuccess())}>
                <ContaFormFields form={contaForm} mode="edit" onCancel={() => setEditContaFormDialogOpen(false)} onSubmit={() => handleTransactionSuccess()} submitLabel="Atualizar" cancelLabel="Cancelar" />
              </form>
            </Form>
          </DialogContent>
        </Dialog>}

      {/* TransactionFormFields Dialog for "transacao" format */}
      {selectedTransaction && editTransactionFormDialogOpen && <Dialog open={editTransactionFormDialogOpen} onOpenChange={setEditTransactionFormDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Editar Transação</DialogTitle>
            </DialogHeader>
            <Form {...transactionForm}>
              <form onSubmit={transactionForm.handleSubmit(() => handleTransactionSuccess())}>
                <TransactionFormFields form={transactionForm} mode="edit" selectedType={transactionForm.watch('type') as 'income' | 'expense'} onCancel={() => setEditTransactionFormDialogOpen(false)} onSubmit={() => handleTransactionSuccess()} submitLabel="Atualizar" cancelLabel="Cancelar" />
              </form>
            </Form>
          </DialogContent>
        </Dialog>}

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
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>;
};
export default CalendarPage;