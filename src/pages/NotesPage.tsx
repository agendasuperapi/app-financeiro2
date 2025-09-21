import React, { useState, useEffect } from 'react';
import { Search, Plus, Calendar, FileText, Trash2, User, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { NotesService } from '@/services/notesService';
import { useClientAwareNotes } from '@/hooks/useClientAwareNotes';
import MainLayout from '@/components/layout/MainLayout';
import SubscriptionGuard from '@/components/subscription/SubscriptionGuard';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import AddedByFieldForm from '@/components/contas/AddedByFieldForm';
interface Note {
  id: string;
  data: string;
  descricao: string;
  notas: string;
  created_at: string;
}

// Schema for note form
const noteFormSchema = z.object({
  data: z.string().min(1, 'Data é obrigatória'),
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  notas: z.string().min(1, 'Notas são obrigatórias'),
  // Campos obrigatórios apenas do AddedByField
  name: z.string().min(1, 'Usuario é obrigatório'),
  phone: z.string().optional()
});
type NoteFormValues = z.infer<typeof noteFormSchema>;
const NotesPage: React.FC = () => {
  const {
    notes,
    loading,
    isClientView,
    selectedUser,
    loadNotes,
    deleteNote
  } = useClientAwareNotes();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const {
    toast
  } = useToast();

  // Form setup
  const form = useForm<NoteFormValues>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: {
      data: format(new Date(), 'yyyy-MM-dd'),
      descricao: '',
      notas: '',
      name: '',
      phone: ''
    }
  });

  // Carregar notas do Supabase
  useEffect(() => {
    // As notas já são carregadas pelo hook useClientAwareNotes
  }, []);
  const filteredNotes = notes.filter(note => note.descricao.toLowerCase().includes(searchTerm.toLowerCase()) || note.notas.toLowerCase().includes(searchTerm.toLowerCase()));
  const handleAddNote = async (values: NoteFormValues) => {
    try {
      if (isClientView && selectedUser) {
        // Criar nota para o cliente selecionado
        const {
          error
        } = await (supabase as any).from('financeiro_notas').insert({
          user_id: selectedUser.id,
          data: values.data,
          descricao: values.descricao,
          notas: values.notas,
          creator_name: values.name,
          phone: values.phone
        });
        if (error) throw error;
      } else {
        // Criar nota para o usuário logado
        await NotesService.createNote({
          data: values.data,
          descricao: values.descricao,
          notas: values.notas,
          creator_name: values.name,
          phone: values.phone
        });
      }
      form.reset({
        data: format(new Date(), 'yyyy-MM-dd'),
        descricao: '',
        notas: '',
        name: '',
        phone: ''
      });
      setIsAddingNote(false);
      toast({
        title: "Sucesso",
        description: isClientView ? `Nota adicionada para ${selectedUser?.name}!` : "Nota adicionada com sucesso!"
      });

      // Recarregar notas
      await loadNotes();
    } catch (error) {
      console.error('Erro ao adicionar nota:', error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar a nota.",
        variant: "destructive"
      });
    }
  };
  const handleDeleteNote = async (id: string) => {
    // Desabilitar exclusão na visualização de cliente
    if (isClientView) {
      toast({
        title: "Operação não permitida",
        description: "Não é possível excluir notas na visualização de cliente.",
        variant: "destructive"
      });
      return;
    }
    try {
      if (deleteNote) {
        await deleteNote(id);
      }
      toast({
        title: "Sucesso",
        description: "Nota excluída com sucesso!"
      });

      // Recarregar notas
      await loadNotes();
    } catch (error) {
      console.error('Erro ao excluir nota:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a nota.",
        variant: "destructive"
      });
    }
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    form.reset({
      data: note.data,
      descricao: note.descricao,
      notas: note.notas,
      name: (note as any).creator_name || '',
      phone: (note as any).phone || ''
    });
    setIsEditingNote(true);
  };

  const handleUpdateNote = async (values: NoteFormValues) => {
    if (!editingNote) return;
    
    try {
      if (isClientView && selectedUser) {
        // Atualizar nota para o cliente selecionado
        const { error } = await (supabase as any).from('financeiro_notas').update({
          data: values.data,
          descricao: values.descricao,
          notas: values.notas,
          creator_name: values.name,
          phone: values.phone
        }).eq('id', editingNote.id);
        if (error) throw error;
      } else {
        // Atualizar nota para o usuário logado
        await NotesService.updateNote(editingNote.id, {
          data: values.data,
          descricao: values.descricao,
          notas: values.notas,
          creator_name: values.name,
          phone: values.phone
        });
      }
      
      setIsEditingNote(false);
      setEditingNote(null);
      toast({
        title: "Sucesso",
        description: "Nota atualizada com sucesso!"
      });

      // Recarregar notas
      await loadNotes();
    } catch (error) {
      console.error('Erro ao atualizar nota:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a nota.",
        variant: "destructive"
      });
    }
  };
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', {
        locale: ptBR
      });
    } catch {
      return dateString;
    }
  };
  return <MainLayout>
      <SubscriptionGuard feature="notas ilimitadas">
        <div className="w-full px-4 py-4 md:py-8 pb-20 md:pb-8 min-h-0">
          <div className="container mx-auto space-y-6">
            {/* Indicador de visualização de cliente */}
            {isClientView && selectedUser && <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-blue-800">
                  <User className="h-4 w-4" />
                  <span className="font-medium">
                    Visualizando notas de: {selectedUser.name} ({selectedUser.email})
                  </span>
                </div>
              </div>}
            
            <div className="flex items-center justify-between">
              <h1 className="text-lg md:text-3xl font-bold text-foreground">Minhas Notas</h1>
              
              <Dialog open={isAddingNote} onOpenChange={setIsAddingNote}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    {isClientView ? `Adicionar Nota para ${selectedUser?.name}` : 'Adicionar Nota'}
                  </Button>
                </DialogTrigger>
                  <DialogContent className="sm:max-w-[525px]">
                    <DialogHeader>
                      <DialogTitle>Adicionar Nova Nota</DialogTitle>
                      <DialogDescription>
                        Preencha os campos abaixo para adicionar uma nova nota.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(handleAddNote)} className="space-y-4 py-4">
                        <FormField control={form.control} name="data" render={({
                      field
                    }) => <FormItem>
                              <FormLabel>Data</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>} />
                        
                        <FormField control={form.control} name="descricao" render={({
                      field
                    }) => <FormItem>
                              <FormLabel>Titulo</FormLabel>
                              <FormControl>
                                <Input placeholder="Digite a descrição da nota..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>} />

                        <AddedByFieldForm form={form} />
                        
                        <FormField control={form.control} name="notas" render={({
                      field
                    }) => <FormItem>
                              <FormLabel>Notas</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Digite suas notas aqui..." className="min-h-[100px]" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>} />
                        
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setIsAddingNote(false)}>
                            Cancelar
                          </Button>
                          <Button type="submit">
                            Salvar Nota
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
                
                {/* Edit Dialog */}
                <Dialog open={isEditingNote} onOpenChange={setIsEditingNote}>
                  <DialogContent className="sm:max-w-[525px]">
                    <DialogHeader>
                      <DialogTitle>Editar Nota</DialogTitle>
                      <DialogDescription>
                        Edite os campos abaixo para atualizar a nota.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(handleUpdateNote)} className="space-y-4 py-4">
                        <FormField control={form.control} name="data" render={({
                      field
                    }) => <FormItem>
                              <FormLabel>Data</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>} />
                        
                        <FormField control={form.control} name="descricao" render={({
                      field
                    }) => <FormItem>
                              <FormLabel>Titulo</FormLabel>
                              <FormControl>
                                <Input placeholder="Digite a descrição da nota..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>} />

                        <AddedByFieldForm form={form} />
                        
                        <FormField control={form.control} name="notas" render={({
                      field
                    }) => <FormItem>
                              <FormLabel>Notas</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Digite suas notas aqui..." className="min-h-[100px]" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>} />
                        
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setIsEditingNote(false)}>
                            Cancelar
                          </Button>
                          <Button type="submit">
                            Atualizar Nota
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
            </div>

            {/* Campo de pesquisa */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Pesquisar notas..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
            </div>

            {/* Lista de notas */}
            <div className="grid gap-4">
              {loading ?
            // Skeleton loading
            <div className="space-y-4">
                  {[1, 2, 3].map(i => <Card key={i} className="animate-pulse">
                      <CardContent className="py-6">
                        <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-1/4 mb-4"></div>
                        <div className="h-3 bg-muted rounded w-full mb-2"></div>
                        <div className="h-3 bg-muted rounded w-2/3"></div>
                      </CardContent>
                    </Card>)}
                </div> : filteredNotes.length === 0 ? <Card>
                  <CardContent className="py-8 text-center">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">Nenhuma nota encontrada</h3>
                    <p className="text-muted-foreground">
                      {searchTerm ? 'Tente ajustar sua pesquisa.' : 'Comece adicionando sua primeira nota.'}
                    </p>
                  </CardContent>
                </Card> : filteredNotes.map(note => <Card key={note.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{note.descricao}</CardTitle>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {formatDate(note.data)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEditNote(note)}
                            className={cn("text-primary hover:text-primary", isClientView && "opacity-50 cursor-not-allowed")}
                            disabled={isClientView}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteNote(note.id)} 
                            className={cn("text-destructive hover:text-destructive", isClientView && "opacity-50 cursor-not-allowed")} 
                            disabled={isClientView}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground whitespace-pre-wrap">{note.notas}</p>
                    </CardContent>
                  </Card>)}
            </div>
          </div>
        </div>
      </SubscriptionGuard>
    </MainLayout>;
};
export default NotesPage;