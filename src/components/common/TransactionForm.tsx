
import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
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
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  open,
  onOpenChange,
  initialData,
  mode,
  defaultType = 'expense',
  targetUserId
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
  
  // Initialize form
  const { form, selectedType, handleTypeChange, onSubmit } = useTransactionForm({
    initialData: initialData || undefined,
    mode,
    targetUserId: selectedUser?.id || targetUserId,
    onComplete: async () => {
      console.log("TransactionForm: Transaction completed successfully");
      
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
        
        <AlertDialog open={bulkEditDialogOpen} onOpenChange={setBulkEditDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Editar Transações Relacionadas</AlertDialogTitle>
              <AlertDialogDescription>
                Encontramos {relatedTransactionInfo?.count} transações com o mesmo código.
                Deseja editar todas as transações futuras ou apenas esta?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setBulkEditDialogOpen(false);
                if (pendingFormValues?.resolve) {
                  pendingFormValues.resolve('single');
                }
              }}>
                Apenas Esta
              </AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                setBulkEditDialogOpen(false);
                if (pendingFormValues?.resolve) {
                  pendingFormValues.resolve('all');
                }
              }}>
                Todas Futuras
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
