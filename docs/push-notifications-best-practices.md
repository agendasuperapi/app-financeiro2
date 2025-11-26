# 📱 Melhores Práticas para Notificações Push - Web e App

## 🎯 Problema Atual

O erro `crypto.ECDH not implemented` ocorre porque a biblioteca `web-push` usa APIs do Node.js que não estão disponíveis no Deno (usado pelo Supabase Edge Functions).

## ✅ Soluções Recomendadas

### **Opção 1: Usar FCM para TODAS as plataformas (RECOMENDADO) ⭐**

**Vantagens:**
- ✅ Funciona perfeitamente no Deno
- ✅ Uma única API para web, Android e iOS
- ✅ Mais simples de manter
- ✅ Melhor performance
- ✅ Suporte nativo do Firebase

**Como implementar:**

1. **Configurar Firebase para Web:**
   - Adicione o Firebase SDK no frontend
   - Configure FCM para web também
   - Use o mesmo `FCM_SERVER_KEY` para todas as plataformas

2. **Atualizar o registro de notificações web:**
   ```typescript
   // Em vez de usar Web Push API, use FCM
   import { getMessaging, getToken } from 'firebase/messaging';
   
   const messaging = getMessaging();
   const token = await getToken(messaging, {
     vapidKey: 'SEU_VAPID_KEY' // Ou use FCM token diretamente
   });
   ```

3. **Atualizar a Edge Function:**
   - Remova a função `sendWebPush`
   - Use apenas `sendFCM` para todas as plataformas
   - Marque todos os tokens como `platform: 'fcm'` ou mantenha 'web', 'android', 'ios' mas use FCM para todos

### **Opção 2: Serviço de Terceiros (OneSignal, Pusher, etc.)**

**Vantagens:**
- ✅ Funciona imediatamente
- ✅ Suporte completo para todas as plataformas
- ✅ Dashboard de analytics
- ✅ Não precisa gerenciar infraestrutura

**Desvantagens:**
- ❌ Custo (alguns têm planos gratuitos)
- ❌ Dependência externa

**Exemplo com OneSignal:**
```typescript
// Edge Function
const response = await fetch('https://onesignal.com/api/v1/notifications', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
  },
  body: JSON.stringify({
    app_id: ONESIGNAL_APP_ID,
    include_player_ids: [tokenData.token],
    contents: { en: body },
    headings: { en: title },
    data: data
  })
});
```

### **Opção 3: Edge Function em Node.js (Separada)**

**Como fazer:**
1. Crie uma Edge Function separada usando Node.js runtime
2. Use `web-push` normalmente
3. Chame essa função da sua função principal

**Limitação:** Supabase Edge Functions usam Deno por padrão. Você precisaria usar um serviço externo como Vercel Functions ou AWS Lambda.

### **Opção 4: Implementação Manual do Web Push (Complexa)**

Implementar o protocolo Web Push manualmente usando apenas APIs nativas do Deno. É possível, mas muito complexo e propenso a erros.

## 🚀 Implementação Recomendada: FCM para Tudo

### Passo 1: Instalar Firebase no Frontend

```bash
npm install firebase
```

### Passo 2: Configurar Firebase

```typescript
// src/integrations/firebase/config.ts
import { initializeApp } from 'firebase/app';
import { getMessaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  // ... outras configs
};

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);
```

### Passo 3: Atualizar registro de notificações web

```typescript
// src/services/notificationService.ts
import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '@/integrations/firebase/config';

export async function registerWebPushNotification() {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    // Obter token FCM
    const token = await getToken(messaging, {
      vapidKey: 'SEU_VAPID_KEY' // Do Firebase Console
    });

    if (!token) {
      console.error('❌ Não foi possível obter token FCM');
      return false;
    }

    // Salvar token no banco (usar platform: 'web' mas token é FCM)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    await supabase.from('notification_tokens').upsert({
      user_id: user.id,
      token: token,
      platform: 'web' // Ou 'fcm' se preferir
    });

    return true;
  } catch (error) {
    console.error('❌ Erro ao registrar FCM web:', error);
    return false;
  }
}
```

### Passo 4: Atualizar Edge Function

```typescript
// Usar FCM para TODAS as plataformas
async function sendNotification(tokenData: any, title: string, body: string, data: any) {
  const fcmServerKey = Deno.env.get('FCM_SERVER_KEY');
  
  const response = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `key=${fcmServerKey}`
    },
    body: JSON.stringify({
      to: tokenData.token, // Funciona para web, Android e iOS
      notification: {
        title,
        body,
        sound: 'default',
        icon: '/app-icon.png'
      },
      data: data
    })
  });

  if (!response.ok) {
    throw new Error(`FCM error: ${response.status}`);
  }

  return await response.json();
}
```

## 📋 Checklist de Implementação

### Para FCM (Recomendado):
- [ ] Criar projeto no Firebase Console
- [ ] Configurar FCM para Android (google-services.json)
- [ ] Configurar FCM para iOS (APNs certificate)
- [ ] Configurar FCM para Web (VAPID key)
- [ ] Obter FCM Server Key
- [ ] Adicionar FCM_SERVER_KEY nos secrets do Supabase
- [ ] Instalar Firebase SDK no frontend
- [ ] Atualizar registro de notificações para usar FCM
- [ ] Atualizar Edge Function para usar apenas FCM
- [ ] Testar em todas as plataformas

### Para Web Push (Alternativa):
- [ ] Gerar chaves VAPID
- [ ] Configurar VAPID nos secrets
- [ ] Usar serviço de terceiros OU
- [ ] Criar Edge Function separada em Node.js OU
- [ ] Implementar protocolo manualmente

## 🔧 Configuração Atual vs Recomendada

### ❌ Configuração Atual (Com Problemas):
- Web: Web Push API → Erro no Deno
- Android/iOS: FCM → Funciona ✅

### ✅ Configuração Recomendada:
- Web: FCM → Funciona ✅
- Android: FCM → Funciona ✅
- iOS: FCM → Funciona ✅

## 📚 Recursos

- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [FCM para Web](https://firebase.google.com/docs/cloud-messaging/js/client)
- [OneSignal Docs](https://documentation.onesignal.com/)
- [Web Push Protocol](https://datatracker.ietf.org/doc/html/rfc8030)

## 💡 Conclusão

**A melhor solução é usar FCM para todas as plataformas.** É mais simples, mais confiável e funciona perfeitamente no Deno. Você terá uma única API para gerenciar todas as notificações push.

