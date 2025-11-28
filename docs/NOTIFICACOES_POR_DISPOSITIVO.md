# 🔔 Notificações por Dispositivo

## ✅ O que foi implementado

### 1. **Configurações por Dispositivo**
Agora cada dispositivo (Android, iOS, Web) pode ter suas próprias configurações de notificação:
- **Som personalizado** (Padrão, Alerta, Sucesso, Lembrete, Chime, Silencioso)
- **Vibração** ativada ou desativada
- **Perfis de notificação** (Trabalho, Casa, Silencioso)

### 2. **Contagem Correta de Dispositivos**
O sistema agora conta **TODOS** os dispositivos conectados:
- ✅ Android
- ✅ iOS (quando implementado)
- ✅ Web (navegadores)

### 3. **Gerenciamento de Dispositivos**
Nova interface para gerenciar todos os dispositivos:
- 📱 Lista todos os dispositivos conectados
- 🕐 Mostra última atividade de cada dispositivo
- 🗑️ Permite desconectar dispositivos específicos
- 📍 Identifica qual é o dispositivo atual

## 🚀 Como usar

### Acessar Gerenciamento de Dispositivos
1. Vá em **Configurações** > **Notificações Push**
2. Se houver dispositivos conectados, você verá:
   - Contador: "📱 X dispositivos conectados"
   - Botão: **"Gerenciar Dispositivos"**
3. Clique em "Gerenciar Dispositivos"

### Visualizar Dispositivos Conectados
Na modal que abrir, você verá todos os dispositivos:
- **Plataforma**: Android / iOS / Web
- **Status**: "Este dispositivo" para o atual
- **Última atividade**: Quando foi usado pela última vez
- **ID do dispositivo**: Identificador único (abreviado)

### Desconectar um Dispositivo
1. Clique no ícone de **🗑️ lixeira** ao lado do dispositivo
2. Confirme a ação na modal de confirmação
3. ⚠️ **ATENÇÃO**: Se você desconectar o dispositivo atual, precisará ativar as notificações novamente

### Configurar Perfis por Dispositivo
Agora você pode ter configurações diferentes em cada dispositivo:
- **Celular de trabalho**: Perfil "Trabalho" com alertas sonoros
- **Celular pessoal**: Perfil "Casa" com sons suaves
- **Computador**: Perfil "Silencioso" sem sons

## 🔧 Alterações Técnicas

### Banco de Dados (SQL)
Execute o script: `docs/notification-settings-per-device.sql`

**Mudanças na tabela `notification_settings`:**
- ➕ Novo campo: `device_id` - ID único do dispositivo
- ➕ Novo campo: `platform` - Plataforma (web/android/ios)
- ➕ Novo campo: `device_name` - Nome amigável (opcional)
- 🔄 Nova constraint: `UNIQUE(user_id, device_id)` - permite múltiplos dispositivos por usuário
- ❌ Removida constraint antiga: `UNIQUE(user_id)` - que limitava a 1 dispositivo

### Código Modificado
1. **src/components/settings/NotificationSettings.tsx**
   - Adicionada interface `ConnectedDevice`
   - Novo estado: `connectedDevices`, `showDeviceManager`, `deviceToDelete`
   - Nova função: `handleDeleteDevice()`
   - Novas funções helper: `getPlatformIcon()`, `getPlatformName()`, `formatDate()`
   - Atualizado: `loadSettings()` - carrega configurações deste dispositivo
   - Atualizado: `applyProfile()` - salva perfil neste dispositivo
   - Atualizado: `handleSaveSettings()` - salva configurações neste dispositivo
   - Adicionada: Modal de gerenciamento de dispositivos
   - Adicionada: Modal de confirmação de exclusão

2. **src/services/notificationService.ts**
   - Mantém o `device_id` no localStorage
   - Usa `device_id` para identificar dispositivos únicos

3. **src/hooks/usePushNotifications.ts**
   - Já estava gerando `device_id` único
   - Mantém compatibilidade com Android/iOS

## 📊 Impacto

### Antes
- ❌ Usuário com 2 celulares + 1 web = apenas **1 dispositivo** recebia notificações
- ❌ Contador mostrava apenas dispositivos web
- ❌ Não era possível gerenciar dispositivos
- ❌ Configurações eram globais (todos os dispositivos compartilhavam)

### Depois
- ✅ Usuário com 2 celulares + 1 web = **3 dispositivos** recebem notificações
- ✅ Contador mostra **TODOS** os dispositivos (Android + iOS + Web)
- ✅ Interface completa para gerenciar dispositivos
- ✅ Cada dispositivo tem suas próprias configurações

## 🧪 Como Testar

### 1. Teste Multi-Dispositivo
1. Abra o app em um navegador (Chrome)
2. Ative as notificações
3. Abra o app em outro navegador (Firefox)
4. Ative as notificações
5. Vá em "Gerenciar Dispositivos"
6. **Resultado esperado**: 2 dispositivos listados

### 2. Teste Android
1. Instale o APK em um celular Android
2. Ative as notificações
3. Instale em outro celular Android
4. Ative as notificações
5. Acesse via web também
6. Vá em "Gerenciar Dispositivos"
7. **Resultado esperado**: Todos os dispositivos listados (Android + Web)

### 3. Teste de Desconexão
1. Vá em "Gerenciar Dispositivos"
2. Desconecte um dispositivo que NÃO seja o atual
3. **Resultado esperado**: Dispositivo removido da lista
4. Envie uma notificação de teste
5. **Resultado esperado**: Dispositivo removido não recebe notificação

### 4. Teste de Configurações por Dispositivo
1. No celular: Configure perfil "Trabalho"
2. No computador: Configure perfil "Silencioso"
3. Recarregue ambos os apps
4. **Resultado esperado**: Cada um mantém seu próprio perfil

## 🔒 Segurança

- ✅ Cada dispositivo é identificado por um `device_id` único gerado no frontend
- ✅ Usuários só podem ver/gerenciar seus próprios dispositivos (RLS)
- ✅ Desconexão de dispositivo remove token e configurações
- ✅ Desconexão só afeta o dispositivo específico, não todos

## 📝 Notas

1. **Migração automática**: Configurações antigas continuarão funcionando, mas sem `device_id`
2. **Limpeza recomendada**: Após a migração, delete registros antigos sem `device_id`
3. **iOS**: Quando implementar notificações iOS, funcionará automaticamente
4. **Device ID**: Armazenado no `localStorage`, único por navegador/app

## ❓ Troubleshooting

### "Não vejo meu dispositivo Android"
- Certifique-se de ter ativado as notificações no app Android
- Verifique se o token foi salvo (deve aparecer no contador)
- Olhe os logs do console no Chrome Remote Debugging

### "Dispositivos duplicados"
- Pode acontecer se limpar localStorage e ativar novamente
- Use "Gerenciar Dispositivos" para remover duplicatas

### "Contador mostra 0 mas tenho notificações ativadas"
- Execute a migração SQL: `docs/notification-settings-per-device.sql`
- Recarregue a página
- Verifique a tabela `notification_tokens` no Supabase
