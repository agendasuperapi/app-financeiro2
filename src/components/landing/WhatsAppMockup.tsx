import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import relatorioChart from '@/assets/relatorio-chart.png';

interface WhatsAppMockupProps {
  className?: string;
}

type MessageType = 'despesa' | 'receita' | 'agendamento' | 'lembrete' | 'relatorio';

interface MessageData {
  userMessage: string;
  type: MessageType;
  botResponse: {
    descricao: string;
    valor?: string;
    conta?: string;
    categoria?: string;
    data?: string;
    frequencia?: string;
  };
  summaryResponse?: {
    categoria: string;
    totalMes: string;
    meta: string;
    porcentagem: string;
    restante: string;
    saldo: string;
    conta: string;
  };
  relatorioData?: {
    items: { categoria: string; valor: string }[];
  };
}

const WhatsAppMockup = ({
  className = ''
}: WhatsAppMockupProps) => {
  const messages: MessageData[] = [
    {
      userMessage: 'Gastei 55,00 no almoço hoje',
      type: 'despesa',
      botResponse: {
        descricao: 'Almoço',
        valor: 'R$ 55,00',
        conta: 'Geral',
        categoria: 'Alimentação'
      },
      summaryResponse: {
        categoria: 'Alimentação',
        totalMes: 'R$ 206,00',
        meta: 'R$ 600,00',
        porcentagem: '34,33%',
        restante: 'R$ 394,00',
        saldo: 'R$ 1.845,00',
        conta: 'Geral'
      }
    },
    {
      userMessage: 'Comprei 80 reais de Pão paguei pelo nubank',
      type: 'despesa',
      botResponse: {
        descricao: 'Compra de pão',
        valor: 'R$ 80,00',
        conta: 'Nubank',
        categoria: 'Alimentação'
      },
      summaryResponse: {
        categoria: 'Alimentação',
        totalMes: 'R$ 261,00',
        meta: 'R$ 600,00',
        porcentagem: '43,50%',
        restante: 'R$ 339,00',
        saldo: 'R$ 2.439,00',
        conta: 'Nubank'
      }
    },
    {
      userMessage: 'Recebi 2.500 do salário Nubank',
      type: 'receita',
      botResponse: {
        descricao: 'Salário',
        valor: 'R$ 2.500,00',
        conta: 'Nubank',
        categoria: 'Receita'
      },
      summaryResponse: {
        categoria: 'Receita',
        totalMes: 'R$ 5.200,00',
        meta: 'R$ 6.000,00',
        porcentagem: '86,67%',
        restante: 'R$ 800,00',
        saldo: 'R$ 5.439,00',
        conta: 'Nubank'
      }
    },
    {
      userMessage: 'Conta da LUZ 150 reais todo dia 10',
      type: 'agendamento',
      botResponse: {
        descricao: 'Conta luz',
        valor: 'R$ 150,00',
        conta: 'Geral',
        categoria: 'Moradia',
        data: '10/12/2025 09:00',
        frequencia: 'Mensal'
      }
    },
    {
      userMessage: 'Lembre do Dentista dia 10 as 14 horas',
      type: 'lembrete',
      botResponse: {
        descricao: 'Lembre do Dentista',
        data: '10/12/2025 14:00',
        frequencia: 'Uma vez'
      }
    },
    {
      userMessage: 'Relatório das despesas do mês',
      type: 'relatorio',
      botResponse: {
        descricao: 'Relatório Mensal'
      },
      relatorioData: {
        items: [
          { categoria: 'Farmacia', valor: 'R$ 263,45' },
          { categoria: 'Educação', valor: 'R$ 400,00' },
          { categoria: 'Alimentação', valor: 'R$ 261,00' },
          { categoria: 'Moradia', valor: 'R$ 580,00' },
          { categoria: 'Outros', valor: 'R$ 200,00' },
          { categoria: 'Saúde', valor: 'R$ 199,00' }
        ]
      }
    },
    {
      userMessage: 'Comprei mercado 320,00',
      type: 'despesa',
      botResponse: {
        descricao: 'Mercado',
        valor: 'R$ 320,00',
        conta: 'Geral',
        categoria: 'Alimentação'
      },
      summaryResponse: {
        categoria: 'Alimentação',
        totalMes: 'R$ 581,00',
        meta: 'R$ 600,00',
        porcentagem: '96,83%',
        restante: 'R$ 19,00',
        saldo: 'R$ 1.525,00',
        conta: 'Geral'
      }
    }
  ];

  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [showMessage, setShowMessage] = useState(false);
  const [showBotResponse, setShowBotResponse] = useState(false);
  const [showSecondBotResponse, setShowSecondBotResponse] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const currentDate = new Date().toLocaleDateString('pt-BR');

  // Auto-scroll to bottom when new messages appear
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [showBotResponse, showSecondBotResponse, displayedText]);

  useEffect(() => {
    const currentMessage = messages[currentMessageIndex].userMessage;
    if (isTyping) {
      if (displayedText.length < currentMessage.length) {
        const timeout = setTimeout(() => {
          setDisplayedText(currentMessage.slice(0, displayedText.length + 1));
        }, 80);
        return () => clearTimeout(timeout);
      } else {
        setShowMessage(true);
        const timeout = setTimeout(() => {
          setShowBotResponse(true);
          setIsTyping(false);
        }, 1000);
        return () => clearTimeout(timeout);
      }
    } else if (!showSecondBotResponse) {
      const timeout = setTimeout(() => {
        setShowSecondBotResponse(true);
      }, 2000);
      return () => clearTimeout(timeout);
    } else {
      const timeout = setTimeout(() => {
        setShowMessage(false);
        setShowBotResponse(false);
        setShowSecondBotResponse(false);
        setDisplayedText('');
        setCurrentMessageIndex(prev => (prev + 1) % messages.length);
        setIsTyping(true);
      }, 4000);
      return () => clearTimeout(timeout);
    }
  }, [displayedText, isTyping, currentMessageIndex, messages, showSecondBotResponse]);

  const currentMsg = messages[currentMessageIndex];
  const currentBotResponse = currentMsg.botResponse;
  const currentSummary = currentMsg.summaryResponse;

  const renderBotResponse = () => {
    switch (currentMsg.type) {
      case 'receita':
        return (
          <>
            <span className="font-semibold">✅ 🎉 Receita adicionada com sucesso!</span>
            {'\n\n'}
            <span>📲 Descrição: {currentBotResponse.descricao}</span>
            {'\n'}
            <span>💰 Valor: {currentBotResponse.valor}</span>
            {'\n'}
            <span>💳 Conta: {currentBotResponse.conta}</span>
            {'\n'}
            <span>📁 Categoria: {currentBotResponse.categoria}</span>
            {'\n'}
            <span>🗓 Data: {currentDate}</span>
          </>
        );
      case 'agendamento':
        return (
          <>
            <span className="font-semibold">❤️‍🔥 💸 O agendamento de despesa foi registrado com sucesso!</span>
            {'\n\n'}
            <span>🗒️ Descrição: {currentBotResponse.descricao}</span>
            {'\n'}
            <span>💰 Valor: {currentBotResponse.valor}</span>
            {'\n'}
            <span>💳 Conta: {currentBotResponse.conta}</span>
            {'\n'}
            <span>📁 Categoria: {currentBotResponse.categoria}</span>
            {'\n'}
            <span>📆 Data: {currentBotResponse.data}</span>
            {'\n'}
            <span>📌 Frequencia: {currentBotResponse.frequencia}</span>
          </>
        );
      case 'lembrete':
        return (
          <>
            <span className="font-semibold">✅ ⏰ O seu lembrete foi registrado com sucesso!</span>
            {'\n\n'}
            <span>🗒️ Descrição: {currentBotResponse.descricao}</span>
            {'\n'}
            <span>📆 Data: {currentBotResponse.data}</span>
            {'\n'}
            <span>📌 Frequencia: {currentBotResponse.frequencia}</span>
          </>
        );
      case 'relatorio':
        return (
          <>
            <span className="font-semibold">📊 Resumo Mensal de Despesas</span>
            {'\n\n'}
            {currentMsg.relatorioData?.items.map((item, index) => (
              <React.Fragment key={index}>
                <span>- {item.categoria}: {item.valor}</span>
                {index < (currentMsg.relatorioData?.items.length || 0) - 1 && '\n'}
              </React.Fragment>
            ))}
          </>
        );
      default: // despesa
        return (
          <>
            <span className="font-semibold">❤️‍🔥 💸 Sua despesa foi adicionada com sucesso!</span>
            {'\n\n'}
            <span>📲 Descrição: {currentBotResponse.descricao}</span>
            {'\n'}
            <span>💰 Valor: {currentBotResponse.valor}</span>
            {'\n'}
            <span>💳 Conta: {currentBotResponse.conta}</span>
            {'\n'}
            <span>📁 Categoria: {currentBotResponse.categoria}</span>
            {'\n'}
            <span>🗓 Data: {currentDate}</span>
          </>
        );
    }
  };

  const renderSecondResponse = () => {
    if (currentMsg.type === 'relatorio') {
      return (
        <div className="w-full h-[180px] overflow-hidden rounded-lg">
          <motion.img 
            src={relatorioChart} 
            alt="Gráfico de despesas" 
            className="w-full"
            initial={{ y: 0 }}
            animate={{ y: [0, -100, -100, 0, 0] }}
            transition={{ 
              duration: 6, 
              repeat: Infinity,
              ease: "easeInOut",
              times: [0, 0.3, 0.5, 0.8, 1]
            }}
          />
        </div>
      );
    }
    
    if (currentMsg.type === 'agendamento' || currentMsg.type === 'lembrete') {
      return null;
    }

    if (!currentSummary) return null;

    if (currentSummary.categoria === 'Receita') {
      return (
        <p className="text-gray-800 text-xs leading-relaxed whitespace-pre-line">
          <span>Saldo {currentSummary.conta}: {currentSummary.saldo}</span>
        </p>
      );
    }

    return (
      <p className="text-gray-800 text-xs leading-relaxed whitespace-pre-line">
        <span className="font-semibold">📊 Resumo de gastos da categoria {currentSummary.categoria}:</span>
        {'\n'}
        <span>💰 Total gasto no Mês: {currentSummary.totalMes}</span>
        {'\n'}
        <span>🎯 Meta/Limite: {currentSummary.meta} para o mês atual.</span>
        {'\n'}
        <span>Usado {currentSummary.porcentagem} tem um restante: {currentSummary.restante}</span>
        {'\n\n'}
        <span>Saldo {currentSummary.conta}: {currentSummary.saldo}</span>
      </p>
    );
  };

  const hasSecondResponse = currentMsg.type === 'relatorio' || 
    (currentMsg.type !== 'agendamento' && currentMsg.type !== 'lembrete' && currentSummary);

  return (
    <div className={`w-full max-w-[280px] mx-auto ${className}`}>
      <div className="relative w-full max-w-[280px] mx-auto">
        {/* Phone frame */}
        <div className="relative bg-black rounded-[40px] p-3 shadow-2xl">
          {/* Screen bezel */}
          <div className="bg-[#ECE5DD] rounded-[32px] overflow-hidden shadow-inner">
            {/* WhatsApp Header */}
            <div className="bg-[#075E54] px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-xs">💹</span>
              </div>
              <div className="flex-1">
                <h3 className="text-white text-sm font-semibold">App Financeiro </h3>
                <p className="text-white/70 text-xs">online</p>
              </div>
            </div>
            
            {/* Chat area */}
            <div ref={chatContainerRef} className="h-[380px] p-3 overflow-y-auto relative">
              <div className="absolute inset-0 opacity-20" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='0.05'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`
              }} />
              
              <div className="relative space-y-2">
                {/* User message */}
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  key={`user-${currentMessageIndex}`}
                  transition={{ duration: 0.3 }}
                  className="bg-[#DCF8C6] rounded-lg px-3 py-2 max-w-[85%] ml-auto shadow-sm"
                >
                  <p className="text-gray-800 text-sm leading-relaxed">
                    {displayedText}
                    {isTyping && displayedText.length < messages[currentMessageIndex].userMessage.length && (
                      <motion.span
                        className="inline-block w-0.5 h-4 bg-gray-600 ml-0.5 align-middle"
                        animate={{ opacity: [1, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                      />
                    )}
                  </p>
                  
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

                {/* Bot typing indicator */}
                {showMessage && !showBotResponse && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
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

                {/* Bot response */}
                {showBotResponse && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white rounded-lg px-3 py-2 max-w-[90%] shadow-sm"
                  >
                    <p className="text-gray-800 text-xs leading-relaxed whitespace-pre-line">
                      {renderBotResponse()}
                    </p>
                    
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="flex items-center justify-end gap-1 mt-1"
                    >
                      <span className="text-[10px] text-gray-500">12:30</span>
                    </motion.div>
                  </motion.div>
                )}

                {/* Second Bot response - Summary or Chart */}
                {showSecondBotResponse && hasSecondResponse && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white rounded-lg px-3 py-2 max-w-[90%] shadow-sm"
                  >
                    {renderSecondResponse()}
                    
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="flex items-center justify-end gap-1 mt-1"
                    >
                      <span className="text-[10px] text-gray-500">12:31</span>
                    </motion.div>
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
                  <path d="M12 2a10 10 0 0110 10 10 10 0 01-10 10A10 10 0 012 12 10 10 0 0112 2m0 2a8 8 0 00-8 8 8 8 0 008 8 8 8 0 008-8 8 8 0 00-8-8m-1 4h2v4h4v2h-6V8z" />
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
