import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const usePushNotifications = () => {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      console.log('📱 Not on native platform, skipping push notifications');
      return;
    }

    console.log('📱 Setting up push notification listeners');

    let registrationListener: any;
    let errorListener: any;
    let notificationListener: any;
    let actionListener: any;

    // Configurar listeners
    const setupListeners = async () => {
      // Listener para token registrado
      registrationListener = await PushNotifications.addListener('registration', async (token: Token) => {
        try {
          console.log('✅ Push registration token received:', token.value);
          
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError) {
            console.error('❌ Error getting user:', userError);
            return;
          }
          
          if (!user) {
            console.log('⚠️ User not authenticated, skipping token save');
            return;
          }

          const platform = Capacitor.getPlatform();
          console.log('📱 Platform detected:', platform);
          
          const { error: upsertError } = await supabase.from('notification_tokens' as any).upsert({
            user_id: user.id,
            token: token.value,
            platform: platform === 'ios' ? 'ios' : 'android'
          });
          
          if (upsertError) {
            console.error('❌ Error saving token:', upsertError);
          } else {
            console.log('✅ Token saved successfully');
            toast.success('Notificações ativadas com sucesso!');
          }
        } catch (error) {
          console.error('❌ Error in registration listener:', error);
        }
      });

      // Listener para erros
      errorListener = await PushNotifications.addListener('registrationError', (error: any) => {
        console.error('❌ Push registration error:', error);
        toast.error('Erro ao ativar notificações');
      });

      // Listener para notificação recebida
      notificationListener = await PushNotifications.addListener(
        'pushNotificationReceived',
        (notification: PushNotificationSchema) => {
          try {
            console.log('📬 Push notification received:', notification);
            toast(notification.title || 'Lembrete', {
              description: notification.body
            });
          } catch (error) {
            console.error('❌ Error handling notification:', error);
          }
        }
      );

      // Listener para notificação clicada
      actionListener = await PushNotifications.addListener(
        'pushNotificationActionPerformed',
        (notification: any) => {
          try {
            console.log('🔔 Notification clicked:', notification);
            window.location.href = '/lembretes';
          } catch (error) {
            console.error('❌ Error handling notification click:', error);
          }
        }
      );

      console.log('✅ Push notification listeners configured');
    };

    setupListeners();


    return () => {
      if (registrationListener) registrationListener.remove();
      if (errorListener) errorListener.remove();
      if (notificationListener) notificationListener.remove();
      if (actionListener) actionListener.remove();
    };
  }, []);
};

// Função para ativar notificações manualmente
export const requestPushNotificationPermission = async () => {
  if (!Capacitor.isNativePlatform()) {
    console.log('Not on native platform');
    return false;
  }

  try {
    console.log('📱 Requesting push notification permission...');
    
    // Verificar se o usuário está autenticado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('User must be authenticated to enable notifications');
      toast.error('Você precisa estar logado para ativar notificações');
      return false;
    }

    // Verificar permissões
    let permStatus = await PushNotifications.checkPermissions();
    console.log('📱 Current permission status:', permStatus);
    
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
      console.log('📱 Permission after request:', permStatus);
    }

    if (permStatus.receive !== 'granted') {
      console.log('⚠️ Permission denied');
      toast.error('Permissão de notificação negada');
      return false;
    }

    // Registrar para push
    await PushNotifications.register();
    console.log('✅ Registered for push notifications');
    
    return true;
  } catch (error) {
    console.error('❌ Error requesting permission:', error);
    toast.error('Erro ao solicitar permissão de notificação');
    return false;
  }
};
