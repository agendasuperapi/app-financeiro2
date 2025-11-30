
import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Transaction } from '@/types';
import { useAppContext } from '@/contexts/AppContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useTransactionForm } from '@/hooks/useTransactionForm';
import { checkRelatedTransactions, updateRelatedTransactions } from '@/services/transactionService';
import TransactionTypeSelector from './TransactionTypeSelector';
import AmountInput from './AmountInput';
import CategoryDateFields from './CategoryDateFields';
import DescriptionField from './DescriptionField';
import GoalSelector from './GoalSelector';
import ContaAddedByGrid from './ContaAddedByGrid';
import { useToast } from '@/hooks/use-toast';
import { useClientView } from '@/contexts/ClientViewContext';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Loader2 } from 'lucide-react';

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Transaction | null;
  mode: 'create' | 'edit';
  defaultType?: 'income' | 'expense';
  targetUserId?: string; // Para suportar criação para outros usuários
  editScope?: 'single' | 'future' | 'past' | 'all';
  relatedTransactionIds?: string[];
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  open,
  onOpenChange,
  initialData,
  mode,
  defaultType = 'expense',
  targetUserId,
  editScope = 'single',
  relatedTransactionIds = []
}) => {
  const { t } = usePreferences();
  const { setCustomDateRange, getTransactions, getGoals } = useAppContext();
  const { toast } = useToast();
  const { selectedUser } = useClientView();
  const [bulkEditDialogOpen, setBulkEditDialogOpen] = useState(false);
  const [relatedTransactionInfo, setRelatedTransactionInfo] = useState<{ count: number, codigoTrans?: string } | null>(null);
  const [pendingFormValues, setPendingFormValues] = useState<any>(null);
  const [comprovanteDialogOpen, setComprovanteDialogOpen] = useState(false);
  const [comprovanteUrl, setComprovanteUrl] = useState<string | null>(null);
  const [loadingComprovante, setLoadingComprovante] = useState(false);
  const [uploadingComprovante, setUploadingComprovante] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // States for edit scope dialog
  const [pastTransactions, setPastTransactions] = useState<any[]>([]);
  const [futureTransactions, setFutureTransactions] = useState<any[]>([]);
  const [editOption, setEditOption] = useState<'single' | 'future' | 'past' | 'all'>('single');
  const [editScopeDialogOpen, setEditScopeDialogOpen] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<any>(null);
  
  // Initialize form
  const { form, selectedType, handleTypeChange, onSubmit } = useTransactionForm({
    initialData: initialData || undefined,
    mode,
    targetUserId: selectedUser?.id || targetUserId,
    onComplete: async (transaction) => {
      console.log("TransactionForm: Transaction completed successfully", transaction);
      
      // Upload comprovante if file was selected in create mode
      if (mode === 'create' && selectedFile && transaction?.id) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Usuário não autenticado');

          // Get reference_code from the created transaction
          const { data: transactionData, error: transactionError } = await supabase
            .from('poupeja_transactions')
            .select('reference_code')
            .eq('id', transaction.id)
            .maybeSingle();

          if (transactionError) throw transactionError;
          const referenceCode = (transactionData as any)?.reference_code;
          if (!referenceCode) throw new Error('Código de referência não encontrado');

          // Upload to storage
          const fileExt = selectedFile.name.split('.').pop();
          const fileName = `${Date.now()}.${fileExt}`;
          const filePath = `${user.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('imagens_transacoes')
            .upload(filePath, selectedFile);

          if (uploadError) throw uploadError;

          // Insert into tbl_imagens
          const { error: insertError } = await supabase
            .from('tbl_imagens' as any)
            .insert({
              user_id: user.id,
              image_url: `imagens_transacoes/${filePath}`,
              reference_code: referenceCode
            });

          if (insertError) throw insertError;

          toast({
            title: 'Sucesso',
            description: 'Comprovante anexado com sucesso',
          });
        } catch (error) {
          console.error('Error uploading comprovante:', error);
          toast({
            title: 'Aviso',
            description: 'Transação salva, mas erro ao anexar comprovante',
            variant: 'destructive'
          });
        }
      }
      
      // Show success message
      toast({
        title: mode === 'create' ? t('transactions.added') : t('transactions.updated'),
        description: mode === 'create' ? t('transactions.addSuccess') : t('transactions.updateSuccess'),
      });
      
      // Close dialog
      onOpenChange(false);
      
      // Force a quick refresh of transactions data
      try {
        console.log("🔄 Forcing transaction refresh after form completion");
        await getTransactions();
        if (selectedType === 'income') {
          await getGoals(); // Refresh goals if income was added/updated
        }
      } catch (error) {
        console.error("Error refreshing data after transaction completion:", error);
      }
    },
    defaultType,
  });

  // Debug form state
  useEffect(() => {
    if (open) {
      console.log("Form state debug:", {
        errors: form.formState.errors,
        isValid: form.formState.isValid,
        values: form.getValues(),
        mode,
        initialData
      });
    }
  }, [open, form.formState.errors, form.formState.isValid]);

  // Function to upload comprovante
  const handleUploadComprovante = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !initialData?.id) return;

    setUploadingComprovante(true);
    try {
      // Get user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Get reference_code
      const { data: transactionData, error: transactionError } = await supabase
        .from('poupeja_transactions')
        .select('reference_code')
        .eq('id', initialData.id)
        .maybeSingle();

      if (transactionError) throw transactionError;
      const referenceCode = (transactionData as any)?.reference_code;
      if (!referenceCode) throw new Error('Código de referência não encontrado');

      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('imagens_transacoes')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Insert into tbl_imagens
      const { error: insertError } = await supabase
        .from('tbl_imagens' as any)
        .insert({
          user_id: user.id,
          image_url: `imagens_transacoes/${filePath}`,
          reference_code: referenceCode
        });

      if (insertError) throw insertError;

      toast({
        title: 'Sucesso',
        description: 'Comprovante anexado com sucesso',
      });

      // Refresh the comprovante
      await fetchComprovante();
    } catch (error) {
      console.error('Error uploading comprovante:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao anexar comprovante',
        variant: 'destructive'
      });
    } finally {
      setUploadingComprovante(false);
    }
  };

  // Function to check for related transactions
  const checkForRelatedTransactions = async (codigoTrans: string | number, currentId: string, currentDate?: string) => {
    try {
      const codeStr = String(codigoTrans).replace(/\D/g, '');
      console.log(`🔍 TransactionForm - Buscando codigo-trans: "${codeStr}"`);

      const targetUserIdValue = selectedUser?.id || (await supabase.auth.getUser())?.data?.user?.id;
      if (!targetUserIdValue || !codeStr) return { past: [], future: [] };

      const { data: allData, error } = await (supabase as any)
        .from('poupeja_transactions')
        .select('id, date, description, amount, "codigo-trans"')
        .eq('user_id', targetUserIdValue)
        .neq('id', currentId)
        .order('date', { ascending: true });

      if (error) return { past: [], future: [] };

      const rows = (allData || []).filter((item: any) => {
        const itemCodigo = String(item['codigo-trans'] || '').replace(/\D/g, '');
        return itemCodigo === codeStr;
      });

      const baseDate = currentDate ? new Date(currentDate) : new Date();
      const past = rows.filter((r: any) => new Date(r.date) < baseDate);
      const future = rows.filter((r: any) => new Date(r.date) >= baseDate);

      console.log(`✅ TransactionForm - Resultado: ${past.length} passadas, ${future.length} futuras`);
      return { past, future };
    } catch (error) {
      console.error('Erro ao buscar transações relacionadas:', error);
      return { past: [], future: [] };
    }
  };

  // Handler to intercept form submission
  const handleFormSubmit = async (values: any) => {
    // Se é criação, submeter diretamente
    if (mode === 'create') {
      return onSubmit(values);
    }
    
    // Se veio da página com editScope já definido, usar handleFinalSubmit
    if (editScope !== 'single' && relatedTransactionIds.length > 0) {
      return handleFinalSubmit(values);
    }
    
    // Se é edição, verificar transações relacionadas (apenas se não veio da página)
    if (initialData?.id) {
      const codigoTrans = (initialData as any)['codigo-trans'];
      
      if (codigoTrans) {
        const currentDate = initialData.date as string;
        const related = await checkForRelatedTransactions(codigoTrans, initialData.id, currentDate);
        
        setPastTransactions(related.past);
        setFutureTransactions(related.future);
        
        // Se há transações relacionadas, mostrar dialog
        if (related.past.length > 0 || related.future.length > 0) {
          setPendingSubmit(values);
          setEditOption('single');
          setEditScopeDialogOpen(true);
          return;
        }
      }
      
      // Se não há relacionadas, submeter diretamente
      return onSubmit(values);
    }
  };

  // Function to confirm and apply edit with scope
  const handleConfirmEdit = async () => {
    if (!pendingSubmit || !initialData) return;
    
    setEditScopeDialogOpen(false);
    
    try {
      // Primeiro, atualizar a transação principal
      await onSubmit(pendingSubmit);
      
      // Se escolheu apenas esta, já terminou
      if (editOption === 'single') return;
      
      // Determinar IDs para atualizar em massa
      let idsToUpdate: string[] = [];
      
      if (editOption === 'future') {
        idsToUpdate = futureTransactions.map(t => t.id);
      } else if (editOption === 'past') {
        idsToUpdate = pastTransactions.map(t => t.id);
      } else if (editOption === 'all') {
        idsToUpdate = [...pastTransactions.map(t => t.id), ...futureTransactions.map(t => t.id)];
      }
      
      // Atualizar transações relacionadas com os mesmos dados (exceto date)
      if (idsToUpdate.length > 0) {
        const updatePayload = {
          description: pendingSubmit.description,
          amount: pendingSubmit.type === 'expense' ? -Math.abs(pendingSubmit.amount) : Math.abs(pendingSubmit.amount),
          category_id: pendingSubmit.category,
          type: pendingSubmit.type,
          conta_id: pendingSubmit.conta_id,
          name: pendingSubmit.name || null,
        };
        
        const { error } = await (supabase as any)
          .from('poupeja_transactions')
          .update(updatePayload)
          .in('id', idsToUpdate);
        
        if (error) {
          console.error('Erro ao atualizar transações relacionadas:', error);
          toast({
            title: 'Aviso',
            description: `Transação principal atualizada, mas erro ao atualizar ${idsToUpdate.length} transações relacionadas`,
            variant: 'destructive'
          });
        } else {
          toast({
            title: 'Sucesso',
            description: `${idsToUpdate.length + 1} transações atualizadas com sucesso`,
          });
        }
        
        // Refresh transactions
        await getTransactions();
      }
    } catch (error) {
      console.error('Erro na edição em massa:', error);
    } finally {
      setPendingSubmit(null);
    }
  };

  // Handler final para aplicar edição em massa quando vem da página
  const handleFinalSubmit = async (values: any) => {
    // Aplicar edição normal
    await onSubmit(values);
    
    // Se tem editScope e IDs relacionados (veio da página com seleção prévia)
    if (mode === 'edit' && editScope !== 'single' && relatedTransactionIds.length > 0) {
      try {
        const updatePayload = {
          description: values.description,
          amount: values.type === 'expense' ? -Math.abs(values.amount) : Math.abs(values.amount),
          category_id: values.category,
          type: values.type,
          conta_id: values.conta_id,
          name: values.name || null,
        };
        
        const { error } = await (supabase as any)
          .from('poupeja_transactions')
          .update(updatePayload)
          .in('id', relatedTransactionIds);
        
        if (error) {
          console.error('Erro ao atualizar transações relacionadas:', error);
          toast({
            title: 'Aviso',
            description: `Transação principal atualizada, mas erro ao atualizar ${relatedTransactionIds.length} transações relacionadas`,
            variant: 'destructive'
          });
        } else {
          toast({
            title: 'Sucesso',
            description: `${relatedTransactionIds.length + 1} transações atualizadas com sucesso`,
          });
        }
        
        // Refresh transactions
        await getTransactions();
      } catch (error) {
        console.error('Erro na edição em massa:', error);
      }
    }
  };

  // Function to fetch comprovante
  const fetchComprovante = async () => {
    if (!initialData?.id) {
      toast({
        title: 'Erro',
        description: 'Transação inválida',
        variant: 'destructive'
      });
      return;
    }

    setLoadingComprovante(true);
    try {
      // First, get the reference_code from poupeja_transactions
      const { data: transactionData, error: transactionError } = await supabase
        .from('poupeja_transactions')
        .select('reference_code')
        .eq('id', initialData.id)
        .maybeSingle();

      if (transactionError) throw transactionError;

      const referenceCode = (transactionData as any)?.reference_code;

      if (!referenceCode) {
        setComprovanteUrl(null);
        setComprovanteDialogOpen(true);
        setLoadingComprovante(false);
        return;
      }

      // Now fetch the image from tbl_imagens using the reference_code
      const { data: imageData, error: imageError } = await supabase
        .from('tbl_imagens' as any)
        .select('image_url')
        .eq('reference_code', referenceCode)
        .maybeSingle();

      if (imageError) throw imageError;

      if ((imageData as any)?.image_url) {
        const rawUrl = String((imageData as any).image_url);
        // If already absolute URL or data URL, use directly
        if (/^(https?:)?\/\//.test(rawUrl) || rawUrl.startsWith('data:')) {
          setComprovanteUrl(rawUrl);
          setComprovanteDialogOpen(true);
        } else {
          // Expecting pattern: "<bucket>/<path/to/file>"
          const [bucket, ...rest] = rawUrl.split('/');
          const path = rest.join('/');
          try {
            // Prefer signed URL (works even if bucket is private)
            const { data: signed, error: signedError } = await (supabase.storage.from(bucket) as any).createSignedUrl(path, 60 * 10);
            if (!signedError && signed?.signedUrl) {
              setComprovanteUrl(signed.signedUrl);
              setComprovanteDialogOpen(true);
            } else {
              // Fallback to public URL if bucket is public
              const { data: pub } = (supabase.storage.from(bucket) as any).getPublicUrl(path);
              if (pub?.publicUrl) {
                setComprovanteUrl(pub.publicUrl);
                setComprovanteDialogOpen(true);
              } else {
                throw new Error('Não foi possível gerar URL do comprovante');
              }
            }
          } catch (e) {
            console.error('Erro ao gerar URL do comprovante:', e);
            setComprovanteUrl(null);
            setComprovanteDialogOpen(true);
          }
        }
      } else {
        // No image found, open dialog to allow upload
        setComprovanteUrl(null);
        setComprovanteDialogOpen(true);
      }
    } catch (error) {
      console.error('Error fetching comprovante:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao buscar comprovante',
        variant: 'destructive'
      });
    } finally {
      setLoadingComprovante(false);
    }
  };

  // Only render the form content when dialog is open to prevent unnecessary calculations
  if (!open) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
        <DialogHeader className="bg-background p-6 border-b">
          <DialogTitle className="text-xl">
            {mode === 'create' 
              ? selectedType === 'income' 
                ? t('transactions.addIncome') 
                : t('transactions.addExpense')
              : selectedType === 'income'
                ? t('transactions.editIncome')
                : t('transactions.editExpense')
            }
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-6 max-h-[calc(85vh-120px)] overflow-y-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
              <TransactionTypeSelector form={form} onTypeChange={handleTypeChange} />
              <DescriptionField form={form} />
              <AmountInput form={form} />
              <ContaAddedByGrid form={form} />
              <CategoryDateFields form={form} transactionType={selectedType} />
              
              {selectedType === 'income' && (
                <GoalSelector form={form} />
              )}

              {mode === 'edit' && initialData?.formato === 'transacao' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={fetchComprovante}
                  disabled={loadingComprovante}
                  className="w-full"
                >
                  {loadingComprovante ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Carregando...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Comprovante
                    </>
                  )}
                </Button>
              )}

              {mode === 'create' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Comprovante (opcional)</label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('new-comprovante-upload')?.click()}
                    className="w-full"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    {selectedFile ? selectedFile.name : 'Adicionar Comprovante'}
                  </Button>
                  <input
                    id="new-comprovante-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setSelectedFile(file);
                        toast({
                          title: 'Arquivo selecionado',
                          description: 'O comprovante será anexado após salvar a transação',
                        });
                      }
                    }}
                  />
                </div>
              )}

              <DialogFooter className="pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                >
                  {t('common.cancel')}
                </Button>
                <Button 
                  type="submit" 
                  className={selectedType === 'income' ? 'bg-green-600 hover:bg-green-700' : ''}
                  onClick={async (e) => {
                    console.log("Save button clicked");
                    console.log("Form state:", form.formState);
                    console.log("Form values:", form.getValues());
                    console.log("Form errors:", form.formState.errors);
                    
                    // Try manual validation
                    const isValid = await form.trigger();
                    console.log("Manual validation result:", isValid);
                    
                    if (!isValid) {
                      console.log("Form validation failed, preventing submit");
                      e.preventDefault();
                      return;
                    }
                    
                    console.log("Form is valid, proceeding with submit");
                  }}
                >
                  {mode === 'create' ? t('common.add') : t('common.save')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
        
        <AlertDialog open={editScopeDialogOpen} onOpenChange={setEditScopeDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Transações Relacionadas Encontradas</AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p className="text-sm">
                  Encontramos {pastTransactions.length + futureTransactions.length} transação(ões) relacionadas 
                  ({pastTransactions.length} passadas e {futureTransactions.length} futuras). 
                  Como você gostaria de proceder?
                </p>
                
                <RadioGroup value={editOption} onValueChange={(value: any) => setEditOption(value)} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="single" id="edit-single" />
                    <Label htmlFor="edit-single">Aplicar edição apenas a esta transação</Label>
                  </div>
                  
                  {futureTransactions.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="future" id="edit-future" />
                      <Label htmlFor="edit-future">Aplicar a todas as transações futuras ({futureTransactions.length} futuras)</Label>
                    </div>
                  )}
                  
                  {pastTransactions.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="past" id="edit-past" />
                      <Label htmlFor="edit-past">Aplicar a todas as transações passadas ({pastTransactions.length} passadas)</Label>
                    </div>
                  )}
                  
                  {pastTransactions.length > 0 && futureTransactions.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="all" id="edit-all" />
                      <Label htmlFor="edit-all">Aplicar a TODAS as transações ({pastTransactions.length + futureTransactions.length + 1} total)</Label>
                    </div>
                  )}
                </RadioGroup>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setEditScopeDialogOpen(false);
                setPendingSubmit(null);
              }}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmEdit}>
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={comprovanteDialogOpen} onOpenChange={setComprovanteDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Comprovante</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center p-4">
              {comprovanteUrl ? (
                <img 
                  src={comprovanteUrl} 
                  alt="Comprovante da transação" 
                  className="max-w-full max-h-[70vh] object-contain rounded-lg"
                />
              ) : (
                <div className="flex flex-col items-center gap-4 py-8">
                  <p className="text-muted-foreground">Nenhum comprovante anexado</p>
                  <Button 
                    variant="outline"
                    disabled={uploadingComprovante}
                    onClick={() => document.getElementById('comprovante-upload')?.click()}
                  >
                    {uploadingComprovante ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      'Adicionar Comprovante'
                    )}
                  </Button>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setComprovanteDialogOpen(false)}
              >
                Fechar
              </Button>
              {comprovanteUrl && (
                <>
                  <Button 
                    variant="outline"
                    disabled={uploadingComprovante}
                    onClick={() => document.getElementById('comprovante-upload')?.click()}
                  >
                    {uploadingComprovante ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      'Substituir'
                    )}
                  </Button>
                  <Button 
                    onClick={() => window.open(comprovanteUrl, '_blank')}
                  >
                    Abrir em Nova Aba
                  </Button>
                </>
              )}
              <input
                id="comprovante-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUploadComprovante}
              />
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionForm;
