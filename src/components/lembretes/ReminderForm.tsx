import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePreferences } from '@/contexts/PreferencesContext';
import { supabase } from '@/integrations/supabase/client';
import { addScheduledTransaction, updateScheduledTransaction, deleteScheduledTransaction } from '@/services/scheduledTransactionService';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ScheduledTransaction } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { getDependentUsers, checkIfUserIsDependent, DependentUser } from '@/services/dependentViewService';

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isOnline] = useState(navigator.onLine);
  // States para o seletor de pessoa
  const [dependentUsers, setDependentUsers] = useState<DependentUser[]>([]);
  const [isDependent, setIsDependent] = useState(false);
  const [checkingDependent, setCheckingDependent] = useState(true);

  // Schema for reminder form (specific for reminders)
  const formSchema = z.object({
    description: z.string().min(1, { message: t('validation.required') }),
    scheduledDate: z.string().min(1, { message: t('validation.required') }),
    recurrence: z.enum(['once', 'daily', 'weekly', 'monthly', 'yearly']),
    dependentName: z.string().optional(),
  });

  // Default form values for reminders
  const defaultValues = {
    description: initialData?.description || '',
    scheduledDate: initialData?.scheduledDate 
      ? new Date(initialData.scheduledDate).toISOString().slice(0, 16)
      : (() => {
          const now = new Date();
          now.setHours(now.getHours() + 1, 0, 0, 0);
          return now.toISOString().slice(0, 16);
        })(),
    recurrence: (initialData?.recurrence as 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly') || 'once',
    dependentName: initialData?.dependent_name || '',
  };

  // Form setup
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  // Load dependent users and check if user is dependent
  useEffect(() => {
    const loadDependentData = async () => {
      setCheckingDependent(true);
      
      try {
        // Check if current user is dependent
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const isDep = await checkIfUserIsDependent(user.id);
          setIsDependent(isDep);
          
          if (isDep) {
            // Load dependent users for selection
            const users = await getDependentUsers();
            setDependentUsers(users);
          }
        }
      } catch (error) {
        console.error('Error loading dependent data:', error);
        setDependentUsers([]);
      } finally {
        setCheckingDependent(false);
      }
    };

    loadDependentData();
  }, []);

  // Reset form when opening/closing
  useEffect(() => {
    if (open && !initialData) {
      // Reset form to default values when creating new reminder
      form.reset(defaultValues);
    } else if (open && initialData) {
      // Populate form with initial data when editing
      form.reset({
        description: initialData.description,
        scheduledDate: new Date(initialData.scheduledDate).toISOString().slice(0, 16),
        recurrence: (initialData.recurrence || 'once') as 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly',
        dependentName: initialData.dependent_name || '',
      });
    }
  }, [open, initialData, form]);

  const handleDependentChange = (selectedName: string) => {
    const selectedUser = dependentUsers.find(user => user.name === selectedName);
    if (selectedUser) {
      form.setValue('dependentName', selectedUser.name);
    }
  };

  // Form submission handler
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    console.log('🚀 Reminder form submitted with values:', values);
    
    // For reminders, always set type to 'lembrete' and amount to 0
    const submitData = {
      type: 'lembrete' as const,
      description: values.description,
      amount: 0, // Reminders always have 0 amount
      category: 'Lembretes', // Default category for reminders
      category_id: null, // No category_id for reminders
      scheduledDate: new Date(values.scheduledDate).toISOString(),
      recurrence: values.recurrence,
      goalId: null, // No goal for reminders
    };
    
    try {
      if (mode === 'create') {
        console.log('➕ Creating reminder...');
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        // Determine phone number based on selected person
        let phoneToUse = '';
        
        if (values.dependentName && isDependent) {
          // If a dependent is selected, use their phone number
          const selectedUser = dependentUsers.find(user => user.name === values.dependentName);
          if (selectedUser?.phone) {
            const rawPhone = selectedUser.phone;
            phoneToUse = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
          }
        } else {
          // Otherwise, use current user's phone number
          const userId = targetUserId || user?.id;
          const { data: userData } = await supabase
            .from('poupeja_users')
            .select('phone')
            .eq('id', userId)
            .single();
          
          if (userData?.phone) {
            const rawPhone = userData.phone;
            phoneToUse = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
          }
        }
        
        const reminderData = {
          ...submitData,
          reference_code: Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000),
          situacao: 'ativo',
          phone: phoneToUse,
          user_id: targetUserId || user?.id,
          dependent_name: values.dependentName || '',
        };
        
        console.log('📋 Creating reminder with data:', reminderData);
        const result = await addScheduledTransaction(reminderData);
        console.log('✅ Create request sent', result);
      } else if (initialData) {
        console.log('✏️ Updating reminder...', initialData.id);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        // Determine phone number based on selected person
        let phoneToUse = '';
        
        if (values.dependentName && isDependent) {
          // If a dependent is selected, use their phone number
          const selectedUser = dependentUsers.find(user => user.name === values.dependentName);
          if (selectedUser?.phone) {
            const rawPhone = selectedUser.phone;
            phoneToUse = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
          }
        } else {
          // Otherwise, use current user's phone number
          const userId = targetUserId || user?.id;
          const { data: userData } = await supabase
            .from('poupeja_users')
            .select('phone')
            .eq('id', userId)
            .single();
          
          if (userData?.phone) {
            const rawPhone = userData.phone;
            phoneToUse = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
          }
        }
        
        const updateData = {
          ...submitData,
          reference_code: initialData?.reference_code || Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000),
          situacao: 'ativo',
          phone: phoneToUse,
          user_id: targetUserId || user?.id,
          dependent_name: values.dependentName || '',
        };
        
        console.log('📋 Updating reminder with ID:', initialData.id);
        console.log('📋 Update data:', updateData);
        const result = await updateScheduledTransaction({ ...updateData, id: initialData.id });
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
      await deleteScheduledTransaction(initialData.id);
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

              {/* Campo Selecionar Pessoa - only show if user is dependent */}
              {isDependent && (
                <FormField
                  control={form.control}
                  name="dependentName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Selecionar Pessoa</FormLabel>
                      <Select 
                        onValueChange={handleDependentChange}
                        value={field.value}
                        disabled={checkingDependent || dependentUsers.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma pessoa..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {dependentUsers.map((user) => (
                            <SelectItem key={user.name} value={user.name}>
                              {user.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

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