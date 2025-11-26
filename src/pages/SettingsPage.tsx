
import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PreferencesTab from '@/components/settings/PreferencesTab';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { usePreferences } from '@/contexts/PreferencesContext';

const SettingsPage = () => {
  const { t } = usePreferences();

  return (
    <MainLayout>
      <div className="w-full px-4 py-8 space-y-6">
        <h1 className="text-3xl font-bold">Configurações</h1>
        
        <NotificationSettings />
        
        <PreferencesTab />
      </div>
    </MainLayout>
  );
};

export default SettingsPage;
