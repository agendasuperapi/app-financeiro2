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

    console.log('📱 Initializing push notifications on native platform');

    // Função para adicionar listeners
    const setupListeners = () => {
      // Listener para token registrado
      PushNotifications.addListener('registration', async (token: Token) => {
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
          }
        } catch (error) {
          console.error('❌ Error in registration listener:', error);
        }
      });

      // Listener para erros
      PushNotifications.addListener('registrationError', (error: any) => {
        console.error('❌ Push registration error:', error);
      });

      // Listener para notificação recebida
      PushNotifications.addListener(
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
      PushNotifications.addListener(
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
    };

    // Função de inicialização
    const initPushNotifications = async () => {
      try {
        console.log('📱 Checking permissions...');
        
        // Primeiro adicionar listeners
        setupListeners();
        
        // Depois verificar permissões
        let permStatus = await PushNotifications.checkPermissions();
        console.log('📱 Permission status:', permStatus);
        
        if (permStatus.receive === 'prompt') {
          console.log('📱 Requesting permissions...');
          permStatus = await PushNotifications.requestPermissions();
          console.log('📱 Permission after request:', permStatus);
        }

        if (permStatus.receive !== 'granted') {
          console.log('⚠️ Push notification permission denied');
          return;
        }

        // Registrar para receber notificações
        console.log('📱 Registering for push notifications...');
        await PushNotifications.register();
        console.log('✅ Push notifications registered successfully');
      } catch (error) {
        console.error('❌ Error initializing push notifications:', error);
      }
    };

    // Inicializar com delay para garantir que tudo está pronto
    const timeoutId = setTimeout(() => {
      initPushNotifications();
    }, 1000);


    return () => {
      clearTimeout(timeoutId);
      PushNotifications.removeAllListeners();
    };
  }, []);
};
