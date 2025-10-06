import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAppContext } from '@/contexts/AppContext';

interface LogEntry {
  id: string;
  created_at: string;
  client_message: string;
  agent_response: string;
  user_id?: string;
}

const LogPage = () => {
  const { user } = useAppContext();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchLogs();
    }
  }, [user]);

  const fetchLogs = async () => {
    if (!user?.id) {
      console.log('Usuário não autenticado');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log('Buscando logs para user_id:', user.id);
      
      const { data, error } = await supabase
        .from('tbl_log' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      console.log('Resultado da busca:', { data, error });

      if (error) {
        console.error('Erro ao buscar logs:', error);
        throw error;
      }
      
      setLogs((data as any) || []);
      console.log('Total de logs carregados:', (data as any)?.length || 0);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Histórico de Logs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visualize o histórico de conversas
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Conversas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando logs...
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum log encontrado
              </div>
            ) : (
              <div className="space-y-6">
                {logs.map((log) => (
                  <div key={log.id} className="space-y-3 pb-6 border-b last:border-b-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDateTime(log.created_at)}
                    </div>
                    
                    {/* Mensagem do Cliente */}
                    <div className="bg-primary/10 rounded-lg p-4">
                      <div className="text-xs font-semibold text-primary mb-1">
                        Cliente
                      </div>
                      <div className="text-sm whitespace-pre-wrap">
                        {log.client_message}
                      </div>
                    </div>

                    {/* Resposta do Agente */}
                    <div className="bg-muted rounded-lg p-4">
                      <div className="text-xs font-semibold text-foreground mb-1">
                        Agente
                      </div>
                      <div className="text-sm whitespace-pre-wrap">
                        {log.agent_response}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default LogPage;
