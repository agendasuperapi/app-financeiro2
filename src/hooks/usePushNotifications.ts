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
          
          // Gerar ID único do dispositivo (persiste no localStorage)
          let deviceId = localStorage.getItem('device_id');
          if (!deviceId) {
            deviceId = `${platform}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('device_id', deviceId);
          }

          const tokenData = {
            user_id: user.id,
            token: token.value,
            platform: platform === 'ios' ? 'ios' : 'android',
            device_id: deviceId,
            last_used: new Date().toISOString()
          };
          
          console.log('💾 Salvando token no banco...', tokenData);
          
          // Agora usa o token como chave única, permitindo múltiplos dispositivos
          const { data: insertData, error: upsertError } = await supabase
            .from('notification_tokens' as any)
            .upsert(tokenData, {
              onConflict: 'token'
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

    // Verificar se já existe token salvo (reconexão)
    const { data: existingTokens } = await supabase
      .from('notification_tokens' as any)
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    if (existingTokens && existingTokens.length > 0) {
      console.log('✅ Token já existe no banco, não é necessário re-registrar');
      toast.success('Notificações já estão ativas!');
      return true;
    }

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

    // Prevenir múltiplos registros simultâneos
    if ((window as any).__nativePushRegistering) {
      console.log('⚠️ Registro já em andamento, aguarde...');
      toast.info('Aguarde, conectando notificações...');
      return false;
    }

    (window as any).__nativePushRegistering = true;

    console.log('📱 Registering for push notifications...');
    
    // Adicionar timeout para evitar travamentos
    const registerPromise = PushNotifications.register();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout ao registrar notificações')), 10000);
    });

    await Promise.race([registerPromise, timeoutPromise]);
    
    console.log('✅ Registered for push notifications, aguardando token do listener...');
    
    // Aguardar um pouco para o listener processar o token
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verificar se o token foi salvo
    const { data: savedToken } = await supabase
      .from('notification_tokens' as any)
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    (window as any).__nativePushRegistering = false;

    if (savedToken && savedToken.length > 0) {
      toast.success('✅ Notificações conectadas com sucesso!');
      return true;
    } else {
      console.warn('⚠️ Token não foi salvo após registro');
      toast.warning('Aguarde... processando conexão');
      return true;
    }
  } catch (error: any) {
    (window as any).__nativePushRegistering = false;
    console.error('❌ Error requesting permission:', error);
    
    if (error.message?.includes('Timeout')) {
      toast.error('Tempo limite excedido. Tente novamente.');
    } else {
      toast.error(`Erro ao solicitar permissão: ${error.message || error}`);
    }
    
    return false;
  }
};
