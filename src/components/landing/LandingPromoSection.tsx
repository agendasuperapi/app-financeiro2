
import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useBrandingConfig } from '@/hooks/useBrandingConfig';
import { 
  ChevronDown, 
  Smartphone, 
  BarChart3, 
  Target, 
  Bell, 
  Shield,
  CheckCircle2
} from 'lucide-react';

const LandingPromoSection = () => {
  const { companyName } = useBrandingConfig();

  const scrollToPlans = useCallback(() => {
    const section = document.getElementById('planos');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const features = [
    { icon: Smartphone, text: 'Dashboard completo no celular e web' },
    { icon: BarChart3, text: 'Relatórios automáticos diários, semanais e mensais' },
    { icon: Target, text: 'Metas e objetivos personalizados' },
    { icon: Bell, text: 'Lembretes e notificações inteligentes' },
    { icon: Shield, text: '100% Seguro e confiável' },
  ];

  const badges = [
    { icon: Shield, text: 'Compra Segura' },
    { icon: CheckCircle2, text: 'Satisfação Garantida' },
    { icon: Shield, text: 'Privacidade Protegida' },
  ];

  return (
    <section className="relative py-16 md:py-24 overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-metacash-blue">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Chevron indicator */}
        <motion.div 
          className="flex justify-center mb-8"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown className="w-10 h-10 text-white/70" />
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Image/Visual */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative order-2 lg:order-1"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-background/10 backdrop-blur-sm border border-white/20 p-6">
              <img 
                src="/lovable-uploads/4427b613-3f73-4178-acf3-5a90c35d1f4d.png" 
                alt="App Preview" 
                className="w-full h-auto rounded-xl"
              />
            </div>
          </motion.div>

          {/* Right - Content */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-white order-1 lg:order-2"
          >
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
              Sua vida financeira{' '}
              <span className="text-metacash-yellow">organizada</span>{' '}
              em um só lugar
            </h2>
            
            <p className="text-lg md:text-xl text-white/80 mb-8">
              Com o {companyName}, você tem controle total das suas finanças de forma simples e intuitiva.
            </p>

            {/* Features list */}
            <ul className="space-y-4 mb-10">
              {features.map((feature, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <feature.icon className="w-5 h-5 text-metacash-yellow" />
                  </div>
                  <span className="text-white/90">{feature.text}</span>
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
                className="w-full sm:w-auto bg-metacash-yellow hover:bg-metacash-yellow/90 text-primary font-bold text-lg px-10 py-6 rounded-full shadow-lg animate-pulse-slow"
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
              className="flex flex-wrap gap-4 mt-8"
            >
              {badges.map((badge, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-2 text-sm text-white/70"
                >
                  <badge.icon className="w-4 h-4" />
                  <span>{badge.text}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default LandingPromoSection;
