import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from "@/hooks/use-toast";
import { getPlanTypeFromPriceId } from '@/utils/subscriptionUtils';
import { useBrandingConfig } from '@/hooks/useBrandingConfig';
import { Eye, EyeOff, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const COUNTRY_CODES = [
  { code: '+55', country: 'Brasil', flag: '🇧🇷' },
  { code: '+1', country: 'EUA', flag: '🇺🇸' },
  { code: '+351', country: 'Portugal', flag: '🇵🇹' },
  { code: '+34', country: 'Espanha', flag: '🇪🇸' },
  { code: '+44', country: 'Reino Unido', flag: '🇬🇧' },
];

const RegisterPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { companyName, logoUrl, logoAltText } = useBrandingConfig();

  // Form state
  const [currentStep, setCurrentStep] = useState(1);
  const [fullName, setFullName] = useState('');
  const [countryCode, setCountryCode] = useState('+55');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [emailConfirm, setEmailConfirm] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const priceId = searchParams.get('priceId');
  const totalSteps = 4;

  // Validation functions
  const validateStep = (step: number): boolean => {
    setError(null);
    
    switch (step) {
      case 1:
        if (!fullName.trim()) {
          setError('Por favor, digite seu nome');
          return false;
        }
        if (fullName.trim().length < 3) {
          setError('Nome deve ter pelo menos 3 caracteres');
          return false;
        }
        return true;
      
      case 2:
        const phoneClean = whatsapp.replace(/\D/g, '');
        if (!phoneClean) {
          setError('Por favor, digite seu número de WhatsApp');
          return false;
        }
        if (phoneClean.length < 10 || phoneClean.length > 11) {
          setError('Número de WhatsApp inválido');
          return false;
        }
        return true;
      
      case 3:
        if (!email.trim()) {
          setError('Por favor, digite seu e-mail');
          return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          setError('E-mail inválido');
          return false;
        }
        if (email !== emailConfirm) {
          setError('Os e-mails não conferem');
          return false;
        }
        return true;
      
      case 4:
        if (!password) {
          setError('Por favor, digite uma senha');
          return false;
        }
        if (password.length < 6) {
          setError('A senha deve ter pelo menos 6 caracteres');
          return false;
        }
        if (password !== passwordConfirm) {
          setError('As senhas não conferem');
          return false;
        }
        if (!acceptTerms) {
          setError('Você precisa aceitar os termos de uso');
          return false;
        }
        return true;
      
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setError(null);
      setCurrentStep(currentStep - 1);
    } else {
      navigate(-1);
    }
  };

  // Format phone number
  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) {
      return numbers.length ? `(${numbers}` : '';
    } else if (numbers.length <= 7) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    } else {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatPhoneNumber(e.target.value);
    setWhatsapp(formattedValue);
  };

  // Wait for valid session
  const waitForValidSession = async (maxRetries = 20, retryDelay = 1500): Promise<any> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const [sessionResult, userResult] = await Promise.all([
          supabase.auth.getSession(),
          supabase.auth.getUser()
        ]);
        
        const { data: { session }, error: sessionError } = sessionResult;
        const { data: { user }, error: userError } = userResult;
        
        if (sessionError) {
          if (attempt === maxRetries) throw sessionError;
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
        
        if (userError) {
          if (attempt === maxRetries) throw userError;
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
        
        if (session?.access_token && session?.user?.id && user?.id) {
          return session;
        }
        
        if (attempt > maxRetries - 3) {
          await supabase.auth.refreshSession();
        }
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      } catch (error) {
        if (attempt === maxRetries) throw error;
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    throw new Error('Timeout: Não foi possível estabelecer uma sessão válida');
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;
    
    setIsLoading(true);
    setError(null);
  
    if (!priceId) {
      setError("Plano não encontrado. Por favor, selecione um plano.");
      setIsLoading(false);
      navigate('/plans');
      return;
    }
  
    try {
      const formattedPhone = whatsapp.replace(/\D/g, '');
      const fullPhone = `${countryCode}${formattedPhone}`;
      
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: fullPhone,
          },
        },
      });
  
      if (signUpError) throw signUpError;

      if (!signUpData.user) {
        throw new Error('Usuário não retornado após o cadastro.');
      }
      
      toast({
        title: "Conta criada com sucesso!",
        description: "Preparando checkout...",
      });

      let validSession;
      try {
        validSession = await waitForValidSession(20, 1500);
      } catch (sessionError) {
        try {
          const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          
          if (loginError) throw loginError;
          
          if (loginData.session) {
            validSession = loginData.session;
          } else {
            throw new Error('Login automático falhou');
          }
        } catch (loginError) {
          toast({
            title: "Conta criada com sucesso!",
            description: "Redirecionando para fazer login...",
          });
          
          setTimeout(() => {
            navigate('/login', { 
              state: { 
                email, 
                message: "Sua conta foi criada! Faça login para continuar." 
              } 
            });
          }, 2000);
          return;
        }
      }

      if (!validSession?.access_token || !validSession?.user?.id) {
        throw new Error('Sessão inválida após registro.');
      }
      
      const planType = await getPlanTypeFromPriceId(priceId);
      
      if (!planType) {
        throw new Error("Tipo de plano inválido.");
      }
      
      const { data: functionData, error: functionError } = await supabase.functions.invoke('create-checkout-session', {
        body: { 
          planType,
          successUrl: `${window.location.origin}/payment-success?email=${encodeURIComponent(validSession.user.email || '')}`,
          cancelUrl: `${window.location.origin}/register?canceled=true`
        },
        headers: {
          Authorization: `Bearer ${validSession.access_token}`,
        }
      });
      
      if (functionError) {
        throw new Error(`Erro no checkout: ${functionError.message}`);
      }

      if (functionData && functionData.url) {
        window.location.href = functionData.url;
        return;
      } else {
        throw new Error('Não foi possível obter a URL de checkout.');
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro desconhecido.');
      setIsLoading(false);
    }
  };

  // Progress bar component
  const ProgressBar = () => (
    <div className="flex gap-2 w-full max-w-md mx-auto mb-8">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div
          key={index}
          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
            index < currentStep 
              ? 'bg-primary' 
              : index === currentStep - 1 
                ? 'bg-primary' 
                : 'bg-muted'
          }`}
        />
      ))}
    </div>
  );

  // Step content components
  const renderStepContent = () => {
    const variants = {
      enter: { opacity: 0, x: 20 },
      center: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -20 }
    };

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.3 }}
          className="w-full"
        >
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground text-center">
                Como podemos te chamar?
              </h2>
              <Input
                type="text"
                placeholder="Digite seu nome"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-14 text-base bg-muted/50 border-muted-foreground/20 placeholder:text-muted-foreground/50"
                autoFocus
              />
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground text-center">
                Qual é o seu WhatsApp?
              </h2>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="h-14 px-3 rounded-lg bg-muted/50 border border-muted-foreground/20 text-foreground text-sm min-w-[120px]"
                >
                  {COUNTRY_CODES.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.flag} {country.code} {country.country}
                    </option>
                  ))}
                </select>
                <Input
                  type="tel"
                  placeholder="Digite seu telefone Ex: (11) 90000-0000"
                  value={whatsapp}
                  onChange={handleWhatsappChange}
                  maxLength={16}
                  className="h-14 text-base bg-muted/50 border-muted-foreground/20 placeholder:text-muted-foreground/50 flex-1"
                  autoFocus
                />
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground text-center">
                Qual é o seu melhor E-mail?
              </h2>
              <div className="space-y-4">
                <Input
                  type="email"
                  placeholder="Digite seu e-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-14 text-base bg-muted/50 border-muted-foreground/20 placeholder:text-muted-foreground/50"
                  autoFocus
                />
                <Input
                  type="email"
                  placeholder="Digite novamente seu e-mail"
                  value={emailConfirm}
                  onChange={(e) => setEmailConfirm(e.target.value)}
                  className="h-14 text-base bg-muted/50 border-muted-foreground/20 placeholder:text-muted-foreground/50"
                />
              </div>
              <p className="text-xs text-primary">
                Digite o e-mail corretamente, pois ele será utilizado para enviar informações importantes
              </p>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl md:text-2xl font-semibold text-foreground text-center">
                Digite uma senha para acessar o aplicativo
              </h2>
              <div className="space-y-4">
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-14 text-base bg-muted/50 border-muted-foreground/20 placeholder:text-muted-foreground/50 pr-12"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <div className="relative">
                  <Input
                    type={showPasswordConfirm ? 'text' : 'password'}
                    placeholder="Digite novamente sua senha"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    className="h-14 text-base bg-muted/50 border-muted-foreground/20 placeholder:text-muted-foreground/50 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPasswordConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={acceptTerms}
                  onCheckedChange={setAcceptTerms}
                />
                <span className="text-sm text-foreground">
                  Aceito os{' '}
                  <a href="/terms" className="text-primary hover:underline" target="_blank">
                    termos de uso e política de privacidade
                  </a>
                </span>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    );
  };

  // Loading overlay
  const LoadingOverlay = () => {
    if (!isLoading) return null;
    
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm font-medium text-foreground">
            Criando conta e preparando checkout...
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/30 to-background flex flex-col items-center pt-8 md:pt-16 p-4">
      {isLoading && <LoadingOverlay />}
      
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg">
              <img 
                src={logoUrl} 
                alt={logoAltText}
                className="w-9 h-9 object-contain"
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            </div>
            <span className="text-2xl font-bold text-foreground">{companyName}</span>
          </div>
        </div>

        {/* Progress bar */}
        <ProgressBar />

        {/* Card container */}
        <div className="bg-card rounded-2xl shadow-xl p-6 md:p-8">
          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-3 bg-destructive/10 border border-destructive/20 rounded-lg"
            >
              <p className="text-sm text-destructive text-center">{error}</p>
            </motion.div>
          )}

          {/* Step content */}
          {renderStepContent()}

          {/* Buttons */}
          <div className="flex gap-3 mt-8">
            <Button
              onClick={handleNext}
              disabled={isLoading}
              className="flex-1 h-14 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
            >
              {currentStep === totalSteps ? 'Concluir' : 'Continuar'}
            </Button>
            <Button
              onClick={handleBack}
              variant="secondary"
              disabled={isLoading}
              className="flex-1 h-14 text-base font-semibold bg-muted hover:bg-muted/80 text-foreground rounded-xl"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Voltar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
