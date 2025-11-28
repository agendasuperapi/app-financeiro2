# Configurar FCM para Android (Push Notifications)

## Problema
O app não consegue registrar notificações push porque o arquivo `google-services.json` está faltando.

## Solução

### 1. Acessar o Firebase Console
1. Vá para https://console.firebase.google.com/
2. Selecione seu projeto: **appfinanceiro-22bd4**
3. Clique no ícone de configurações (⚙️) ao lado de "Visão geral do projeto"
4. Selecione "Configurações do projeto"

### 2. Baixar o google-services.json
1. Na aba "Geral", role até "Seus aplicativos"
2. Encontre o app Android (ícone do Android)
3. Se não existir, clique em "Adicionar app" → Android
   - Nome do pacote Android: `com.lovable.appfinanceiro`
   - Apelido do app: App Financeiro
4. Clique em "Fazer download do google-services.json"

### 3. Colocar o arquivo no projeto
1. Copie o arquivo `google-services.json` baixado
2. Cole em: `android/app/google-services.json`
3. O caminho completo deve ser: `app-financeiro2/android/app/google-services.json`

### 4. Rebuild do app
```bash
# Sincronizar o projeto
npx cap sync android

# Fazer rebuild
npm run build

# Rodar no dispositivo
npx cap run android
```

### 5. Testar
1. Abra o app no dispositivo
2. Vá em Configurações → Notificações Push
3. Clique em "Reconectar Notificações"
4. Você deve ver a mensagem "✅ Notificações conectadas com sucesso!"
5. Verifique no banco de dados que o token foi salvo na tabela `notification_tokens`

## Verificar se está funcionando

### Logs que indicam sucesso:
```
✅ Push registration token received: [token]
💾 Salvando token no banco...
✅ Token saved successfully
```

### Logs que indicam problema:
```
❌ Push registration error
```

## Observações Importantes

- O arquivo `google-services.json` é específico para cada projeto Firebase
- NÃO commite esse arquivo no Git (já está no .gitignore)
- Cada desenvolvedor precisa baixar seu próprio arquivo
- Se mudar o nome do pacote Android, precisa gerar um novo arquivo
