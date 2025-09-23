import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, CheckCircle, AlertCircle, Info } from 'lucide-react';

const RulesPage: React.FC = () => {
  const rules = [
    {
      id: 1,
      category: 'Transações',
      title: 'Registro de Transações',
      description: 'Todas as transações devem ser registradas no mesmo dia em que ocorreram.',
      type: 'obrigatoria',
      icon: CheckCircle
    },
    {
      id: 2,
      category: 'Categorização',
      title: 'Categorias Obrigatórias',
      description: 'Toda transação deve ter uma categoria definida para melhor controle financeiro.',
      type: 'obrigatoria',
      icon: CheckCircle
    },
    {
      id: 3,
      category: 'Lembretes',
      title: 'Configuração de Lembretes',
      description: 'Recomenda-se configurar lembretes para contas recorrentes e metas importantes.',
      type: 'recomendacao',
      icon: Info
    },
    {
      id: 4,
      category: 'Metas',
      title: 'Definição de Limites',
      description: 'Estabeleça limites mensais para categorias de gastos para melhor controle.',
      type: 'recomendacao',
      icon: Info
    },
    {
      id: 5,
      category: 'Segurança',
      title: 'Backup Regular',
      description: 'Faça backup regular dos seus dados financeiros.',
      type: 'importante',
      icon: AlertCircle
    },
    {
      id: 6,
      category: 'Relatórios',
      title: 'Revisão Mensal',
      description: 'Revise seus relatórios mensalmente para acompanhar o progresso das metas.',
      type: 'recomendacao',
      icon: Info
    }
  ];

  const getRuleTypeColor = (type: string) => {
    switch (type) {
      case 'obrigatoria':
        return 'destructive';
      case 'importante':
        return 'default';
      case 'recomendacao':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getRuleTypeLabel = (type: string) => {
    switch (type) {
      case 'obrigatoria':
        return 'Obrigatória';
      case 'importante':
        return 'Importante';
      case 'recomendacao':
        return 'Recomendação';
      default:
        return type;
    }
  };

  const groupedRules = rules.reduce((acc, rule) => {
    if (!acc[rule.category]) {
      acc[rule.category] = [];
    }
    acc[rule.category].push(rule);
    return acc;
  }, {} as Record<string, typeof rules>);

  return (
    <MainLayout>
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Regras do Sistema</h1>
            <p className="text-muted-foreground">
              Diretrizes e boas práticas para o uso eficiente da plataforma
            </p>
          </div>
        </div>

        <div className="grid gap-6">
          {Object.entries(groupedRules).map(([category, categoryRules]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="text-xl">{category}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categoryRules.map((rule) => {
                    const IconComponent = rule.icon;
                    return (
                      <div
                        key={rule.id}
                        className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <IconComponent className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{rule.title}</h3>
                            <Badge variant={getRuleTypeColor(rule.type)}>
                              {getRuleTypeLabel(rule.type)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {rule.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Como Seguir as Regras</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-red-500" />
                <span className="font-medium">Obrigatórias:</span>
                <span className="text-sm text-muted-foreground">
                  Devem ser seguidas sempre para o funcionamento adequado do sistema
                </span>
              </div>
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-primary" />
                <span className="font-medium">Importantes:</span>
                <span className="text-sm text-muted-foreground">
                  Altamente recomendadas para melhor experiência e segurança
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Info className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Recomendações:</span>
                <span className="text-sm text-muted-foreground">
                  Sugestões para otimizar o uso da plataforma
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default RulesPage;