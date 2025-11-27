import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, BellOff, Smartphone, Globe, TestTube2, Volume2, Play, Briefcase, Home, VolumeX } from 'lucide-react';
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

const SOUND_OPTIONS = [
  { value: 'default', label: '🔔 Padrão', description: 'Som padrão do sistema' },
  { value: 'alert', label: '⚠️ Alerta', description: 'Som de alerta urgente' },
  { value: 'success', label: '✅ Sucesso', description: 'Som suave e positivo' },
  { value: 'reminder', label: '⏰ Lembrete', description: 'Som de lembrete amigável' },
  { value: 'chime', label: '🎵 Chime', description: 'Som melodioso' },
  { value: 'silent', label: '🔇 Silencioso', description: 'Sem som' },
];

type NotificationProfile = 'trabalho' | 'casa' | 'silencioso' | 'custom';

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
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    const checkStatus = async () => {
      const perm = await checkNotificationPermission();
      setPermission(perm);
      
      if (perm === 'granted') {
        const saved = await hasTokenSaved();
        setTokenSaved(saved);
        console.log('📊 Status:', { permission: perm, tokenSaved: saved });
      }
    };
    
    const loadSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notification_settings' as any)
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data && !error) {
        setSoundType((data as any).sound_type || 'default');
        setVibrationEnabled((data as any).vibration_enabled ?? true);
        setActiveProfile((data as any).active_profile || 'custom');
      } else if (error && error.code === 'PGRST116') {
        // Criar configurações padrão se não existir
        await supabase.from('notification_settings' as any).insert({
          user_id: user.id,
          sound_type: 'default',
          vibration_enabled: true,
          notification_enabled: true,
          active_profile: 'custom'
        });
      }
    };

    if (!isNative) {
      checkStatus();
    }
    loadSettings();
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
      const success = await unregisterWebPushNotification();
      if (success) {
        toast.success('✅ Notificações desativadas com sucesso!');
        setPermission('default');
        setTokenSaved(false);
      } else {
        toast.error('❌ Erro ao desativar notificações');
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
    
    // Salvar automaticamente
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notification_settings' as any)
        .upsert({
          user_id: user.id,
          sound_type: profileConfig.soundType,
          vibration_enabled: profileConfig.vibrationEnabled,
          notification_enabled: true,
          active_profile: profile,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success(`✅ Perfil "${profileConfig.name}" ativado!`);
    } catch (error) {
      console.error('Error applying profile:', error);
      toast.error('❌ Erro ao aplicar perfil');
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

      const { error } = await supabase
        .from('notification_settings' as any)
        .upsert({
          user_id: user.id,
          sound_type: soundType,
          vibration_enabled: vibrationEnabled,
          notification_enabled: true,
          active_profile: 'custom',
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setActiveProfile('custom');
      toast.success('✅ Configurações personalizadas salvas!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('❌ Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
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
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm">Token salvo no banco:</span>
                  <span className={`text-sm font-medium ${
                    tokenSaved ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {tokenSaved ? '✅ Sim' : '❌ Não'}
                  </span>
                </div>
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
            <span>Você pode personalizar o som e vibração acima</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
