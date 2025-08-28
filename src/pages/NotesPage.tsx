import React, { useState, useEffect } from 'react';
import { Search, Plus, Calendar, FileText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
// import { NotesService, type Note } from '@/services/notesService';

interface Note {
  id: string;
  data: string;
  descricao: string;
  notas: string;
  created_at: string;
}

const NotesPage: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNote, setNewNote] = useState({
    data: format(new Date(), 'yyyy-MM-dd'),
    descricao: '',
    notas: ''
  });
  const { toast } = useToast();

  // Dados mockados - substituir pela integração real com Supabase após criar a tabela
  useEffect(() => {
    const mockNotes: Note[] = [
      {
        id: '1',
        data: '2024-01-15',
        descricao: 'Reunião com cliente',
        notas: 'Discutir propostas de orçamento para o próximo trimestre',
        created_at: '2024-01-15T10:00:00Z'
      },
      {
        id: '2',
        data: '2024-01-14',
        descricao: 'Análise financeira',
        notas: 'Revisar gastos do mês anterior e identificar áreas de economia',
        created_at: '2024-01-14T14:30:00Z'
      }
    ];
    setNotes(mockNotes);
    setLoading(false);
  }, []);

  const filteredNotes = notes.filter(note =>
    note.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.notas.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddNote = () => {
    if (!newNote.descricao || !newNote.notas) {
      toast({
        title: "Erro",
        description: "Por favor, preencha a descrição e as notas.",
        variant: "destructive"
      });
      return;
    }

    // Mock - substituir pela integração real com Supabase
    const note: Note = {
      id: Date.now().toString(),
      data: newNote.data,
      descricao: newNote.descricao,
      notas: newNote.notas,
      created_at: new Date().toISOString()
    };

    setNotes(prev => [note, ...prev]);
    setNewNote({
      data: format(new Date(), 'yyyy-MM-dd'),
      descricao: '',
      notas: ''
    });
    setIsAddingNote(false);

    toast({
      title: "Sucesso",
      description: "Nota adicionada com sucesso!"
    });
  };

  const handleDeleteNote = (id: string) => {
    // Mock - substituir pela integração real com Supabase
    setNotes(prev => prev.filter(note => note.id !== id));
    toast({
      title: "Sucesso",
      description: "Nota excluída com sucesso!"
    });
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Minhas Notas</h1>
        
        <Dialog open={isAddingNote} onOpenChange={setIsAddingNote}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Nota
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Adicionar Nova Nota</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="data">Data</Label>
                <Input
                  id="data"
                  type="date"
                  value={newNote.data}
                  onChange={(e) => setNewNote(prev => ({ ...prev, data: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Input
                  id="descricao"
                  placeholder="Digite a descrição da nota..."
                  value={newNote.descricao}
                  onChange={(e) => setNewNote(prev => ({ ...prev, descricao: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notas">Notas</Label>
                <Textarea
                  id="notas"
                  placeholder="Digite suas notas aqui..."
                  value={newNote.notas}
                  onChange={(e) => setNewNote(prev => ({ ...prev, notas: e.target.value }))}
                  className="min-h-[100px]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddingNote(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddNote}>
                Salvar Nota
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Campo de pesquisa */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar notas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Lista de notas */}
      <div className="grid gap-4">
        {filteredNotes.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma nota encontrada</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Tente ajustar sua pesquisa.' : 'Comece adicionando sua primeira nota.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredNotes.map((note) => (
            <Card key={note.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{note.descricao}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {formatDate(note.data)}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteNote(note.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">{note.notas}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default NotesPage;