import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const usePushNotifications = () => {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const initPushNotifications = async () => {
      // Pedir permissão
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.log('Permissão de notificação negada');
        return;
      }

      // Registrar para receber notificações
      await PushNotifications.register();
    };

    // Listener para token registrado
    PushNotifications.addListener('registration', async (token: Token) => {
      console.log('✅ Push registration token:', token.value);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const platform = Capacitor.getPlatform();
      
      await supabase.from('notification_tokens' as any).upsert({
        user_id: user.id,
        token: token.value,
        platform: platform === 'ios' ? 'ios' : 'android'
      });
    });

    // Listener para erros
    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('❌ Push registration error:', error);
    });

    // Listener para notificação recebida
    PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        console.log('📬 Push notification recebida:', notification);
        toast(notification.title || 'Lembrete', {
          description: notification.body
        });
      }
    );

    // Listener para notificação clicada
    PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (notification: any) => {
        console.log('🔔 Notificação clicada:', notification);
        // Navegar para página de lembretes
        window.location.href = '/lembretes';
      }
    );

    initPushNotifications();

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, []);
};
