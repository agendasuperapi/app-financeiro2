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
  targetUserId,
}) => {
  const { t } = usePreferences();
  const { timezone } = useDateFormat();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isOnline] = useState(navigator.onLine);

  // Schema for reminder form (specific for reminders)
  const formSchema = z.object({
    description: z.string().min(1, { message: t('validation.required') }),
    scheduledDate: z.string().min(1, { message: t('validation.required') }),
    recurrence: z.enum(['once', 'daily', 'weekly', 'monthly', 'yearly']),
    // Campos obrigatórios apenas do AddedByField
    name: z.string().min(1, 'Usuario é obrigatório'),
    phone: z.string().optional(),
  });

  // Default form values for reminders
  const defaultValues = {
    description: initialData?.description || '',
    scheduledDate: initialData?.scheduledDate 
      ? formatInTimeZone(new Date(initialData.scheduledDate), timezone, "yyyy-MM-dd'T'HH:mm")
      : (() => {
          const now = new Date();
          return formatInTimeZone(now, timezone, "yyyy-MM-dd'T'HH:mm");
        })(),
    recurrence: (initialData?.recurrence as 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly') || 'once',
    // Campos obrigatórios apenas do AddedByField
    name: initialData?.creatorName || '',
    phone: initialData?.phone || '',
  };

  // Form setup
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  // Reset form when opening/closing
  useEffect(() => {
    if (open && !initialData) {
      // Reset form to default values when creating new reminder
      form.reset(defaultValues);
    } else if (open && initialData) {
      // Populate form with initial data when editing
      const dateValue = (initialData as any).scheduledDate || (initialData as any).date;
      let formattedDate = '';
      
      if (dateValue) {
        try {
          const date = new Date(dateValue);
          if (!isNaN(date.getTime())) {
            formattedDate = formatInTimeZone(date, timezone, "yyyy-MM-dd'T'HH:mm");
          }
        } catch (error) {
          console.error('Error parsing date:', dateValue, error);
        }
      }
      
      form.reset({
        description: initialData.description || '',
        scheduledDate: formattedDate,
        recurrence: (initialData.recurrence || 'once') as 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly',
        name: (initialData as any).creatorName || (initialData as any).name || '',
        phone: (initialData as any).phone || '',
      });
    }
  }, [open, initialData, form]);

  // Form submission handler
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    console.log('🚀 Reminder form submitted with values:', values);
    
    try {
      if (mode === 'create') {
        console.log('➕ Creating reminder...');
        
        // Get user data for phone number - use targetUserId if provided (admin creating for client)
        const { data: { user } } = await supabase.auth.getUser();
        const userId = targetUserId || user?.id;
        const { data: userData } = await supabase
          .from('poupeja_users')
          .select('phone')
          .eq('id', userId)
          .single();
        
        // Add Brazilian country code 55 if not already present
        let userPhone = '';
        if (userData?.phone) {
          const rawPhone = userData.phone;
          userPhone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
        }
        
        const reminderData = {
          user_id: userId,
          description: values.description,
          date: new Date(values.scheduledDate).toISOString(),
          recurrence: values.recurrence,
          reference_code: String(Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000)),
          situacao: 'ativo',
          status: 'pending',
          phone: values.phone || userPhone,
          name: values.name,
          amount: 0,
        };
        
        console.log('📋 Creating reminder with data:', reminderData);
        const result = await createLembrete(reminderData);
        console.log('✅ Create request sent', result);
      } else if (initialData) {
        console.log('✏️ Updating reminder...', initialData.id);
        
        // Get user data for phone number - use targetUserId if provided (admin creating for client)
        const { data: { user } } = await supabase.auth.getUser();
        const userId = targetUserId || user?.id;
        const { data: userData } = await supabase
          .from('poupeja_users')
          .select('phone')
          .eq('id', userId)
          .single();
        
        // Add Brazilian country code 55 if not already present
        let userPhone = '';
        if (userData?.phone) {
          const rawPhone = userData.phone;
          userPhone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
        }
        
        const updateData = {
          description: values.description,
          date: new Date(values.scheduledDate).toISOString(),
          recurrence: values.recurrence,
          phone: values.phone || userPhone,
          name: values.name,
          situacao: 'ativo',
          status: 'pending',
        };
        
        console.log('📋 Updating reminder with ID:', initialData.id);
        console.log('📋 Update data:', updateData);
        const result = await updateLembrete(initialData.id, updateData);
        console.log('✅ Update request sent', result);
      }
      
      console.log('🎉 Closing dialog');
      onOpenChange(false);
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        console.log('🔄 Calling onSuccess callback');
        onSuccess();
      }
    } catch (error) {
      console.error('❌ Error in onSubmit:', error);
      // Don't close dialog on error, let user try again
    }
  };

  // Delete handler
  const handleDelete = async () => {
    if (initialData) {
      await deleteLembrete(initialData.id);
      onOpenChange(false);
      setDeleteDialogOpen(false);
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {mode === 'create' ? 'Agendar Lembrete' : 'Editar Lembrete'}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('common.description')}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Digite a descrição do lembrete..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="scheduledDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data e Hora do Lembrete</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <AddedByFieldForm form={form} />
                
                <FormField
                  control={form.control}
                  name="recurrence"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('schedule.recurrence')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('schedule.recurrence')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="once">{t('schedule.once')}</SelectItem>
                          <SelectItem value="daily">{t('schedule.daily')}</SelectItem>
                          <SelectItem value="weekly">{t('schedule.weekly')}</SelectItem>
                          <SelectItem value="monthly">{t('schedule.monthly')}</SelectItem>
                          <SelectItem value="yearly">{t('schedule.yearly')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="flex flex-col sm:flex-row gap-3 justify-between items-center">
                {mode === 'edit' && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteDialogOpen(true)}
                    disabled={!isOnline}
                    className="w-full sm:w-auto"
                  >
                    {t('common.delete')}
                  </Button>
                )}
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenChange(false)}
                    className="flex-1 sm:flex-initial min-w-20"
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button 
                    type="submit" 
                    variant="default"
                    size="sm"
                    disabled={!isOnline}
                    className="flex-1 sm:flex-initial min-w-20"
                  >
                    {mode === 'create' ? t('common.create') : t('common.update')}
                  </Button>
                </div>
              </DialogFooter>
              {!isOnline && (
                <p className="text-xs text-muted-foreground text-right mt-2">
                  {t('schedule.editingRequiresConnection')}
                </p>
              )}
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este lembrete? Esta ação não pode ser desfeita.
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
    </>
  );
};

export default ReminderForm;