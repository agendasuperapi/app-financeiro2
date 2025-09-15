import React, { createContext, useContext, useState, ReactNode } from 'react';

interface UserData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status?: string;
}

interface ClientViewContextType {
  selectedUser: UserData | null;
  setSelectedUser: (user: UserData | null) => void;
}

const ClientViewContext = createContext<ClientViewContextType | undefined>(undefined);

export const useClientView = () => {
  const context = useContext(ClientViewContext);
  if (context === undefined) {
    throw new Error('useClientView must be used within a ClientViewProvider');
  }
  return context;
};

interface ClientViewProviderProps {
  children: ReactNode;
}

export const ClientViewProvider: React.FC<ClientViewProviderProps> = ({ children }) => {
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  return (
    <ClientViewContext.Provider value={{ selectedUser, setSelectedUser }}>
      {children}
    </ClientViewContext.Provider>
  );
};