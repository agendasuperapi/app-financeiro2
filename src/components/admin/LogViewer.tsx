import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, MessageSquare, Bot } from 'lucide-react';

interface LogEntry {
  id: string;
  client_message: string;
  agent_response: string;
  created_at: string;
  user_id?: string;
}

export const LogViewer: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tbl_log' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLogs((data as any) || []);
    } catch (error) {
      console.error('Erro ao buscar logs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum log encontrado
      </div>
    );
  }

  return (
    <ScrollArea className="h-[600px] pr-4">
      <div className="space-y-4">
        {logs.map((log) => (
          <Card key={log.id} className="overflow-hidden">
            <CardContent className="p-0">
              {/* Mensagem do Cliente */}
              <div className="p-4 bg-blue-50 dark:bg-blue-950 border-b">
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                      Cliente
                    </p>
                    <p className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">
                      {log.client_message}
                    </p>
                  </div>
                </div>
              </div>

              {/* Resposta do Agente */}
              <div className="p-4 bg-green-50 dark:bg-green-950">
                <div className="flex items-start gap-3">
                  <Bot className="h-5 w-5 text-green-600 dark:text-green-400 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-1">
                      Agente
                    </p>
                    <p className="text-sm text-green-800 dark:text-green-200 whitespace-pre-wrap">
                      {log.agent_response}
                    </p>
                  </div>
                </div>
              </div>

              {/* Data */}
              <div className="px-4 py-2 bg-muted text-xs text-muted-foreground">
                {new Date(log.created_at).toLocaleString('pt-BR')}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
};
