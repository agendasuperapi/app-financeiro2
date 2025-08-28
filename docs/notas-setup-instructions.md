# Configuração da Funcionalidade de Notas

## Visão Geral
A funcionalidade de Notas foi implementada e está disponível no menu lateral do aplicativo, logo abaixo de "Relatórios". A página permite aos usuários criar, pesquisar e gerenciar suas notas pessoais.

## Status Atual
- ✅ Interface de usuário implementada
- ✅ Menu lateral atualizado com link para "Notas"
- ✅ Rota configurada (`/notes`)
- ✅ Funcionalidade básica com dados mockados
- ⏳ Integração com banco de dados Supabase (pendente)

## Para Ativar a Integração com Supabase

### 1. Criar a Tabela no Banco de Dados

Execute o script SQL fornecido em `docs/notas-database-setup.sql` no Editor SQL do painel do Supabase:

1. Acesse o painel do Supabase
2. Vá para "SQL Editor"
3. Execute o script completo do arquivo `notas-database-setup.sql`

### 2. Atualizar os Tipos TypeScript

Após criar a tabela, será necessário:

1. Regenerar os tipos do Supabase para incluir a nova tabela `financeiro_notas`
2. Atualizar o arquivo `src/integrations/supabase/types.ts`
3. Implementar o serviço `NotesService` para integração real com o banco

### 3. Estrutura da Tabela

A tabela `financeiro_notas` possui as seguintes colunas:
- `id`: UUID (chave primária)
- `user_id`: UUID (referência ao usuário)
- `data`: DATE (data da nota)
- `descricao`: TEXT (descrição/título da nota)
- `notas`: TEXT (conteúdo da nota)
- `created_at`: TIMESTAMP (criado em)
- `updated_at`: TIMESTAMP (atualizado em)

### 4. Recursos de Segurança

A tabela já vem configurada com:
- RLS (Row Level Security) ativado
- Políticas para que usuários vejam apenas suas próprias notas
- Trigger automático para atualizar `updated_at`

## Funcionalidades Disponíveis

- ✅ Visualização de notas em cards
- ✅ Pesquisa por descrição ou conteúdo
- ✅ Adição de novas notas
- ✅ Exclusão de notas
- ✅ Interface responsiva
- ✅ Formatação de datas
- ✅ Feedback visual com toasts

## Próximos Passos

1. Executar o script SQL no Supabase
2. Regenerar tipos TypeScript
3. Implementar o `NotesService` para conectar com a tabela real
4. Testar a funcionalidade completa