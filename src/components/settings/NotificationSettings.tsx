import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, BellOff, Smartphone, Globe } from 'lucide-react';
import { registerWebPushNotification, checkNotificationPermission } from '@/services/notificationService';
import { requestPushNotificationPermission } from '@/hooks/usePushNotifications';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';

export const NotificationSettings = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(false);
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    const checkPermission = async () => {
      const perm = await checkNotificationPermission();
      setPermission(perm);
    };
    if (!isNative) {
      checkPermission();
    }
  }, [isNative]);

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    try {
      if (isNative) {
        // Mobile: usar Capacitor Push Notifications
        const success = await requestPushNotificationPermission();
        if (!success) {
          toast.error('❌ Não foi possível ativar as notificações');
        }
      } else {
        // Web: usar Web Push
        const success = await registerWebPushNotification();
        if (success) {
          toast.success('✅ Notificações ativadas com sucesso!');
          setPermission('granted');
        } else {
          toast.error('❌ Não foi possível ativar as notificações');
        }
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast.error('❌ Erro ao ativar notificações');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notificações Push
        </CardTitle>
        <CardDescription>
          Receba lembretes automáticos quando chegar a hora das suas transações programadas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {isNative ? (
            <>
              <Smartphone className="h-4 w-4" />
              <span>Notificações Mobile (Android/iOS)</span>
            </>
          ) : (
            <>
              <Globe className="h-4 w-4" />
              <span>Notificações Web (PWA)</span>
            </>
          )}
        </div>

        {!isNative && (
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm">Status:</span>
              <span className={`text-sm font-medium ${
                permission === 'granted' ? 'text-green-600' : 
                permission === 'denied' ? 'text-red-600' : 
                'text-yellow-600'
              }`}>
                {permission === 'granted' ? '✅ Ativadas' : 
                 permission === 'denied' ? '🚫 Bloqueadas' : 
                 '⏸️ Desativadas'}
              </span>
            </div>

            {permission === 'denied' && (
              <div className="text-xs text-muted-foreground p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                As notificações estão bloqueadas. Para ativar, vá nas configurações do navegador e permita notificações para este site.
              </div>
            )}

            {permission !== 'granted' && permission !== 'denied' && (
              <Button 
                onClick={handleEnableNotifications} 
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Ativando...' : 'Ativar Notificações'}
              </Button>
            )}
          </div>
        )}

        {isNative && (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
              Toque no botão abaixo para ativar as notificações no seu celular. Você precisará permitir quando solicitado.
            </div>
            <Button 
              onClick={handleEnableNotifications} 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Ativando...' : 'Ativar Notificações Mobile'}
            </Button>
          </div>
        )}

        <div className="pt-4 space-y-2 text-xs text-muted-foreground">
          <p className="flex items-start gap-2">
            <span>•</span>
            <span>Você receberá notificações 5 minutos antes dos lembretes</span>
          </p>
          <p className="flex items-start gap-2">
            <span>•</span>
            <span>As notificações funcionam mesmo com o app fechado</span>
          </p>
          <p className="flex items-start gap-2">
            <span>•</span>
            <span>Você pode desativar a qualquer momento nas configurações</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
