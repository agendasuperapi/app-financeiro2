import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, Bot, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface LogEntry {
  id: string;
  client_message: string;
  agent_response: string;
  created_at: string;
  user_id?: string;
}

export const LogViewer: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('tbl_log' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar logs:', error);
        toast.error('Erro ao carregar logs');
        return;
      }

      setLogs((data as any) || []);
    } catch (error) {
      console.error('Erro ao buscar logs:', error);
      toast.error('Erro ao carregar logs');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Histórico de Conversas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum log encontrado
            </p>
          ) : (
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-6">
                {logs.map((log) => (
                  <div key={log.id} className="border rounded-lg p-4 space-y-4">
                    <div className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </div>
                    
                    {/* Mensagem do Cliente */}
                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <MessageSquare className="h-4 w-4 text-blue-600" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm mb-1">Cliente</div>
                        <div className="bg-blue-50 rounded-lg p-3 text-sm">
                          {log.client_message}
                        </div>
                      </div>
                    </div>

                    {/* Resposta do Agente */}
                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                          <Bot className="h-4 w-4 text-green-600" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm mb-1">Agente</div>
                        <div className="bg-green-50 rounded-lg p-3 text-sm">
                          {log.agent_response}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
