import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, BellOff, Smartphone, Globe, TestTube2, Volume2, Play, Briefcase, Home, VolumeX, Trash2, Monitor, TabletSmartphone } from 'lucide-react';
import { registerWebPushNotification, checkNotificationPermission, unregisterWebPushNotification, hasTokenSaved, sendTestNotification } from '@/services/notificationService';
import { requestPushNotificationPermission } from '@/hooks/usePushNotifications';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const SOUND_OPTIONS = [
  { value: 'default', label: '🔔 Padrão', description: 'Som padrão do sistema' },
  { value: 'alert', label: '⚠️ Alerta', description: 'Som de alerta urgente' },
  { value: 'success', label: '✅ Sucesso', description: 'Som suave e positivo' },
  { value: 'reminder', label: '⏰ Lembrete', description: 'Som de lembrete amigável' },
  { value: 'chime', label: '🎵 Chime', description: 'Som melodioso' },
  { value: 'silent', label: '🔇 Silencioso', description: 'Sem som' },
];

type NotificationProfile = 'trabalho' | 'casa' | 'silencioso' | 'custom';

interface ConnectedDevice {
  id: string;
  device_id: string;
  platform: string;
  created_at: string;
  last_used: string;
  device_name?: string;
}

const NOTIFICATION_PROFILES = {
  trabalho: {
    name: '💼 Trabalho',
    icon: Briefcase,
    soundType: 'alert',
    vibrationEnabled: true,
    description: 'Alertas importantes com som e vibração'
  },
  casa: {
    name: '🏠 Casa',
    icon: Home,
    soundType: 'default',
    vibrationEnabled: true,
    description: 'Notificações normais com som suave'
  },
  silencioso: {
    name: '🔇 Silencioso',
    icon: VolumeX,
    soundType: 'silent',
    vibrationEnabled: false,
    description: 'Apenas notificações visuais, sem som ou vibração'
  }
};

export const NotificationSettings = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [tokenSaved, setTokenSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [soundType, setSoundType] = useState('default');
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [activeProfile, setActiveProfile] = useState<NotificationProfile>('custom');
  const [deviceCount, setDeviceCount] = useState(0);
  const [connectedDevices, setConnectedDevices] = useState<ConnectedDevice[]>([]);
  const [showDeviceManager, setShowDeviceManager] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<string | null>(null);
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    const checkStatus = async () => {
      if (isNative) {
        // Native (Android/iOS): verificar permissão REAL do sistema primeiro
        const { PushNotifications } = await import('@capacitor/push-notifications');
        const permStatus = await PushNotifications.checkPermissions();
        
        console.log('📱 Permissão real do dispositivo:', permStatus.receive);
        
        // Mapear status do Capacitor para NotificationPermission
        let realPermission: NotificationPermission = 'default';
        if (permStatus.receive === 'granted') {
          realPermission = 'granted';
        } else if (permStatus.receive === 'denied') {
          realPermission = 'denied';
        }
        
        setPermission(realPermission);
        
        // Depois verificar se existe token salvo
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

    // Buscar TODOS os dispositivos (Android, iOS, Web)
    const { data: allTokens } = await supabase
      .from('notification_tokens' as any)
      .select('id, platform, device_id, created_at, last_used')
      .eq('user_id', user.id)
      .order('last_used', { ascending: false });

    const devices = (allTokens || []) as unknown as ConnectedDevice[];
    const count = devices.length;
    setDeviceCount(count);
    setConnectedDevices(devices);
    
    // Verificar se ESTE dispositivo tem token
    const deviceId = localStorage.getItem('device_id');
    const hasToken = devices.some(token => token.device_id === deviceId);
    setTokenSaved(hasToken);
    
    console.log('📊 Status nativo:', { 
      systemPermission: permStatus.receive, 
      tokenSaved: hasToken,
      deviceCount: count,
      allDevices: devices
    });
        return;
      }

      // Web: usar Notification API do navegador
      const perm = await checkNotificationPermission();
      setPermission(perm);
      
      if (perm === 'granted') {
        const saved = await hasTokenSaved();
        setTokenSaved(saved);
        
        // Contar TODOS os dispositivos (não só web)
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: allTokens } = await supabase
            .from('notification_tokens' as any)
            .select('id, platform, device_id, created_at, last_used')
            .eq('user_id', user.id)
            .order('last_used', { ascending: false });
          
          const devices = (allTokens || []) as unknown as ConnectedDevice[];
          const count = devices.length;
          setDeviceCount(count);
          setConnectedDevices(devices);
          console.log('📊 Status web:', { 
            permission: perm, 
            tokenSaved: saved, 
            deviceCount: count,
            allDevices: devices
          });
        }
      }
    };
    
    const loadSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Carregar configurações DESTE dispositivo
      const deviceId = localStorage.getItem('device_id');
      if (!deviceId) return;

      const { data, error } = await supabase
        .from('notification_settings' as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('device_id', deviceId)
        .maybeSingle();

      if (data && !error) {
        setSoundType((data as any).sound_type || 'default');
        setVibrationEnabled((data as any).vibration_enabled ?? true);
        setActiveProfile((data as any).active_profile || 'custom');
      }
    };

    checkStatus();
    loadSettings();
  }, [isNative]);

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    try {
      console.log('🔔 Tentando ativar notificações...');
      console.log('📱 Plataforma:', isNative ? 'Mobile (Capacitor)' : 'Web (PWA)');
      
      if (isNative) {
        console.log('📱 Usando Capacitor Push Notifications para mobile nativo');
        console.log('⚠️ ATENÇÃO: Certifique-se que o google-services.json está em android/app/');
        console.log('📖 Veja as instruções em: docs/CONFIGURAR_FCM_ANDROID.md');
        
        // Mobile: usar Capacitor Push Notifications
        const success = await requestPushNotificationPermission();
        if (success) {
          // Aguardar um pouco e recarregar o status
          setTimeout(async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const { data } = await supabase
                .from('notification_tokens' as any)
                .select('id')
                .eq('user_id', user.id);
              
              const hasToken = !!data && data.length > 0;
              setTokenSaved(hasToken);
              console.log('🔄 Status atualizado após registro:', hasToken);
            }
          }, 3000);
        } else {
          toast.error('❌ Não foi possível ativar as notificações');
        }
      } else {
        // Web: usar Web Push
        const success = await registerWebPushNotification();
        if (success) {
          toast.success('✅ Notificações ativadas com sucesso!');
          setPermission('granted');
          setTokenSaved(true);
        } else {
          toast.error('❌ Não foi possível ativar as notificações. Verifique o console (F12) para detalhes.');
        }
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast.error('❌ Erro ao ativar notificações');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    setIsDisabling(true);
    try {
      if (isNative) {
        // Mobile: remover apenas o token DESTE dispositivo
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error('❌ Usuário não autenticado');
          return;
        }

        // Pegar device_id do localStorage
        const deviceId = localStorage.getItem('device_id');
        if (!deviceId) {
          toast.error('❌ Device ID não encontrado');
          return;
        }

        const { error } = await supabase
          .from('notification_tokens' as any)
          .delete()
          .eq('user_id', user.id)
          .eq('device_id', deviceId);

        if (error) {
          console.error('Erro ao remover token de notificação nativo:', error);
          toast.error('❌ Erro ao desativar notificações no dispositivo');
        } else {
          toast.success('✅ Notificações desativadas neste dispositivo!');
          setTokenSaved(false);
          setPermission('default');
        }
      } else {
        // Web: usar serviço de Web Push (já deleta apenas o token do dispositivo atual)
        const success = await unregisterWebPushNotification();
        if (success) {
          toast.success('✅ Notificações desativadas com sucesso!');
          setPermission('default');
          setTokenSaved(false);
        } else {
          toast.error('❌ Erro ao desativar notificações');
        }
      }
    } catch (error) {
      console.error('Error disabling notifications:', error);
      toast.error('❌ Erro ao desativar notificações');
    } finally {
      setIsDisabling(false);
    }
  };

  const handleTestNotification = async () => {
    setIsTesting(true);
    try {
      const success = await sendTestNotification();
      if (success) {
        toast.success('🧪 Notificação de teste enviada! Verifique se apareceu.');
      } else {
        toast.error('❌ Erro ao enviar notificação de teste. Verifique o console (F12).');
      }
    } catch (error) {
      console.error('Error testing notification:', error);
      toast.error('❌ Erro ao testar notificação');
    } finally {
      setIsTesting(false);
    }
  };

  const applyProfile = async (profile: NotificationProfile) => {
    if (profile === 'custom') return;
    
    const profileConfig = NOTIFICATION_PROFILES[profile];
    setSoundType(profileConfig.soundType);
    setVibrationEnabled(profileConfig.vibrationEnabled);
    setActiveProfile(profile);
    
    // Salvar automaticamente para ESTE dispositivo
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const deviceId = localStorage.getItem('device_id');
      if (!deviceId) {
        toast.error('❌ Device ID não encontrado');
        return;
      }

      const platform = isNative ? 'android' : 'web';
      
      const updatePayload = {
        user_id: user.id,
        device_id: deviceId,
        platform: platform,
        sound_type: profileConfig.soundType,
        vibration_enabled: profileConfig.vibrationEnabled,
        notification_enabled: true,
        active_profile: profile,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('notification_settings' as any)
        .upsert(updatePayload, {
          onConflict: 'user_id,device_id'
        });

      if (error) {
        console.error('Erro ao salvar perfil de notificação:', error);
        throw error;
      }

      toast.success(`✅ Perfil "${profileConfig.name}" ativado neste dispositivo!`);
    } catch (error: any) {
      console.error('Error applying profile:', error);
      toast.error(`❌ Erro ao aplicar perfil: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const playSoundPreview = async (sound: string) => {
    setIsPlayingPreview(true);
    try {
      if (sound === 'silent') {
        toast.info('🔇 Modo silencioso - sem som');
        setIsPlayingPreview(false);
        return;
      }

      // Usando Web Audio API para gerar sons diferentes
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Configurar frequência e tipo de onda baseado no tipo de som
      switch (sound) {
        case 'default':
          oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
          oscillator.type = 'sine';
          break;
        case 'alert':
          oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
          oscillator.type = 'square';
          break;
        case 'success':
          oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime); // E5
          oscillator.type = 'sine';
          break;
        case 'reminder':
          oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4
          oscillator.type = 'triangle';
          break;
        case 'chime':
          oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime); // G5
          oscillator.type = 'sine';
          break;
      }

      // Envelope de volume para som mais natural
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);

      // Adicionar vibração se habilitada
      if (vibrationEnabled && 'vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }

      setTimeout(() => {
        setIsPlayingPreview(false);
        audioContext.close();
      }, 500);

      toast.success(`🔊 Preview: ${SOUND_OPTIONS.find(o => o.value === sound)?.label}`);
    } catch (error) {
      console.error('Error playing preview:', error);
      toast.error('❌ Erro ao reproduzir preview');
      setIsPlayingPreview(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('❌ Usuário não autenticado');
        return;
      }

      const deviceId = localStorage.getItem('device_id');
      if (!deviceId) {
        toast.error('❌ Device ID não encontrado');
        return;
      }

      const platform = isNative ? 'android' : 'web';

      const updatePayload = {
        user_id: user.id,
        device_id: deviceId,
        platform: platform,
        sound_type: soundType,
        vibration_enabled: vibrationEnabled,
        notification_enabled: true,
        active_profile: 'custom',
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('notification_settings' as any)
        .upsert(updatePayload, {
          onConflict: 'user_id,device_id'
        });

      if (error) {
        console.error('Erro ao salvar configurações de notificação:', error);
        throw error;
      }

      setActiveProfile('custom');
      toast.success('✅ Configurações personalizadas salvas neste dispositivo!');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error(`❌ Erro ao salvar configurações: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Deletar token
      const { error: tokenError } = await supabase
        .from('notification_tokens' as any)
        .delete()
        .eq('user_id', user.id)
        .eq('device_id', deviceId);

      if (tokenError) throw tokenError;

      // Deletar configurações
      await supabase
        .from('notification_settings' as any)
        .delete()
        .eq('user_id', user.id)
        .eq('device_id', deviceId);

      // Atualizar lista
      const newDevices = connectedDevices.filter(d => d.device_id !== deviceId);
      setConnectedDevices(newDevices);
      setDeviceCount(newDevices.length);

      // Se deletou o dispositivo atual, atualizar status
      const currentDeviceId = localStorage.getItem('device_id');
      if (deviceId === currentDeviceId) {
        setTokenSaved(false);
      }

      toast.success('✅ Dispositivo desconectado com sucesso!');
      setDeviceToDelete(null);
    } catch (error: any) {
      console.error('Error deleting device:', error);
      toast.error('❌ Erro ao desconectar dispositivo');
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'android':
      case 'ios':
        return <Smartphone className="h-4 w-4" />;
      case 'web':
        return <Monitor className="h-4 w-4" />;
      default:
        return <TabletSmartphone className="h-4 w-4" />;
    }
  };

  const getPlatformName = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'android':
        return 'Android';
      case 'ios':
        return 'iOS';
      case 'web':
        return 'Web';
      default:
        return platform;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'short' 
    });
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
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm">Permissão do navegador:</span>
                <span className={`text-sm font-medium ${
                  permission === 'granted' ? 'text-green-600' : 
                  permission === 'denied' ? 'text-red-600' : 
                  'text-yellow-600'
                }`}>
                  {permission === 'granted' ? '✅ Concedida' : 
                   permission === 'denied' ? '🚫 Bloqueada' : 
                   '⏸️ Não solicitada'}
                </span>
              </div>
              
              {permission === 'granted' && (
                <>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="text-sm">Token salvo no banco:</span>
                    <span className={`text-sm font-medium ${
                      tokenSaved ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {tokenSaved ? '✅ Sim' : '❌ Não'}
                    </span>
                  </div>
                  
                  {deviceCount > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                        <span className="text-sm font-medium">📱 Dispositivos conectados:</span>
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                          {deviceCount} {deviceCount === 1 ? 'dispositivo' : 'dispositivos'}
                        </span>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setShowDeviceManager(true)}
                      >
                        <Smartphone className="h-4 w-4 mr-2" />
                        Gerenciar Dispositivos
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>

            {permission === 'denied' && (
              <Alert className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
                <AlertDescription className="text-sm space-y-3">
                  <p className="font-medium">🚫 As notificações estão bloqueadas</p>
                  <p>Para ativar, você precisa desbloquear nas configurações do navegador:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Clique no ícone de <strong>cadeado</strong> na barra de endereços</li>
                    <li>Procure por <strong>"Notificações"</strong></li>
                    <li>Mude para <strong>"Permitir"</strong></li>
                    <li>Recarregue esta página</li>
                  </ol>
                </AlertDescription>
              </Alert>
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

            {permission === 'granted' && (
              <div className="space-y-2">
                <Button 
                  onClick={handleDisableNotifications} 
                  variant="outline"
                  className="w-full"
                  disabled={isDisabling}
                >
                  {isDisabling ? 'Desativando...' : 'Desativar Notificações'}
                </Button>
                
                {tokenSaved && (
                  <Button 
                    onClick={handleTestNotification} 
                    variant="secondary"
                    className="w-full"
                    disabled={isTesting}
                  >
                    <TestTube2 className="h-4 w-4 mr-2" />
                    {isTesting ? 'Enviando teste...' : 'Testar Notificação'}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {isNative && (
          <div className="space-y-3">
            {/* Status da permissão do sistema */}
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm">Permissão do sistema:</span>
                <span className={`text-sm font-medium ${
                  permission === 'granted' ? 'text-green-600' : 
                  permission === 'denied' ? 'text-red-600' : 
                  'text-yellow-600'
                }`}>
                  {permission === 'granted' ? '✅ Permitida' : 
                   permission === 'denied' ? '🚫 Negada' : 
                   '⏸️ Não solicitada'}
                </span>
              </div>
              
              {permission === 'granted' && (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm">Status no dispositivo:</span>
                  <span className={cn('text-sm font-medium', tokenSaved ? 'text-green-600' : 'text-red-600')}>
                    {tokenSaved ? '✅ Conectado' : '❌ Não conectado'}
                  </span>
                </div>
              )}
            </div>

            {/* Alerta quando permissão negada */}
            {permission === 'denied' && (
              <Alert className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
                <AlertDescription className="text-sm space-y-3">
                  <p className="font-medium">🚫 As notificações estão bloqueadas</p>
                  <p>Para ativar, você precisa desbloquear nas configurações do Android:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Abra as <strong>Configurações</strong> do Android</li>
                    <li>Vá em <strong>Aplicativos</strong></li>
                    <li>Encontre <strong>App Financeiro</strong></li>
                    <li>Toque em <strong>Notificações</strong></li>
                    <li>Ative <strong>Permitir notificações</strong></li>
                    <li>Volte aqui e toque em "Ativar Notificações"</li>
                  </ol>
                </AlertDescription>
              </Alert>
            )}

            {/* Botão de ativar (só aparece se não estiver granted) */}
            {permission !== 'granted' && (
              <>
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
              </>
            )}

            {/* Controles quando conectado */}
            {permission === 'granted' && tokenSaved && (
              <div className="space-y-2">
                <Button 
                  onClick={handleTestNotification} 
                  variant="secondary"
                  className="w-full"
                  disabled={isTesting}
                >
                  <TestTube2 className="h-4 w-4 mr-2" />
                  {isTesting ? 'Enviando teste...' : 'Testar Notificação no Celular'}
                </Button>

                <Button 
                  onClick={handleDisableNotifications} 
                  variant="outline"
                  className="w-full"
                  disabled={isDisabling}
                >
                  {isDisabling ? 'Desativando...' : 'Desativar Notificações neste Dispositivo'}
                </Button>
              </div>
            )}

            {/* Caso esteja granted mas sem token */}
            {permission === 'granted' && !tokenSaved && (
              <Button 
                onClick={handleEnableNotifications} 
                variant="outline"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'Reconectando...' : '🔄 Reconectar Notificações'}
              </Button>
            )}
          </div>
        )}


        {permission === 'granted' && tokenSaved && (
          <>
            <Card className="mt-6 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bell className="h-5 w-5" />
                  Perfis de Notificação
                </CardTitle>
                <CardDescription>
                  Alterne rapidamente entre perfis pré-configurados
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 gap-2">
                  {(Object.keys(NOTIFICATION_PROFILES) as NotificationProfile[]).map((profileKey) => {
                    const profile = NOTIFICATION_PROFILES[profileKey];
                    const Icon = profile.icon;
                    const isActive = activeProfile === profileKey;
                    
                    return (
                      <Button
                        key={profileKey}
                        variant={isActive ? "default" : "outline"}
                        className={cn(
                          "w-full justify-start h-auto py-3",
                          isActive && "ring-2 ring-primary"
                        )}
                        onClick={() => applyProfile(profileKey)}
                      >
                        <div className="flex items-start gap-3 text-left w-full">
                          <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">{profile.name}</div>
                            <div className="text-xs opacity-80 mt-0.5">
                              {profile.description}
                            </div>
                          </div>
                          {isActive && (
                            <div className="text-xs font-medium bg-primary-foreground/20 px-2 py-1 rounded">
                              Ativo
                            </div>
                          )}
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="mt-4 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Volume2 className="h-5 w-5" />
                  Configurações Personalizadas
                  {activeProfile === 'custom' && (
                    <span className="text-xs font-normal bg-primary/10 px-2 py-1 rounded ml-auto">
                      Ativo
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  Ajuste manualmente som e vibração
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sound-select">Som da Notificação</Label>
                <div className="flex gap-2">
                  <Select value={soundType} onValueChange={setSoundType}>
                    <SelectTrigger id="sound-select" className="flex-1">
                      <SelectValue placeholder="Selecione um som" />
                    </SelectTrigger>
                    <SelectContent>
                      {SOUND_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex flex-col">
                            <span className="font-medium">{option.label}</span>
                            <span className="text-xs text-muted-foreground">{option.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => playSoundPreview(soundType)}
                    disabled={isPlayingPreview}
                    title="Testar som"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5">
                  <Label htmlFor="vibration-toggle">Vibração</Label>
                  <p className="text-sm text-muted-foreground">
                    Ativar vibração nas notificações
                  </p>
                </div>
                <Switch
                  id="vibration-toggle"
                  checked={vibrationEnabled}
                  onCheckedChange={setVibrationEnabled}
                />
              </div>

              <Button 
                onClick={handleSaveSettings}
                className="w-full"
                disabled={isSaving}
              >
                {isSaving ? 'Salvando...' : 'Salvar Configurações Personalizadas'}
              </Button>
            </CardContent>
          </Card>
          </>
        )}

        <div className="pt-4 space-y-2 text-xs text-muted-foreground">
          <p className="flex items-start gap-2">
            <span>•</span>
            <span>Você receberá notificações 10 minutos antes dos lembretes</span>
          </p>
          <p className="flex items-start gap-2">
            <span>•</span>
            <span>As notificações funcionam mesmo com o app fechado</span>
          </p>
          <p className="flex items-start gap-2">
            <span>•</span>
            <span>Cada dispositivo pode ter suas próprias configurações</span>
          </p>
        </div>
      </CardContent>

      {/* Modal de Gerenciamento de Dispositivos */}
      <AlertDialog open={showDeviceManager} onOpenChange={setShowDeviceManager}>
        <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Dispositivos Conectados
            </AlertDialogTitle>
            <AlertDialogDescription>
              Gerencie todos os dispositivos que recebem notificações
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex-1 overflow-y-auto space-y-2 py-4">
            {connectedDevices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Smartphone className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum dispositivo conectado</p>
              </div>
            ) : (
              connectedDevices.map((device) => {
                const isCurrentDevice = device.device_id === localStorage.getItem('device_id');
                
                return (
                  <div
                    key={device.id}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-lg border",
                      isCurrentDevice 
                        ? "bg-primary/5 border-primary/20" 
                        : "bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 rounded-full bg-background">
                        {getPlatformIcon(device.platform)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {getPlatformName(device.platform)}
                          </span>
                          {isCurrentDevice && (
                            <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                              Este dispositivo
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Última atividade: {formatDate(device.last_used || device.created_at)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ID: {device.device_id.substring(0, 20)}...
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeviceToDelete(device.device_id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Fechar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Confirmação de Exclusão */}
      <AlertDialog open={!!deviceToDelete} onOpenChange={() => setDeviceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desconectar Dispositivo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desconectar este dispositivo? Ele não receberá mais notificações push.
              {deviceToDelete === localStorage.getItem('device_id') && (
                <p className="mt-2 text-yellow-600 dark:text-yellow-500 font-medium">
                  ⚠️ Este é o dispositivo atual. Você precisará ativar as notificações novamente para recebê-las.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deviceToDelete && handleDeleteDevice(deviceToDelete)}
            >
              Desconectar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
