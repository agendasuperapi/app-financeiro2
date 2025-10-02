import React, { useState, useEffect } from 'react';
import SubscriptionGuard from '@/components/subscription/SubscriptionGuard';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit, MoreVertical, User } from 'lucide-react';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useClientAwareData } from '@/hooks/useClientAwareData';
import { getContas, addConta, updateConta, deleteConta, Conta } from '@/services/contasService';
import { useToast } from "@/hooks/use-toast";
import ContaForm from './ContaForm';
import CategoryIcon from '@/components/categories/CategoryIcon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ContasTab: React.FC = () => {
  const { t } = usePreferences();
  const { toast } = useToast();
  const [contas, setContas] = useState<Conta[]>([]);
  const [contaFormOpen, setContaFormOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<Conta | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contaToDelete, setContaToDelete] = useState<Conta | null>(null);
  const [loading, setLoading] = useState(false);

  const { isClientView, selectedUser, targetUserId } = useClientAwareData();

  useEffect(() => {
    const loadContas = async () => {
      setLoading(true);
      try {
        const loadedContas = await getContas();
        setContas(loadedContas);
      } catch (error) {
        console.error('Error loading contas:', error);
        toast({
          title: t('common.error'),
          description: 'Erro ao carregar contas',
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadContas();
  }, [targetUserId, toast, t]);

  const handleAddConta = () => {
    setEditingConta(null);
    setContaFormOpen(true);
  };

  const handleEditConta = (conta: Conta) => {
    setEditingConta(conta);
    setContaFormOpen(true);
  };

  const handleDeleteConta = (conta: Conta) => {
    setContaToDelete(conta);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteConta = async () => {
    if (contaToDelete) {
      try {
        const success = await deleteConta(contaToDelete.id);
        if (success) {
          const updatedContas = await getContas();
          setContas(updatedContas);
          toast({
            title: 'Conta deletada',
            description: `${contaToDelete.name} foi deletada com sucesso.`,
          });
        } else {
          toast({
            title: t('common.error'),
            description: 'Erro ao deletar conta',
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error deleting conta:', error);
        toast({
          title: t('common.error'),
          description: t('common.somethingWentWrong'),
          variant: "destructive",
        });
      } finally {
        setDeleteDialogOpen(false);
        setContaToDelete(null);
      }
    }
  };

  const handleSaveConta = async (conta: Omit<Conta, 'id' | 'user_id'> | Conta) => {
    try {
      if ('id' in conta) {
        const updatedConta = await updateConta(conta as Conta);
        if (updatedConta) {
          toast({
            title: "Conta atualizada",
            description: `A conta ${conta.name} foi atualizada com sucesso.`,
          });
        }
      } else {
        const newConta = await addConta(conta);
        if (newConta) {
          toast({
            title: "Conta adicionada",
            description: `A conta ${conta.name} foi adicionada com sucesso.`,
          });
        }
      }
      
      const updatedContas = await getContas();
      setContas(updatedContas);
      setContaFormOpen(false);
    } catch (error) {
      console.error('Error saving conta:', error);
      toast({
        title: t('common.error'),
        description: t('common.somethingWentWrong'),
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <SubscriptionGuard feature="contas personalizadas">
      <div className="space-y-4">
        {isClientView && selectedUser && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800">
              <User className="h-4 w-4" />
              <span className="font-medium">
                Visualizando contas de: {selectedUser.name} ({selectedUser.email})
              </span>
            </div>
          </div>
        )}
        
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Contas</h3>
          <Button onClick={handleAddConta}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Conta
          </Button>
        </div>
        
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Observação:</strong> Não é possível editar ou apagar a conta "Geral"
          </p>
        </div>
        
        <ul className="space-y-2">
          {contas.map((conta) => {
            const isDefaultConta = !conta.user_id || conta.isDefault;
            
            return (
              <li 
                key={conta.id} 
                className="bg-card p-3 rounded-lg flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <CategoryIcon 
                    icon={conta.icon} 
                    color={conta.color} 
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{conta.name}</span>
                    {conta.descricao && (
                      <span className="text-sm text-muted-foreground">{conta.descricao}</span>
                    )}
                  </div>
                </div>
                <div>
                  {isDefaultConta ? (
                    <Button variant="ghost" size="sm" onClick={() => handleEditConta(conta)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditConta(conta)}>
                          <Edit className="mr-2 h-4 w-4" />
                          {t('common.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleDeleteConta(conta)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('common.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <ContaForm
        open={contaFormOpen}
        onOpenChange={setContaFormOpen}
        initialData={editingConta}
        onSave={handleSaveConta}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar esta conta? Esta ação não pode ser desfeita.
              {contaToDelete?.isDefault && (
                <p className="mt-2 text-destructive font-medium">
                  Esta é uma conta padrão e não pode ser deletada.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteConta}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SubscriptionGuard>
  );
};

export default ContasTab;
