# Configuração de Secrets para GitHub Actions

Para que o workflow de deploy automático funcione, você precisa configurar as seguintes secrets no seu repositório GitHub:

## Secrets Necessárias

### 1. SUPABASE_ACCESS_TOKEN
- **Onde obter**: Supabase Dashboard → Settings → Access Tokens
- **Como configurar**: 
  1. Vá para Supabase Dashboard
  2. Clique em Settings → Access Tokens
  3. Clique em "Generate new token"
  4. Copie o token gerado

### 2. SUPABASE_PROJECT_ID
- **Onde obter**: URL do seu projeto Supabase ou Dashboard → Settings → General
- **Formato**: É o ID que aparece na URL do seu projeto (ex: `iaeugizsjxwrlpfjutom`)

### 3. SUPABASE_SERVICE_ROLE_KEY
- **Onde obter**: Supabase Dashboard → Settings → API → Service Role Key
- **Importante**: Mantenha esta chave segura, ela tem acesso total ao banco de dados

### 4. SUPABASE_DB_PASSWORD
- **Onde obter**: Senha do banco de dados configurada no Supabase
- **Nota**: Usada para reset do banco em modo fresh

### 5. HOSTINGER_FTP_HOST (Opcional - para upload de APK)
- **Onde obter**: Painel Hostinger → FTP Accounts
- **Formato**: Ex: `ftp.seusite.com.br` ou IP do servidor
- **Nota**: Necessário apenas se quiser upload automático de APK

### 6. HOSTINGER_FTP_USER (Opcional - para upload de APK)
- **Onde obter**: Painel Hostinger → FTP Accounts
- **Formato**: Nome de usuário FTP criado no Hostinger

### 7. HOSTINGER_FTP_PASSWORD (Opcional - para upload de APK)
- **Onde obter**: Painel Hostinger → FTP Accounts
- **Formato**: Senha do usuário FTP

### 8. HOSTINGER_FTP_DIR (Opcional - para upload de APK)
- **Valor padrão**: `/public_html`
- **Formato**: Diretório no servidor onde o APK será enviado
- **Exemplo**: `/public_html/apk` ou `/public_html/downloads`

## Como Configurar no GitHub

1. Vá para o seu repositório no GitHub
2. Clique em **Settings** (na aba superior)
3. No menu lateral, clique em **Secrets and variables** → **Actions**
4. Clique em **New repository secret**
5. Adicione cada secret:
   - Nome: `SUPABASE_ACCESS_TOKEN`
   - Valor: [seu token do Supabase]
   - Nome: `SUPABASE_PROJECT_ID`  
   - Valor: [seu project ID]
   - Nome: `SUPABASE_SERVICE_ROLE_KEY`
   - Valor: [sua service role key]
   - Nome: `SUPABASE_DB_PASSWORD`
   - Valor: [senha do banco de dados]
   - Nome: `HOSTINGER_FTP_HOST` (opcional)
   - Valor: [host FTP da Hostinger]
   - Nome: `HOSTINGER_FTP_USER` (opcional)
   - Valor: [usuário FTP]
   - Nome: `HOSTINGER_FTP_PASSWORD` (opcional)
   - Valor: [senha FTP]
   - Nome: `HOSTINGER_FTP_DIR` (opcional)
   - Valor: `/public_html` (ou outro diretório)

## Testando o Deploy

Após configurar as secrets:

1. Faça uma alteração em qualquer arquivo dentro de `supabase/**` ou `src/**`
2. Commit e push para a branch `main`
3. Vá para a aba **Actions** no GitHub para acompanhar o deploy
4. O workflow irá:
   - Fazer deploy automático de todas as Edge Functions
   - Aplicar migrações do banco de dados
   - Gerar APK automaticamente (se secrets da Hostinger estiverem configuradas)
   - Fazer upload do APK para Hostinger

## Deploy Manual

Você também pode executar o workflow manualmente:
1. Vá para **Actions** no GitHub
2. Selecione "Complete Supabase Deployment for Redistribution"
3. Clique em **Run workflow**
4. Configure as opções:
   - **Setup mode**: `fresh` (nova instalação) ou `update` (atualização)
   - **Force all migrations**: Marque se quiser forçar todas as migrações
   - **Build APK**: Marque se quiser gerar e fazer upload do APK
5. Clique em **Run workflow**

## Geração Automática de APK

O workflow agora inclui geração automática de APK e upload para Hostinger:

- **Quando executa**: Automaticamente após deploy do Supabase (se `build_apk` estiver habilitado)
- **O que faz**:
  1. Build do projeto React
  2. Adiciona plataforma Android (se não existir)
  3. Sincroniza com Capacitor
  4. Gera APK usando Gradle
  5. Faz upload para Hostinger via FTP
  6. Salva APK como artifact do GitHub

- **APK disponível em**:
  - Hostinger: `https://[seu-dominio]/app-debug.apk`
  - GitHub: Aba Actions → Artifacts (disponível por 30 dias)

## Verificação

Após o deploy, verifique no Supabase Dashboard → Edge Functions se as novas funções apareceram:
- `get-admin-settings`
- `update-admin-settings` 
- `migrate-settings`