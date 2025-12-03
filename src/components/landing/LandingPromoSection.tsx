
import React, { useCallback, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useBrandingConfig } from '@/hooks/useBrandingConfig';
import { 
  ChevronDown, 
  Smartphone, 
  BarChart3, 
  Target, 
  Bell, 
  Shield,
  CheckCircle2,
  Monitor,
  FileText,
  Globe
} from 'lucide-react';

const LandingPromoSection = () => {
  const { companyName } = useBrandingConfig();
  const sectionRef = useRef<HTMLElement>(null);
  const notebookRef = useRef<HTMLDivElement>(null);
  const phonesRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  });

  // Parallax transforms for notebook
  const notebookY = useTransform(scrollYProgress, [0, 1], [100, -100]);
  const notebookRotate = useTransform(scrollYProgress, [0, 0.5, 1], [-5, 0, 5]);
  const notebookScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.9, 1, 0.95]);

  // Parallax transforms for phones
  const phone1Y = useTransform(scrollYProgress, [0, 1], [80, -80]);
  const phone2Y = useTransform(scrollYProgress, [0, 1], [120, -60]);
  const phone1Rotate = useTransform(scrollYProgress, [0, 1], [-8, 8]);
  const phone2Rotate = useTransform(scrollYProgress, [0, 1], [12, -4]);

  // Background parallax
  const bgY = useTransform(scrollYProgress, [0, 1], [0, -50]);

  const scrollToPlans = useCallback(() => {
    const section = document.getElementById('planos');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const featuresDesktop = [
    { icon: Monitor, text: 'Painel Dashboard Web completo' },
    { icon: BarChart3, text: 'Gráficos e relatórios detalhados' },
    { icon: Target, text: 'Metas e objetivos personalizados' },
    { icon: FileText, text: 'Relatórios diários, semanais e mensais' },
    { icon: Shield, text: '100% Seguro e inteligente' },
  ];

  const featuresMobile = [
    { icon: Smartphone, text: 'Acesse de qualquer lugar' },
    { icon: Bell, text: 'Notificações em tempo real' },
    { icon: Globe, text: 'Sincronização automática' },
  ];

  const badges = [
    { icon: Shield, text: 'Compra Segura' },
    { icon: CheckCircle2, text: 'Satisfação Garantida' },
    { icon: Shield, text: 'Privacidade Protegida' },
  ];

  return (
    <section 
      ref={sectionRef}
      className="relative py-16 md:py-24 overflow-hidden bg-gradient-to-b from-muted/30 via-background to-muted/20"
    >
      {/* Animated Background decoration */}
      <motion.div 
        style={{ y: bgY }}
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" 
      />
      <motion.div 
        style={{ y: useTransform(scrollYProgress, [0, 1], [0, -80]) }}
        className="absolute top-1/4 -left-20 w-80 h-80 bg-primary/5 rounded-full blur-3xl" 
      />
      <motion.div 
        style={{ y: useTransform(scrollYProgress, [0, 1], [0, -40]) }}
        className="absolute bottom-1/4 -right-20 w-60 h-60 bg-primary/10 rounded-full blur-3xl" 
      />
      
      <div className="container mx-auto px-4 relative z-10">
        
        {/* Section 1 - Desktop/Notebook */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-24">
          {/* Left - Notebook Image with Parallax */}
          <motion.div
            ref={notebookRef}
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <motion.div 
              style={{ 
                y: notebookY, 
                rotateX: notebookRotate,
                scale: notebookScale
              }}
              className="relative perspective-1000"
            >
              {/* Notebook frame */}
              <motion.div 
                className="relative bg-foreground/90 rounded-t-xl p-2 pb-0 shadow-2xl"
                whileHover={{ scale: 1.02, rotateY: 5 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-muted/50" />
                <motion.img 
                  src="/lovable-uploads/4427b613-3f73-4178-acf3-5a90c35d1f4d.png" 
                  alt="Dashboard Web Preview" 
                  className="w-full h-auto rounded-t-lg"
                  whileHover={{ scale: 1.01 }}
                  transition={{ duration: 0.3 }}
                />
              </motion.div>
              {/* Notebook base */}
              <div className="h-4 bg-gradient-to-b from-foreground/80 to-foreground/60 rounded-b-lg" />
              <div className="h-2 bg-foreground/40 mx-8 rounded-b-xl" />
              
              {/* Animated Shadow effect */}
              <motion.div 
                style={{ scale: useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1, 0.9]) }}
                className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-8 bg-foreground/20 blur-xl rounded-full" 
              />
            </motion.div>
          </motion.div>

          {/* Right - Content */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight text-foreground">
              Organize suas{' '}
              <span className="text-primary">finanças</span>
            </h2>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8">
              Organize despesas, receitas, metas e compromissos de forma simples e intuitiva com o {companyName}.
            </p>

            {/* Features list */}
            <ul className="space-y-4">
              {featuresDesktop.map((feature, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                  className="flex items-center gap-3"
                  whileHover={{ x: 10 }}
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-foreground/90">{feature.text}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Section 2 - Mobile */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Phone Images with Parallax */}
          <motion.div
            ref={phonesRef}
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative flex justify-center lg:justify-start"
          >
            <div className="relative">
              {/* Phone 1 - Main with parallax */}
              <motion.div 
                style={{ y: phone1Y, rotate: phone1Rotate }}
                className="relative z-10"
                whileHover={{ scale: 1.05, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <div className="bg-foreground/90 rounded-[2.5rem] p-2 shadow-2xl">
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-6 bg-foreground rounded-full z-10" />
                  <img 
                    src="/lovable-uploads/4427b613-3f73-4178-acf3-5a90c35d1f4d.png" 
                    alt="App Mobile Preview" 
                    className="w-56 h-auto rounded-[2rem]"
                  />
                </div>
              </motion.div>
              
              {/* Phone 2 - Behind with different parallax speed */}
              <motion.div 
                style={{ y: phone2Y, rotate: phone2Rotate }}
                className="absolute -right-12 top-8 z-0"
                whileHover={{ scale: 1.05, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <div className="bg-foreground/70 rounded-[2.5rem] p-2 shadow-xl opacity-80">
                  <img 
                    src="/lovable-uploads/4427b613-3f73-4178-acf3-5a90c35d1f4d.png" 
                    alt="App Mobile Preview 2" 
                    className="w-48 h-auto rounded-[2rem]"
                  />
                </div>
              </motion.div>
              
              {/* Animated Decorative elements */}
              <motion.div 
                style={{ y: useTransform(scrollYProgress, [0, 1], [40, -40]) }}
                className="absolute -left-8 top-1/4 w-16 h-16 text-primary/30"
              >
                <motion.svg 
                  viewBox="0 0 100 100" 
                  fill="currentColor"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                >
                  <polygon points="50,0 100,100 0,100" />
                </motion.svg>
              </motion.div>
              
              {/* Floating circles */}
              <motion.div
                style={{ y: useTransform(scrollYProgress, [0, 1], [20, -60]) }}
                className="absolute -right-20 bottom-20 w-8 h-8 bg-primary/20 rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              <motion.div
                style={{ y: useTransform(scrollYProgress, [0, 1], [30, -30]) }}
                className="absolute -left-16 bottom-40 w-4 h-4 bg-primary/30 rounded-full"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
              />
            </div>
          </motion.div>

          {/* Right - Content */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {/* Chevron indicator */}
            <motion.div 
              className="flex justify-start mb-4"
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <ChevronDown className="w-8 h-8 text-primary" />
            </motion.div>

            <p className="text-xl text-primary mb-2">
              Vida pessoal + finanças organizadas, no mesmo lugar.
            </p>
            
            <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 text-foreground">
              Quem organiza, prospera!
            </h3>
            
            <p className="text-lg text-muted-foreground mb-8">
              Lance despesas, organize sua agenda e acompanhe suas finanças com inteligência. O {companyName} cuida disso pra você com painéis que funcionam de verdade.
            </p>

            {/* Features list */}
            <ul className="space-y-3 mb-8">
              {featuresMobile.map((feature, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                  className="flex items-center gap-3"
                  whileHover={{ x: 10 }}
                >
                  <feature.icon className="w-5 h-5 text-primary" />
                  <span className="text-foreground/90">{feature.text}</span>
                </motion.li>
              ))}
            </ul>

            {/* CTA Button with pulse animation */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <Button
                onClick={scrollToPlans}
                size="lg"
                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg px-10 py-6 rounded-full shadow-lg animate-pulse-slow"
              >
                Quero começar agora!
              </Button>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 1 }}
              className="flex flex-wrap gap-6 mt-8"
            >
              {badges.map((badge, index) => (
                <motion.div 
                  key={index}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                  whileHover={{ scale: 1.05 }}
                >
                  <badge.icon className="w-5 h-5 text-primary" />
                  <span>{badge.text}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default LandingPromoSection;
