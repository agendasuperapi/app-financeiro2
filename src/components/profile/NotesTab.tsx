import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, Search, Edit2 } from 'lucide-react';
import { useClientAwareNotes } from '@/hooks/useClientAwareNotes';
import { useToast } from '@/components/ui/use-toast';

const NotesTab = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [newNote, setNewNote] = useState({ data: '', descricao: '', notas: '', name: '', phone: '' });
  const [editingNote, setEditingNote] = useState<any>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { 
    notes, 
    loading, 
    isClientView,
    createNote, 
    updateNote, 
    deleteNote,
    searchNotes,
    loadNotes 
  } = useClientAwareNotes();

  const handleCreateNote = async () => {
    if (!newNote.data.trim() || !newNote.notas.trim() || !newNote.name.trim()) {
      toast({
        title: 'Erro',
        description: 'Data, notas e nome são obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    if (createNote) {
      await createNote(newNote);
      setNewNote({ data: '', descricao: '', notas: '', name: '', phone: '' });
      setIsAddDialogOpen(false);
    }
  };

  const handleEditNote = (note: any) => {
    setEditingNote({
      id: note.id,
      data: note.data,
      descricao: note.descricao,
      notas: note.notas,
      name: note.name || '',
      phone: note.phone || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateNote = async () => {
    if (!editingNote.data.trim() || !editingNote.notas.trim() || !editingNote.name.trim()) {
      toast({
        title: 'Erro',
        description: 'Data, notas e nome são obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    if (updateNote) {
      await updateNote(editingNote.id, {
        data: editingNote.data,
        descricao: editingNote.descricao,
        notas: editingNote.notas,
        name: editingNote.name,
        phone: editingNote.phone
      });
      setIsEditDialogOpen(false);
      setEditingNote(null);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta anotação?')) {
      if (deleteNote) {
        await deleteNote(noteId);
      }
    }
  };

  const handleSearch = async () => {
    if (searchNotes && searchTerm.trim()) {
      await searchNotes(searchTerm);
    } else if (loadNotes) {
      await loadNotes();
    }
  };

  const filteredNotes = notes.filter(note =>
    note.data.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.notas.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (note.descricao && note.descricao.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Minhas Anotações</CardTitle>
            <CardDescription>
              {isClientView 
                ? 'Visualizando anotações do cliente selecionado' 
                : 'Gerencie suas anotações pessoais'}
            </CardDescription>
          </div>
          {!isClientView && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Anotação
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                  <DialogTitle>Nova Anotação</DialogTitle>
                  <DialogDescription>
                    Adicione uma nova anotação com informações de contato.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <label htmlFor="data" className="text-sm font-medium">
                      Data *
                    </label>
                    <Input
                      id="data"
                      value={newNote.data}
                      onChange={(e) => setNewNote({ ...newNote, data: e.target.value })}
                      placeholder="Data da anotação"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="name" className="text-sm font-medium">
                      Nome *
                    </label>
                    <Input
                      id="name"
                      value={newNote.name}
                      onChange={(e) => setNewNote({ ...newNote, name: e.target.value })}
                      placeholder="Nome da pessoa"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="phone" className="text-sm font-medium">
                      Telefone
                    </label>
                    <Input
                      id="phone"
                      value={newNote.phone}
                      onChange={(e) => setNewNote({ ...newNote, phone: e.target.value })}
                      placeholder="(xx) xxxxx-xxxx"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="descricao" className="text-sm font-medium">
                      Descrição
                    </label>
                    <Input
                      id="descricao"
                      value={newNote.descricao}
                      onChange={(e) => setNewNote({ ...newNote, descricao: e.target.value })}
                      placeholder="Descrição da anotação"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="notas" className="text-sm font-medium">
                      Notas *
                    </label>
                    <Textarea
                      id="notas"
                      value={newNote.notas}
                      onChange={(e) => setNewNote({ ...newNote, notas: e.target.value })}
                      placeholder="Conteúdo da anotação"
                      rows={4}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" onClick={handleCreateNote}>
                    Criar Anotação
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
        
        <div className="flex gap-2 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Pesquisar anotações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          <Button variant="outline" onClick={handleSearch}>
            Buscar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border rounded-lg p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500 mb-2">Nenhuma anotação encontrada</div>
            {!isClientView && (
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar primeira anotação
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNotes.map((note) => (
              <div key={note.id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg">{note.data}</h3>
                  {!isClientView && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditNote(note)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteNote(note.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                
                {note.descricao && (
                  <p className="text-sm text-muted-foreground mb-2">{note.descricao}</p>
                )}
                
                <p className="text-gray-700 whitespace-pre-wrap mb-3">{note.notas}</p>
                
                <div className="text-sm text-gray-500">
                  Criado em: {new Date(note.created_at).toLocaleString('pt-BR')}
                  {note.updated_at !== note.created_at && (
                    <span className="ml-2">
                      • Atualizado em: {new Date(note.updated_at).toLocaleString('pt-BR')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Dialog de Edição */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Editar Anotação</DialogTitle>
              <DialogDescription>
                Atualize as informações da anotação.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label htmlFor="edit-data" className="text-sm font-medium">
                  Data *
                </label>
                <Input
                  id="edit-data"
                  value={editingNote?.data || ''}
                  onChange={(e) => setEditingNote({ ...editingNote, data: e.target.value })}
                  placeholder="Data da anotação"
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="edit-name" className="text-sm font-medium">
                  Nome *
                </label>
                <Input
                  id="edit-name"
                  value={editingNote?.name || ''}
                  onChange={(e) => setEditingNote({ ...editingNote, name: e.target.value })}
                  placeholder="Nome da pessoa"
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="edit-phone" className="text-sm font-medium">
                  Telefone
                </label>
                <Input
                  id="edit-phone"
                  value={editingNote?.phone || ''}
                  onChange={(e) => setEditingNote({ ...editingNote, phone: e.target.value })}
                  placeholder="(xx) xxxxx-xxxx"
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="edit-descricao" className="text-sm font-medium">
                  Descrição
                </label>
                <Input
                  id="edit-descricao"
                  value={editingNote?.descricao || ''}
                  onChange={(e) => setEditingNote({ ...editingNote, descricao: e.target.value })}
                  placeholder="Descrição da anotação"
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="edit-notas" className="text-sm font-medium">
                  Notas *
                </label>
                <Textarea
                  id="edit-notas"
                  value={editingNote?.notas || ''}
                  onChange={(e) => setEditingNote({ ...editingNote, notas: e.target.value })}
                  placeholder="Conteúdo da anotação"
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" onClick={handleUpdateNote}>
                Salvar Alterações
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default NotesTab;