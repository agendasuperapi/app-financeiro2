import React, { useState, useEffect, useRef } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useAppContext } from '@/contexts/AppContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Phone, Camera, Mail, Key, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DependentsTab from '@/components/profile/DependentsTab';
import CategoriesTab from '@/components/profile/CategoriesTab';
import ContasTab from '@/components/profile/ContasTab';
import PreferencesTab from '@/components/settings/PreferencesTab';
import PlansTab from '@/components/profile/PlansTab';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
const ProfilePage = () => {
  const {
    t
  } = usePreferences();
  const {
    user,
    updateUserProfile
  } = useAppContext();
  const {
    isAdmin
  } = useUserRole();
  const location = useLocation();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profileImage, setProfileImage] = useState(user?.profileImage || '');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Estado para controlar a aba ativa com persistência
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('profileActiveTab') || 'info';
  });

  // For password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const {
    toast
  } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Verificar se é admin vindo da página admin
  const isAdminFromAdminPage = isAdmin && document.referrer.includes('/admin');

  // Salvar aba ativa no localStorage
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    localStorage.setItem('profileActiveTab', value);
  };

  // Fetch the latest user data from Supabase
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const {
          data: {
            session
          }
        } = await supabase.auth.getSession();
        if (session?.user?.id) {
          const {
            data,
            error
          } = await supabase.from('poupeja_users').select('*').eq('id', session.user.id).single();
          if (data && !error) {
            setName(data.name || '');
            setEmail(session.user.email || '');
            setPhone(data.phone || '');
            setProfileImage(data.profile_image || '');
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };
    fetchUserData();
  }, [user?.id]);
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUpdatingProfile(true);
    try {
      console.log('ProfilePage: Updating profile...');

      // Format phone number to ensure it only contains digits
      const formattedPhone = phone.replace(/\D/g, '');

      // Check if email changed
      const emailChanged = email !== user?.email;

      // Update profile data using context method
      console.log('ProfilePage: Updating profile data:', {
        name,
        phone: formattedPhone,
        profileImage
      });
      await updateUserProfile({
        name,
        phone: formattedPhone,
        profileImage
      });

      // Update email if changed
      if (emailChanged) {
        console.log('ProfilePage: Updating user email');
        const {
          error: updateEmailError
        } = await supabase.functions.invoke('update-user-email', {
          body: {
            email
          }
        });
        if (updateEmailError) {
          console.error('ProfilePage: Error updating email:', updateEmailError);
          toast({
            title: t('common.error'),
            description: 'Erro ao atualizar email',
            variant: 'destructive'
          });
          return;
        }
      }

      // Show success message
      toast({
        title: t('common.success'),
        description: 'Perfil atualizado com sucesso'
      });
      setIsEditing(false);
      console.log('ProfilePage: Profile update completed successfully');
    } catch (error) {
      console.error("ProfilePage: Error updating profile:", error);
      toast({
        title: t('common.error'),
        description: 'Erro ao atualizar perfil',
        variant: 'destructive'
      });
    } finally {
      setUpdatingProfile(false);
    }
  };
  const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({
        title: t('common.error'),
        description: 'As senhas não coincidem',
        variant: 'destructive'
      });
      return;
    }
    setChangingPassword(true);
    try {
      const {
        error
      } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;
      toast({
        title: t('common.success'),
        description: 'Senha alterada com sucesso'
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error updating password:', error);
      toast({
        title: t('common.error'),
        description: 'Erro ao alterar senha',
        variant: 'destructive'
      });
    } finally {
      setChangingPassword(false);
    }
  };
  const handleImageClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      // Upload image to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const {
        data,
        error
      } = await supabase.storage.from('avatars').upload(`public/${fileName}`, file);
      if (error) {
        throw error;
      }

      // Get the public URL
      const {
        data: urlData
      } = supabase.storage.from('avatars').getPublicUrl(`public/${fileName}`);
      setProfileImage(urlData.publicUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: t('common.error'),
        description: 'Erro ao fazer upload da imagem',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };
  if (isAdminFromAdminPage) {
    return <MainLayout title="Perfil do Administrador">
        <div className="space-y-6 pb-16">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Perfil do Administrador</h1>
            <p className="text-muted-foreground">Gerencie suas informações de acesso</p>
          </div>
          
          <Separator />
          
          <div className="grid gap-6 max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle>Informações Básicas</CardTitle>
                <CardDescription>Seus dados de acesso</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-6">
                  <Avatar className="h-16 w-16">
                    {uploading ? <div className="flex h-full w-full items-center justify-center bg-muted">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div> : <>
                        <AvatarImage src={profileImage} />
                        <AvatarFallback className="text-lg">{name?.charAt(0) || email?.charAt(0)}</AvatarFallback>
                      </>}
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-medium">{user?.name || 'Administrador'}</h3>
                    <p className="text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
                
                {isEditing ? <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-2">
                      <label htmlFor="name" className="font-medium">Nome</label>
                      <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome completo" />
                    </div>
                    
                    <div className="grid gap-2">
                      <label htmlFor="email" className="font-medium">E-mail</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" className="pl-10" />
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button type="submit" disabled={updatingProfile}>
                        {updatingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('common.save')}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                        {t('common.cancel')}
                      </Button>
                    </div>
                  </form> : <Button onClick={() => setIsEditing(true)}>Editar Informações</Button>}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Alterar Senha</CardTitle>
                <CardDescription>Atualize sua senha de acesso</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="grid gap-2">
                    <label htmlFor="newPassword" className="font-medium">Nova Senha</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input id="newPassword" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" className="pl-10" required />
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <label htmlFor="confirmPassword" className="font-medium">Confirmar Senha</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" className="pl-10" required />
                    </div>
                  </div>
                  
                  <Button type="submit" disabled={changingPassword}>
                    {changingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Alterar Senha
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>;
  }
  return <MainLayout title={t('profile.title')}>
      <div className="space-y-6 pb-16">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('profile.title')}</h1>
          <p className="text-muted-foreground">Gerencie seus dados pessoais</p>
        </div>
        
        <Separator />
        
        <div className="grid gap-6">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <div className="sticky z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b mb-6 md:top-0" style={{
            top: 'calc(4rem + env(safe-area-inset-top))'
          }}>
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-8 gap-1 p-1 h-auto bg-muted/50">
                <TabsTrigger value="info" className="text-xs md:text-sm px-2 py-3 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground">
                  Informações
                </TabsTrigger>
                <TabsTrigger value="plans" className="text-xs md:text-sm px-2 py-3 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground">
                  Planos
                </TabsTrigger>
                <TabsTrigger value="categories" className="text-xs md:text-sm px-2 py-3 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground">
                  Categorias
                </TabsTrigger>
                <TabsTrigger value="contas" className="text-xs md:text-sm px-2 py-3 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground">
                  Contas
                </TabsTrigger>
                <TabsTrigger value="dependents" className="text-xs md:text-sm px-2 py-3 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground">
                  Dependentes
                </TabsTrigger>
                <TabsTrigger value="notifications" className="text-xs md:text-sm px-2 py-3 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground">
                  Notificações
                </TabsTrigger>
                <TabsTrigger value="password" className="text-xs md:text-sm px-2 py-3 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground">
                  Senha
                </TabsTrigger>
                <TabsTrigger value="preferences" className="text-xs md:text-sm px-2 py-3 whitespace-nowrap data-[state=active]:bg-background data-[state=active]:text-foreground">
                  Preferências
                </TabsTrigger>
              </TabsList>
            </div>
            
            <div className="space-y-6 max-h-[calc(100vh-320px)] md:max-h-none overflow-y-auto px-1">
              <TabsContent value="info" className="mt-0 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg md:text-xl">Informações Pessoais</CardTitle>
                    <CardDescription className="text-sm">Seus dados de cadastro e contato Versão:3.0.4</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-6">
                      <div className="relative">
                        <Avatar className="h-16 w-16 md:h-20 md:w-20">
                          {uploading ? <div className="flex h-full w-full items-center justify-center bg-muted">
                              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div> : <>
                              <AvatarImage src={profileImage} />
                              <AvatarFallback className="text-lg md:text-xl">{name?.charAt(0) || email?.charAt(0)}</AvatarFallback>
                            </>}
                        </Avatar>
                        {isEditing && <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer shadow-md touch-target" onClick={handleImageClick}>
                            <Camera className="h-4 w-4" />
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                          </div>}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg md:text-xl font-medium">{user?.name || 'Usuário'}</h3>
                        <p className="text-sm text-muted-foreground break-all">{user?.email}</p>
                        {user?.phone && <p className="text-sm text-muted-foreground">{user.phone}</p>}
                      </div>
                    </div>
                    
                    {isEditing ? <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid gap-2">
                          <label htmlFor="name" className="text-sm font-medium">Nome</label>
                          <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome completo" className="h-11" />
                        </div>
                        
                        <div className="grid gap-2">
                          <label htmlFor="email" className="text-sm font-medium">E-mail</label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" className="pl-10 h-11" />
                          </div>
                        </div>
                        
                        <div className="grid gap-2">
                          <label htmlFor="phone" className="text-sm font-medium">WhatsApp</label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                            <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="5511999999999" className="pl-10 h-11" type="tel" />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Formato: código do país + DDD + número (ex: 5511999999999)
                          </p>
                        </div>
                        
                        <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
                          <Button type="submit" disabled={updatingProfile} className="w-full md:w-auto h-11">
                            {updatingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('common.save')}
                          </Button>
                          <Button type="button" variant="outline" onClick={() => setIsEditing(false)} className="w-full md:w-auto h-11">
                            {t('common.cancel')}
                          </Button>
                        </div>
                      </form> : <Button onClick={() => setIsEditing(true)} className="w-full md:w-auto h-11">
                        Editar Perfil
                      </Button>}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="plans" className="mt-0">
                <PlansTab />
              </TabsContent>
              
              <TabsContent value="categories" className="mt-0">
                <CategoriesTab />
              </TabsContent>
              
              <TabsContent value="contas" className="mt-0">
                <ContasTab />
              </TabsContent>
              
              <TabsContent value="dependents" className="mt-0">
                <DependentsTab />
              </TabsContent>
              
              <TabsContent value="notifications" className="mt-0">
                <NotificationSettings />
              </TabsContent>
              
              <TabsContent value="password" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg md:text-xl">Alterar Senha</CardTitle>
                    <CardDescription className="text-sm">Atualize sua senha de acesso</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                      <div className="grid gap-2">
                        <label htmlFor="newPassword" className="text-sm font-medium">Nova Senha</label>
                        <div className="relative">
                          <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                          <Input id="newPassword" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" className="pl-10 h-11" required />
                        </div>
                      </div>
                      
                      <div className="grid gap-2">
                        <label htmlFor="confirmPassword" className="text-sm font-medium">Confirmar Senha</label>
                        <div className="relative">
                          <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                          <Input id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" className="pl-10 h-11" required />
                        </div>
                      </div>
                      
                      <Button type="submit" disabled={changingPassword} className="w-full h-11">
                        {changingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Alterar Senha
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="preferences" className="mt-0">
                <PreferencesTab />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </MainLayout>;
};
export default ProfilePage;