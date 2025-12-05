import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface WhatsAppMockupProps {
  className?: string;
}

const WhatsAppMockup = ({ className = '' }: WhatsAppMockupProps) => {
  const messages = [
    'Gastei 55,00 no almoço hoje',
    'Comprei 80 reais de Pão paguei pelo nubank',
    'Recebi 2.500 do salário',
    'Comprei mercado 320,00',
  ];

  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    const currentMessage = messages[currentMessageIndex];
    
    if (isTyping) {
      if (displayedText.length < currentMessage.length) {
        const timeout = setTimeout(() => {
          setDisplayedText(currentMessage.slice(0, displayedText.length + 1));
        }, 80); // Typing speed
        return () => clearTimeout(timeout);
      } else {
        // Finished typing, show complete message
        setShowMessage(true);
        const timeout = setTimeout(() => {
          setIsTyping(false);
        }, 2000); // Wait before moving to next message
        return () => clearTimeout(timeout);
      }
    } else {
      // Reset and move to next message
      const timeout = setTimeout(() => {
        setShowMessage(false);
        setDisplayedText('');
        setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
        setIsTyping(true);
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [displayedText, isTyping, currentMessageIndex, messages]);

  return (
    <div className={`w-full max-w-[280px] mx-auto ${className}`}>
      <div className="relative w-full max-w-[280px] mx-auto">
        {/* Phone frame */}
        <div className="relative bg-black rounded-[40px] p-3 shadow-2xl">
          {/* Screen bezel */}
          <div className="bg-[#ECE5DD] rounded-[32px] overflow-hidden shadow-inner">
            {/* WhatsApp Header */}
            <div className="bg-[#075E54] px-4 py-3 flex items-center gap-3">
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-xs">🤖</span>
              </div>
              {/* Name and status */}
              <div className="flex-1">
                <h3 className="text-white text-sm font-semibold">Minhas Finanças</h3>
                <p className="text-white/70 text-xs">online</p>
              </div>
            </div>
            
            {/* Chat area */}
            <div className="h-[380px] p-4 overflow-hidden relative">
              {/* Background pattern */}
              <div 
                className="absolute inset-0 opacity-20" 
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='0.05'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`,
                }}
              />
              
              {/* Message bubble */}
              <div className="relative space-y-2">
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0, 
                    scale: 1 
                  }}
                  key={currentMessageIndex}
                  transition={{ duration: 0.3 }}
                  className="bg-[#DCF8C6] rounded-lg px-3 py-2 max-w-[85%] shadow-sm"
                >
                  {/* Message text with cursor */}
                  <p className="text-gray-800 text-sm leading-relaxed">
                    {displayedText}
                    {isTyping && displayedText.length < messages[currentMessageIndex].length && (
                      <motion.span 
                        className="inline-block w-0.5 h-4 bg-gray-600 ml-0.5 align-middle"
                        animate={{ opacity: [1, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                      />
                    )}
                  </p>
                  
                  {/* Time and checkmarks */}
                  {showMessage && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-end gap-1 mt-1"
                    >
                      <span className="text-[10px] text-gray-500">12:30</span>
                      <div className="flex -space-x-1">
                        <Check className="w-3 h-3 text-blue-500" />
                        <Check className="w-3 h-3 text-blue-500" />
                      </div>
                    </motion.div>
                  )}
                </motion.div>

                {/* Typing indicator (bot response) */}
                {showMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white rounded-lg px-3 py-2 max-w-[70%] shadow-sm"
                  >
                    <div className="flex items-center gap-1">
                      <motion.span 
                        className="w-2 h-2 bg-gray-400 rounded-full"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                      />
                      <motion.span 
                        className="w-2 h-2 bg-gray-400 rounded-full"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                      />
                      <motion.span 
                        className="w-2 h-2 bg-gray-400 rounded-full"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                      />
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
            
            {/* Input area */}
            <div className="bg-[#F0F0F0] px-3 py-2 flex items-center gap-2">
              <div className="flex-1 bg-white rounded-full px-4 py-2">
                <span className="text-gray-400 text-sm">Mensagem</span>
              </div>
              <div className="w-10 h-10 bg-[#25D366] rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2a10 10 0 0110 10 10 10 0 01-10 10A10 10 0 012 12 10 10 0 0112 2m0 2a8 8 0 00-8 8 8 8 0 008 8 8 8 0 008-8 8 8 0 00-8-8m-1 4h2v4h4v2h-6V8z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppMockup;
