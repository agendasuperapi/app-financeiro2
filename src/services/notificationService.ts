import { supabase } from '@/integrations/supabase/client';
import { getFCMToken, setupForegroundMessageListener, messaging } from '@/integrations/firebase/config';
import { toast } from 'sonner';

/**
 * Registra notificações push usando FCM (Firebase Cloud Messaging)
 * Funciona para Web, Android e iOS
 */
export async function registerWebPushNotification() {
  // Verificar se o navegador suporta notificações
  if (!('Notification' in window)) {
    console.log('❌ Notificações não suportadas neste navegador');
    return false;
  }

  try {
    console.log('🔔 Iniciando registro de notificações FCM...');
    
    // Pedir permissão
    const permission = await Notification.requestPermission();
    console.log('📱 Permissão:', permission);
    if (permission !== 'granted') {
      console.log('❌ Permissão de notificação negada');
      toast.error('Permissão de notificação negada');
      return false;
    }

    // Verificar se Firebase está configurado
    if (!messaging) {
      console.error('❌ Firebase Messaging não está configurado');
      console.error('💡 Configure as variáveis de ambiente do Firebase (VITE_FIREBASE_*)');
      toast.error('Firebase não configurado. Verifique as variáveis de ambiente.');
      return false;
    }

    // Registrar service worker para FCM
    console.log('⚙️ Registrando service worker para FCM...');
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      console.log('✅ Service worker registrado');
    } catch (swError) {
      console.warn('⚠️ Erro ao registrar service worker:', swError);
      // Continuar mesmo se o service worker falhar
    }

    // Obter token FCM
    console.log('🔑 Obtendo token FCM...');
    const token = await getFCMToken();
    
    if (!token) {
      console.error('❌ Não foi possível obter token FCM');
      toast.error('Erro ao obter token de notificação');
      return false;
    }

    console.log('✅ Token FCM obtido:', token.substring(0, 20) + '...');

    // Salvar token no banco
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ Usuário não autenticado');
      toast.error('Você precisa estar logado para ativar notificações');
      return false;
    }

    // Generate unique device_id for this browser
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = `web-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('device_id', deviceId);
    }

    console.log('💾 Salvando token FCM no banco...');
    const { error: saveError } = await supabase.from('notification_tokens' as any).upsert({
      user_id: user.id,
      token: token,
      platform: 'web',
      device_id: deviceId,
      last_used: new Date().toISOString(),
      endpoint: '', // Não necessário para FCM
      p256dh: '', // Não necessário para FCM
      auth: '' // Não necessário para FCM
    }, {
      onConflict: 'token'
    });

    if (saveError) {
      console.error('❌ Erro ao salvar token:', saveError);
      toast.error('Erro ao salvar token de notificação');
      return false;
    }

    // Configurar listener para mensagens em foreground
    setupForegroundMessageListener((payload) => {
      console.log('📬 Notificação recebida em foreground:', payload);
      toast.info(payload.notification?.title || 'Nova notificação', {
        description: payload.notification?.body
      });
    });

    console.log('✅ Notificações FCM registradas com sucesso!');
    toast.success('Notificações ativadas com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao registrar notificações FCM:', error);
    toast.error('Erro ao ativar notificações');
    return false;
  }
}

/**
 * Desregistra notificações push apenas DESTE dispositivo
 */
export async function unregisterWebPushNotification() {
  try {
    // Remover token APENAS deste dispositivo
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Pegar device_id do localStorage
      const deviceId = localStorage.getItem('device_id') || 'web-default';
      
      const { error } = await supabase
        .from('notification_tokens' as any)
        .delete()
        .eq('user_id', user.id)
        .eq('device_id', deviceId);
      
      if (error) {
        console.error('❌ Erro ao remover token:', error);
        throw error;
      }
    }

    console.log('✅ Notificações desativadas neste dispositivo');
    toast.success('Notificações desativadas neste dispositivo');
    return true;
  } catch (error) {
    console.error('❌ Erro ao desativar notificações:', error);
    toast.error('Erro ao desativar notificações');
    return false;
  }
}

/**
 * Verifica se o usuário tem permissão para notificações
 */
export async function checkNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Verifica se há um token salvo no banco
 */
export async function hasTokenSaved(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const deviceId = localStorage.getItem('device_id');
    if (!deviceId) return false;

    const { data, error } = await supabase
      .from('notification_tokens' as any)
      .select('id')
      .eq('user_id', user.id)
      .eq('device_id', deviceId)
      .maybeSingle();

    return !error && !!data;
  } catch {
    return false;
  }
}

/**
 * Envia uma notificação de teste
 */
export async function sendTestNotification() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ Usuário não autenticado');
      toast.error('Você precisa estar logado');
      return false;
    }

    console.log('🧪 Enviando notificação de teste para userId:', user.id);
    
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: {
        userId: user.id,
        title: '🧪 Teste de Notificação',
        body: 'Se você viu isso, suas notificações estão funcionando! 🎉',
        data: { test: true }
      }
    });

    if (error) {
      console.error('❌ Erro ao enviar notificação de teste:', error);
      toast.error('Erro ao enviar notificação de teste');
      return false;
    }

    console.log('✅ Resposta da função send-notification:', data);
    toast.success('Notificação de teste enviada!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao enviar notificação de teste:', error);
    toast.error('Erro ao enviar notificação de teste');
    return false;
  }
}
