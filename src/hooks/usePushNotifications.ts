import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const usePushNotifications = () => {
  // Flag simples para evitar múltiplos registros nativos simultâneos
  // (não persiste entre reinicializações do app, mas já evita crashes por cliques repetidos)
  
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
            toast.error('Erro ao obter usuário');
            return;
          }
          
          if (!user) {
            console.log('⚠️ User not authenticated, skipping token save');
            toast.error('Usuário não autenticado');
            return;
          }

          const platform = Capacitor.getPlatform();
          console.log('📱 Platform detected:', platform);
          console.log('👤 User ID:', user.id);
          console.log('🔑 Token a salvar:', token.value.substring(0, 20) + '...');
          
          const tokenData = {
            user_id: user.id,
            token: token.value,
            platform: platform === 'ios' ? 'ios' : 'android'
          };
          
          console.log('💾 Salvando token no banco...', tokenData);
          
          const { data: insertData, error: upsertError } = await supabase
            .from('notification_tokens' as any)
            .upsert(tokenData, {
              onConflict: 'user_id,platform'
            })
            .select();
          
          if (upsertError) {
            console.error('❌ Error saving token:', upsertError);
            toast.error(`Erro ao salvar token: ${upsertError.message}`);
          } else {
            console.log('✅ Token saved successfully:', insertData);
            toast.success('✅ Notificações ativadas! Token salvo no banco.');
          }
        } catch (error) {
          console.error('❌ Error in registration listener:', error);
          toast.error('Erro ao processar token');
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
      console.error('❌ User must be authenticated to enable notifications');
      toast.error('Você precisa estar logado para ativar notificações');
      return false;
    }
    
    console.log('👤 User authenticated:', user.id);

    // Verificar permissões
    let permStatus = await PushNotifications.checkPermissions();
    console.log('📱 Current permission status:', permStatus);
    
    if (permStatus.receive === 'prompt') {
      console.log('📱 Requesting permissions from user...');
      permStatus = await PushNotifications.requestPermissions();
      console.log('📱 Permission after request:', permStatus);
    }

    if (permStatus.receive !== 'granted') {
      console.log('⚠️ Permission denied by user');
      toast.error('Permissão de notificação negada');
      return false;
    }

    console.log('✅ Permission granted!');

    // Se já está tudo concedido, evitar múltiplos registros que podem causar crash
    if ((window as any).__nativePushAlreadyRegistered) {
      console.log('📱 Push já estava registrado, evitando novo registro');
      toast.success('Notificações já estão ativas neste dispositivo');
      return true;
    }

    console.log('📱 Registering for push notifications...');
    // Registrar para push (feito apenas uma vez por sessão)
    await PushNotifications.register();
    (window as any).__nativePushAlreadyRegistered = true;
    console.log('✅ Registered for push notifications, aguardando token do listener...');
    
    return true;
  } catch (error) {
    console.error('❌ Error requesting permission:', error);
    toast.error(`Erro ao solicitar permissão: ${error}`);
    return false;
  }
};
