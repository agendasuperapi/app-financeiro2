
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { PreferencesProvider } from "@/contexts/PreferencesContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { BrandingProvider } from "@/contexts/BrandingContext";
import { AppProvider } from "@/contexts/AppContext";
import { SupabaseInitializer } from "@/components/common/SupabaseInitializer";
import Index from "./pages/Index";
import LandingPage from "./pages/LandingPage";
import LembretesPage from "./pages/LembretesPage";
import LembrarPage from "./pages/LembrarPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import RegisterWithPlanPage from "./pages/RegisterWithPlanPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ProfilePage from "./pages/ProfilePage";
import TransactionsPage from "./pages/TransactionsPage";
import ExpensesPage from "./pages/ExpensesPage";
import GoalsPage from "./pages/GoalsPage";
import ReportsPage from "./pages/ReportsPage";
import NotesPage from "./pages/NotesPage";
import LogPage from "./pages/LogPage";
import RulesPage from "./pages/RulesPage";
import SchedulePage from "./pages/SchedulePage";
import ContasPage from "./pages/ContasPage";
import CategoriesPage from "./pages/CategoriesPage";
import PlansPage from "./pages/PlansPage";
import CheckoutPage from "./pages/CheckoutPage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import ThankYouPage from "./pages/ThankYouPage";
import AdminDashboard from "./pages/AdminDashboard";
import AchievementsPage from "./pages/AchievementsPage";
import LimitsPage from "./pages/LimitsPage";
import SaldoPage from "./pages/SaldoPage";
import CalendarPage from "./pages/CalendarPage";
import NotFound from "./pages/NotFound";
import AdminRoute from "./components/admin/AdminRoute";
import "./App.css";
import { ClientViewProvider } from '@/contexts/ClientViewContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { registerWebPushNotification } from '@/services/notificationService';
import { Capacitor } from '@capacitor/core';
import { useEffect } from 'react';

const queryClient = new QueryClient();

function App() {
  // Configurar listeners de notificações mobile (não solicita permissão automaticamente)
  usePushNotifications();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <BrandingProvider>
            <PreferencesProvider>
              <SubscriptionProvider>
                <SupabaseInitializer>
                  <AppProvider>
                    <ClientViewProvider>
                      <BrowserRouter>
                        <Routes>
                          <Route path="/" element={<LoginPage />} />
                          <Route path="/dashboard" element={<Index />} />
                          <Route path="/landing" element={<LandingPage />} />
                          <Route path="/login" element={<LoginPage />} />
                          <Route path="/register" element={<RegisterPage />} />
                          <Route path="/register/:planType" element={<RegisterWithPlanPage />} />
                          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                          <Route path="/reset-password" element={<ResetPasswordPage />} />
                          <Route path="/profile" element={<ProfilePage />} />
                          <Route path="/transactions" element={<TransactionsPage />} />
                          <Route path="/expenses" element={<ExpensesPage />} />
                          <Route path="/goals" element={<GoalsPage />} />
                          <Route path="/reports" element={<ReportsPage />} />
                          <Route path="/notes" element={<NotesPage />} />
                          <Route path="/logs" element={<LogPage />} />
                          <Route path="/rules" element={<RulesPage />} />
                          <Route path="/schedule" element={<SchedulePage />} />
                          <Route path="/contas" element={<ContasPage />} />
                          <Route path="/lembrar" element={<LembrarPage />} />
                          <Route path="/lembretes" element={<LembretesPage />} />
                          <Route path="/categories" element={<CategoriesPage />} />
                          <Route path="/plans" element={<PlansPage />} />
                          <Route path="/checkout/:planType" element={<CheckoutPage />} />
                          <Route path="/payment-success" element={<PaymentSuccessPage />} />
                          <Route path="/thank-you" element={<ThankYouPage />} />
                          <Route path="/achievements" element={<AchievementsPage />} />
                          <Route path="/limits" element={<LimitsPage />} />
                          <Route path="/saldo" element={<SaldoPage />} />
                          <Route path="/calendar" element={<CalendarPage />} />
                          <Route 
                            path="/admin" 
                            element={
                              <AdminRoute>
                                <AdminDashboard />
                              </AdminRoute>
                            } 
                          />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </BrowserRouter>
                      <Toaster />
                      <Sonner />
                    </ClientViewProvider>
                  </AppProvider>
                </SupabaseInitializer>
              </SubscriptionProvider>
            </PreferencesProvider>
          </BrandingProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
