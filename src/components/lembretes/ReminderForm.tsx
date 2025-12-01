import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePreferences } from '@/contexts/PreferencesContext';
import { supabase } from '@/integrations/supabase/client';
import { createLembrete, updateLembrete, deleteLembrete } from '@/services/lembreteService';
import { useDateFormat } from '@/hooks/useDateFormat';
import { formatInTimeZone } from 'date-fns-tz';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ScheduledTransaction } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import AddedByFieldForm from '@/components/contas/AddedByFieldForm';
interface ReminderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: ScheduledTransaction | null;
  mode: 'create' | 'edit';
  onSuccess?: () => void;
  targetUserId?: string;
}
const ReminderForm: React.FC<ReminderFormProps> = ({
  open,
  onOpenChange,
  initialData,
  mode,
  onSuccess,
  targetUserId
}) => {
  const {
    t
  } = usePreferences();
  const {
    timezone
  } = useDateFormat();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isOnline] = useState(navigator.onLine);
  const [futureReminders, setFutureReminders] = useState<any[]>([]);
  const [pastReminders, setPastReminders] = useState<any[]>([]);
  const [editOption, setEditOption] = useState<'single' | 'future' | 'past' | 'all'>('single');

  // Schema for reminder form
  const formSchema = z.object({
    description: z.string().min(1, {
      message: t('validation.required')
    }),
    scheduledDate: z.string().min(1, {
      message: t('validation.required')
    }),
    recurrence: z.enum(['once', 'daily', 'weekly', 'monthly', 'yearly', 'parcela']),
    installments: z.number().min(1).max(360).optional(),
    name: z.string().min(1, 'Usuario é obrigatório'),
    phone: z.string().optional()
  });

  // Default form values
  const defaultValues = {
    description: '',
    scheduledDate: formatInTimeZone(new Date(), timezone, "yyyy-MM-dd'T'HH:mm"),
    recurrence: 'once' as const,
    installments: 1,
    name: '',
    phone: ''
  };
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues
  });

  // Check for related reminders
  const checkForRelatedReminders = async (codigoTrans: string, currentId: string, currentDate?: string) => {
    console.log('🔍 Checking for related reminders with codigo_trans:', codigoTrans);
    try {
      const {
        data,
        error
      } = await (supabase as any).from('tbl_lembrete').select('*').eq('codigo_trans', codigoTrans).neq('id', currentId).order('date', {
        ascending: true
      });
      if (error || !data || data.length === 0) {
        console.log('ℹ️ No related reminders found');
        setFutureReminders([]);
        setPastReminders([]);
        return;
      }

      // Separate past and future
      const current = new Date(currentDate || new Date());
      const future: any[] = [];
      const past: any[] = [];
      data.forEach((reminder: any) => {
        const reminderDate = new Date(reminder.date);
        if (reminderDate >= current) {
          future.push(reminder);
        } else {
          past.push(reminder);
        }
      });
      console.log('✅ Found:', {
        past: past.length,
        future: future.length
      });
      setFutureReminders(future);
      setPastReminders(past);
    } catch (err) {
      console.error('❌ Exception:', err);
      setFutureReminders([]);
      setPastReminders([]);
    }
  };

  // Reset form when opening/closing
  useEffect(() => {
    if (open && !initialData) {
      form.reset(defaultValues);
      setFutureReminders([]);
      setPastReminders([]);
      setEditOption('single');
    } else if (open && initialData) {
      console.log('📝 Editing reminder - Full initialData:', initialData);
      const dateValue = (initialData as any).scheduledDate || (initialData as any).date;
      let formattedDate = '';
      if (dateValue) {
        try {
          const date = new Date(dateValue);
          if (!isNaN(date.getTime())) {
            formattedDate = formatInTimeZone(date, timezone, "yyyy-MM-dd'T'HH:mm");
          }
        } catch (error) {
          console.error('Error parsing date:', error);
        }
      }
      form.reset({
        description: initialData.description || '',
        scheduledDate: formattedDate,
        recurrence: (initialData.recurrence || 'once') as any,
        installments: 1,
        name: (initialData as any).creatorName || (initialData as any).name || '',
        phone: (initialData as any).phone || ''
      });

      // Check for related reminders
      const codigoTrans = (initialData as any).codigo_trans || (initialData as any).reference_code;
      if (codigoTrans) {
        checkForRelatedReminders(codigoTrans, initialData.id, dateValue);
      } else {
        setFutureReminders([]);
        setPastReminders([]);
      }
    }
  }, [open, initialData]);

  // Form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    console.log('🚀 Reminder form submitted');
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      const userId = targetUserId || user?.id;
      const {
        data: userData
      } = await supabase.from('poupeja_users').select('phone').eq('id', userId).single();
      let userPhone = '';
      if (userData?.phone) {
        const rawPhone = userData.phone;
        userPhone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
      }
      if (mode === 'create') {
        const installments = values.installments || 1;
        if (values.recurrence === 'parcela' && installments > 1) {
          console.log(`📦 Creating ${installments} installments`);
          const baseDate = new Date(values.scheduledDate);
          const sharedCode = String(Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000));
          for (let i = 0; i < installments; i++) {
            const installmentDate = new Date(baseDate);
            installmentDate.setMonth(installmentDate.getMonth() + i);
            await createLembrete({
              user_id: userId,
              description: `${values.description} (${i + 1}/${installments})`,
              date: installmentDate.toISOString(),
              recurrence: 'once',
              reference_code: sharedCode,
              codigo_trans: sharedCode,
              situacao: 'ativo',
              status: 'pending',
              phone: values.phone || userPhone,
              name: values.name
            });
          }
        } else {
          const referenceCode = String(Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000));
          await createLembrete({
            user_id: userId,
            description: values.description,
            date: new Date(values.scheduledDate).toISOString(),
            recurrence: values.recurrence === 'parcela' ? 'once' : values.recurrence,
            reference_code: referenceCode,
            codigo_trans: referenceCode,
            situacao: 'ativo',
            status: 'pending',
            phone: values.phone || userPhone,
            name: values.name
          });
        }
      } else if (initialData) {
        console.log('✏️ Updating reminder');
        
        const newDate = new Date(values.scheduledDate);
        const originalDate = new Date(initialData.scheduledDate);
        
        // Check if only day changed (same month and year)
        const onlyDayChanged = newDate.getMonth() === originalDate.getMonth() && 
                               newDate.getFullYear() === originalDate.getFullYear() &&
                               newDate.getDate() !== originalDate.getDate();
        
        // Check if description was modified
        const descriptionChanged = initialData?.description !== values.description;
        
        const updateData: any = {
          date: newDate.toISOString(),
          recurrence: values.recurrence,
          phone: values.phone || userPhone,
          name: values.name,
          situacao: 'ativo',
          status: 'pending'
        };

        // Only include description if it was modified
        if (descriptionChanged) {
          updateData.description = values.description;
        }

        // Apply edit based on selected option
        if (editOption === 'single') {
          console.log('📋 Updating only current reminder');
          await updateLembrete(initialData.id, updateData);
        } else if (editOption === 'future') {
          console.log('📋 Updating current and future');
          await updateLembrete(initialData.id, updateData);
          
          for (const reminder of futureReminders) {
            let reminderUpdateData = { ...updateData };
            
            if (onlyDayChanged) {
              // Keep original month/year, only change day
              const reminderOriginalDate = new Date(reminder.date);
              reminderOriginalDate.setDate(newDate.getDate());
              reminderOriginalDate.setHours(newDate.getHours());
              reminderOriginalDate.setMinutes(newDate.getMinutes());
              reminderUpdateData.date = reminderOriginalDate.toISOString();
            }
            
            await updateLembrete(reminder.id, reminderUpdateData);
          }
        } else if (editOption === 'past') {
          console.log('📋 Updating current and past');
          await updateLembrete(initialData.id, updateData);
          
          for (const reminder of pastReminders) {
            let reminderUpdateData = { ...updateData };
            
            if (onlyDayChanged) {
              // Keep original month/year, only change day
              const reminderOriginalDate = new Date(reminder.date);
              reminderOriginalDate.setDate(newDate.getDate());
              reminderOriginalDate.setHours(newDate.getHours());
              reminderOriginalDate.setMinutes(newDate.getMinutes());
              reminderUpdateData.date = reminderOriginalDate.toISOString();
            }
            
            await updateLembrete(reminder.id, reminderUpdateData);
          }
        } else if (editOption === 'all') {
          console.log('📋 Updating all');
          await updateLembrete(initialData.id, updateData);
          
          for (const reminder of [...pastReminders, ...futureReminders]) {
            let reminderUpdateData = { ...updateData };
            
            if (onlyDayChanged) {
              // Keep original month/year, only change day
              const reminderOriginalDate = new Date(reminder.date);
              reminderOriginalDate.setDate(newDate.getDate());
              reminderOriginalDate.setHours(newDate.getHours());
              reminderOriginalDate.setMinutes(newDate.getMinutes());
              reminderUpdateData.date = reminderOriginalDate.toISOString();
            }
            
            await updateLembrete(reminder.id, reminderUpdateData);
          }
        }
      }
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('❌ Error:', error);
    }
  };
  const handleDelete = async () => {
    if (initialData) {
      await deleteLembrete(initialData.id);
      onOpenChange(false);
      setDeleteDialogOpen(false);
      if (onSuccess) onSuccess();
    }
  };
  return <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {mode === 'create' ? 'Agendar Lembrete' : 'Editar Lembrete'}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="description" render={({
              field
            }) => <FormItem>
                    <FormLabel>{t('common.description')}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Digite a descrição..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />

              <FormField control={form.control} name="scheduledDate" render={({
              field
            }) => <FormItem>
                    <FormLabel>Data e Hora do Lembrete</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <AddedByFieldForm form={form} />
                
                <FormField control={form.control} name="recurrence" render={({
                field
              }) => <FormItem>
                      <FormLabel>{t('schedule.recurrence')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="once">{t('schedule.once')}</SelectItem>
                          <SelectItem value="daily">{t('schedule.daily')}</SelectItem>
                          <SelectItem value="weekly">{t('schedule.weekly')}</SelectItem>
                          <SelectItem value="monthly">{t('schedule.monthly')}</SelectItem>
                          <SelectItem value="yearly">{t('schedule.yearly')}</SelectItem>
                          <SelectItem value="parcela">Parcela</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>} />
              </div>

              {form.watch('recurrence') as string === 'parcela' && <FormField control={form.control} name="installments" render={({
              field
            }) => <FormItem>
                      <FormLabel>Quantidade de Parcelas</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={360} placeholder="1" {...field} onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : 1)} />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Serão criadas múltiplas entradas mensais
                      </p>
                      <FormMessage />
                    </FormItem>} />}

              {/* Edit Options - Show only in edit mode when there are related reminders */}
              {mode === 'edit' && (futureReminders.length > 0 || pastReminders.length > 0) && <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
                  <div className="text-sm font-medium">
                    Parcelas Relacionadas Encontradas
                  </div>
                  <div className="text-xs text-muted-foreground mb-3">
                    Encontramos {pastReminders.length + futureReminders.length} lembrete(s) relacionado(s). 
                    Como você deseja aplicar as alterações?
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center space-x-2">
                      <input type="radio" id="edit-single" name="editOption" value="single" checked={editOption === 'single'} onChange={() => setEditOption('single')} className="h-4 w-4 text-primary focus:ring-primary border-gray-300" />
                      <label htmlFor="edit-single" className="text-sm cursor-pointer font-medium">
                        Aplicar edição apenas a este lembrete
                      </label>
                    </div>
                    
                    {futureReminders.length > 0 && <div className="flex items-center space-x-2">
                        <input type="radio" id="edit-future" name="editOption" value="future" checked={editOption === 'future'} onChange={() => setEditOption('future')} className="h-4 w-4 text-primary focus:ring-primary border-gray-300" />
                        <label htmlFor="edit-future" className="text-sm cursor-pointer font-medium">
                          Aplicar a todas as parcelas futuras ({futureReminders.length} futuras)
                        </label>
                      </div>}
                    
                    {pastReminders.length > 0 && <div className="flex items-center space-x-2">
                        <input type="radio" id="edit-past" name="editOption" value="past" checked={editOption === 'past'} onChange={() => setEditOption('past')} className="h-4 w-4 text-primary focus:ring-primary border-gray-300" />
                        <label htmlFor="edit-past" className="text-sm cursor-pointer font-medium">
                          Aplicar a todas as parcelas passadas ({pastReminders.length} passadas)
                        </label>
                      </div>}
                    
                    {(pastReminders.length > 0 || futureReminders.length > 0) && <div className="flex items-center space-x-2">
                        <input type="radio" id="edit-all" name="editOption" value="all" checked={editOption === 'all'} onChange={() => setEditOption('all')} className="h-4 w-4 text-primary focus:ring-primary border-gray-300" />
                        <label htmlFor="edit-all" className="text-sm cursor-pointer font-medium">
                          Aplicar a TODAS as parcelas ({pastReminders.length + futureReminders.length + 1} total)
                        </label>
                      </div>}
                  </div>
                </div>}

              <DialogFooter className="flex flex-col sm:flex-row gap-3 justify-between items-center">
                {mode === 'edit'}
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-initial min-w-20">
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" variant="default" size="sm" disabled={!isOnline} className="flex-1 sm:flex-initial min-w-20">
                    {mode === 'create' ? t('common.create') : t('common.update')}
                  </Button>
                </div>
              </DialogFooter>
              
              {!isOnline && <p className="text-xs text-muted-foreground text-right mt-2">
                  {t('schedule.editingRequiresConnection')}
                </p>}
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este lembrete?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>;
};
export default ReminderForm;