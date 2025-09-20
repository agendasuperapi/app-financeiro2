import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Trash2, Users, Plus, Phone, User, Loader2, Edit } from 'lucide-react';
import { DependentsService, type Dependent } from '@/services/dependentsService';
import { supabase } from '@/integrations/supabase/client';

const DependentsTab = () => {
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDependent, setEditingDependent] = useState<Dependent | null>(null);
  const [newDepName, setNewDepName] = useState('');
  const [newDepPhone, setNewDepPhone] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchDependents();
  }, []);

  const fetchDependents = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user?.id) {
        const deps = await DependentsService.getDependents(session.user.id);
        setDependents(deps);
      }
    } catch (error) {
      console.error('Error fetching dependents:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dependentes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddDependent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newDepName.trim() || !newDepPhone.trim()) {
      toast({
        title: 'Erro',
        description: 'Nome e telefone são obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    try {
      setAdding(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user?.id) {
        await DependentsService.addDependent(session.user.id, newDepName, newDepPhone);
        
        toast({
          title: 'Sucesso',
          description: 'Dependente adicionado com sucesso',
        });
        
        setNewDepName('');
        setNewDepPhone('');
        setIsDialogOpen(false);
        fetchDependents();
      }
    } catch (error) {
      console.error('Error adding dependent:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao adicionar dependente',
        variant: 'destructive',
      });
    } finally {
      setAdding(false);
    }
  };

  const handleEditDependent = (dependent: Dependent) => {
    setEditingDependent(dependent);
    setNewDepName(dependent.dep_name);
    setNewDepPhone(dependent.dep_phone);
    setIsEditDialogOpen(true);
  };

  const handleUpdateDependent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingDependent?.dep_id || !newDepName.trim() || !newDepPhone.trim()) {
      toast({
        title: 'Erro',
        description: 'Nome e telefone são obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    try {
      setAdding(true);
      await DependentsService.updateDependent(editingDependent.dep_id, newDepName, newDepPhone);
      
      toast({
        title: 'Sucesso',
        description: 'Dependente atualizado com sucesso',
      });
      
      setNewDepName('');
      setNewDepPhone('');
      setIsEditDialogOpen(false);
      setEditingDependent(null);
      fetchDependents();
    } catch (error) {
      console.error('Error updating dependent:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar dependente',
        variant: 'destructive',
      });
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteDependent = async (id: number) => {
    try {
      await DependentsService.deleteDependent(id);
      
      toast({
        title: 'Sucesso',
        description: 'Dependente removido com sucesso',
      });
      
      fetchDependents();
    } catch (error) {
      console.error('Error deleting dependent:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao remover dependente',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Dependentes
          </CardTitle>
          <CardDescription>
            Gerencie seus dependentes ({dependents.length} cadastrado{dependents.length !== 1 ? 's' : ''})
          </CardDescription>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Dependente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Dependente</DialogTitle>
              <DialogDescription>
                Adicione um novo dependente ao seu cadastro
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleAddDependent} className="space-y-4">
              <div className="grid gap-2">
                <label htmlFor="dep-name" className="font-medium">Nome</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="dep-name"
                    value={newDepName}
                    onChange={(e) => setNewDepName(e.target.value)}
                    placeholder="Nome completo do dependente"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div className="grid gap-2">
                <label htmlFor="dep-phone" className="font-medium">Telefone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="dep-phone"
                    value={newDepPhone}
                    onChange={(e) => setNewDepPhone(e.target.value)}
                    placeholder="5511999999999"
                    className="pl-10"
                    type="tel"
                    required
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Formato: código do país + DDD + número (ex: 5511999999999)
                </p>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={adding}>
                  {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Adicionar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Dependente</DialogTitle>
              <DialogDescription>
                Edite as informações do dependente
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleUpdateDependent} className="space-y-4">
              <div className="grid gap-2">
                <label htmlFor="edit-dep-name" className="font-medium">Nome</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="edit-dep-name"
                    value={newDepName}
                    onChange={(e) => setNewDepName(e.target.value)}
                    placeholder="Nome completo do dependente"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div className="grid gap-2">
                <label htmlFor="edit-dep-phone" className="font-medium">Telefone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    id="edit-dep-phone"
                    value={newDepPhone}
                    onChange={(e) => setNewDepPhone(e.target.value)}
                    placeholder="5511999999999"
                    className="pl-10"
                    type="tel"
                    required
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Formato: código do país + DDD + número (ex: 5511999999999)
                </p>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={adding}>
                  {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      
      <CardContent>
        {dependents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum dependente cadastrado</p>
            <p className="text-sm">Clique em "Adicionar Dependente" para começar</p>
          </div>
        ) : (
          <div className="space-y-4">
            {dependents.map((dependent) => (
               <div
                key={dependent.dep_id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-primary/10 text-primary rounded-full text-sm font-medium">
                    {dependent.dep_numero}
                  </div>
                  <div>
                    <h4 className="font-medium">{dependent.dep_name}</h4>
                    <p className="text-sm text-muted-foreground">{dependent.dep_phone}</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditDependent(dependent)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => dependent.dep_id && handleDeleteDependent(dependent.dep_id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DependentsTab;