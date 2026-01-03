// components/DrawAnimation.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DrawAnimationProps {
  numbers: number[];
  onFinish: () => void;
}

// --- CONFIGURAÇÃO CENTRAL DE CORES (Para garantir consistência) ---
const BALL_STYLES: Record<number, { simple: string, gradient: string }> = {
  1: { simple: "bg-red-500", gradient: "from-red-500 via-red-600 to-red-900" },     // Vermelho
  2: { simple: "bg-yellow-400", gradient: "from-yellow-300 via-yellow-500 to-yellow-700" }, // Amarelo
  3: { simple: "bg-green-500", gradient: "from-green-400 via-green-600 to-green-900" },   // Verde
  4: { simple: "bg-amber-700", gradient: "from-amber-600 via-amber-800 to-amber-950" },   // Marrom
  5: { simple: "bg-blue-500", gradient: "from-blue-400 via-blue-600 to-blue-900" },     // Azul
  6: { simple: "bg-pink-500", gradient: "from-pink-400 via-pink-600 to-pink-900" },     // Rosa
  7: { simple: "bg-slate-800", gradient: "from-gray-600 via-gray-800 to-black" },       // Preto
  8: { simple: "bg-slate-400", gradient: "from-slate-300 via-slate-400 to-slate-600" },   // Cinza
  9: { simple: "bg-orange-500", gradient: "from-orange-400 via-orange-500 to-orange-800" }, // Laranja
  0: { simple: "bg-teal-400", gradient: "from-teal-300 via-teal-500 to-teal-800" },     // Branco/Teal
};

const getBallStyle = (num: number) => {
  const n = num % 10;
  return BALL_STYLES[n] || BALL_STYLES[0];
};

// --- COMPONENTE BOLA INTERNA (Simples) ---
const GlobeBall = ({ number, delay, isDrawn, isSpinning }: { number: number; delay: number; isDrawn: boolean; isSpinning: boolean }) => {
  // Posição aleatória memoizada para não tremer
  const pos = useMemo(() => ({
    x: Math.random() * 140 - 70, // Espalha mais dentro do globo
    y: Math.random() * 140 - 70,
    dur: 0.5 + Math.random() * 1.5
  }), []);

  if (isDrawn) return null;

  const style = getBallStyle(number);

  return (
    <motion.div
      className={`absolute w-6 h-6 sm:w-7 sm:h-7 rounded-full ${style.simple} 
        flex items-center justify-center text-[9px] font-bold text-white
        shadow-[inset_-1px_-1px_2px_rgba(0,0,0,0.5)] border border-white/20`}
      style={{ left: `50%`, top: `50%` }}
      animate={isSpinning ? {
        x: [pos.x, -pos.x * 0.8, pos.x * 0.5, -pos.x],
        y: [pos.y, pos.y * 0.8, -pos.y, pos.y * 0.5],
        rotate: [0, 180, 360],
        scale: [0.8, 1.1, 0.9, 1],
        zIndex: [0, 10, 0]
      } : {
        x: pos.x, y: pos.y + 50 // Caem para o fundo quando para
      }}
      transition={{
        duration: pos.dur * 2,
        repeat: isSpinning ? Infinity : 0,
        repeatType: "mirror",
        ease: "easeInOut",
        delay: delay * 0.02,
      }}
    >
      <span className="drop-shadow-sm">{number.toString().padStart(2, '0')}</span>
    </motion.div>
  );
};

// --- COMPONENTE PRINCIPAL ---
export default function DrawAnimation({ numbers, onFinish }: DrawAnimationProps) {
  const [displayedBalls, setDisplayedBalls] = useState<number[]>([]);
  const [isSpinning, setIsSpinning] = useState(true);
  const [exitingBall, setExitingBall] = useState<number | null>(null);

  // Array estático de 1 a 60
  const allBalls = useMemo(() => Array.from({ length: 60 }, (_, i) => i + 1), []);

  useEffect(() => {
    if (!numbers || numbers.length === 0) return;
    setDisplayedBalls([]);
    setIsSpinning(true);

    const interval = setInterval(() => {
      setDisplayedBalls((currentBalls) => {
        if (currentBalls.length >= numbers.length) return currentBalls;
        
        const nextBall = numbers[currentBalls.length];
        
        // Ativa a animação de saída
        setExitingBall(nextBall);
        setTimeout(() => setExitingBall(null), 600); // Sincronizado com a animação
        
        return [...currentBalls, nextBall];
      });
    }, 2500); // 2.5s para dar tempo da animação de saída brilhar

    return () => clearInterval(interval);
  }, [numbers]);

  useEffect(() => {
    if (numbers.length > 0 && displayedBalls.length === numbers.length) {
      setIsSpinning(false);
      const timeout = setTimeout(onFinish, 5000);
      return () => clearTimeout(timeout);
    }
  }, [displayedBalls, numbers, onFinish]);

  return (
    <div className="flex flex-col items-center justify-center py-6 w-full relative min-h-[600px] overflow-hidden">
      
      {/* Luzes Ambiente */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/4 w-64 h-64 bg-green-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-1/4 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl animate-pulse delay-700" />
      </div>

      {/* Cabeçalho */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center z-10">
        <h2 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-yellow-300 via-yellow-100 to-yellow-300 bg-clip-text text-transparent drop-shadow-sm">
          {isSpinning ? "SORTEANDO..." : "RESULTADO OFICIAL"}
        </h2>
        <p className="text-sm text-green-400 font-bold uppercase tracking-widest mt-2">
          {displayedBalls.length} / {numbers.length} DEZENAS
        </p>
      </motion.div>

      {/* --- MÁQUINA DE SORTEIO --- */}
      <div className={`relative w-80 h-80 sm:w-96 sm:h-96 mb-12 transition-all duration-700 ${isSpinning ? 'opacity-100' : 'opacity-80 scale-95 grayscale-[0.5]'}`}>
        
        {/* Estrutura Externa (Vidro) */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/10 to-black/80 border-4 border-slate-500/30 backdrop-blur-[2px] shadow-2xl overflow-hidden z-10">
            {/* Reflexos */}
            <div className="absolute top-0 left-10 w-20 h-full bg-gradient-to-r from-white/10 to-transparent skew-x-12 blur-md" />
            <div className="absolute top-5 right-10 w-10 h-20 bg-white/20 rounded-full blur-xl" />
            
            {/* Centro Mecânico */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
               <motion.div 
                 animate={{ rotate: isSpinning ? 360 : 0 }} 
                 transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                 className="w-24 h-24 border-4 border-yellow-600/50 rounded-full flex items-center justify-center bg-black/20"
               >
                 <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-yellow-800 rounded-full shadow-inner flex items-center justify-center">
                    <span className="text-yellow-950 font-black text-xs">MEGA</span>
                 </div>
               </motion.div>
            </div>

            {/* Bolas Internas */}
            <div className="absolute inset-0 z-0">
                {allBalls.map((num, idx) => (
                    <GlobeBall key={num} number={num} delay={idx} isDrawn={displayedBalls.includes(num)} isSpinning={isSpinning} />
                ))}
            </div>
        </div>

        {/* Animação da Bola Saindo (Pelo meio) */}
        <AnimatePresence>
            {exitingBall && (
                <motion.div
                    initial={{ scale: 0.5, y: 0, opacity: 0, zIndex: 5 }}
                    animate={{ scale: 1.5, y: 180, opacity: 1, zIndex: 50 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.6, ease: "circOut" }}
                    className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full 
                      bg-gradient-to-br ${getBallStyle(exitingBall).gradient}
                      flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.5)] border-2 border-white`}
                >
                    <span className="text-white font-black text-2xl drop-shadow-md">{exitingBall.toString().padStart(2, '0')}</span>
                </motion.div>
            )}
        </AnimatePresence>

        {/* Base / Tubo de Saída */}
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-20 h-24 bg-gradient-to-b from-slate-700 to-slate-900 rounded-b-3xl border-x-4 border-b-4 border-slate-600 shadow-2xl z-0 flex justify-center items-end pb-4">
            <div className="w-12 h-4 bg-black/50 rounded-full blur-sm" />
        </div>
      </div>

      {/* --- CANALETA DE RESULTADOS --- */}
      <div className="w-full max-w-5xl px-4 perspective-1000 z-20">
        <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
            {/* Header da Canaleta */}
            <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sequência do Sorteio</span>
                <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse delay-75" />
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse delay-150" />
                </div>
            </div>

            {/* Bolas Sorteadas */}
            <div className="flex flex-wrap justify-center gap-4 min-h-[100px]">
                <AnimatePresence mode="popLayout">
                    {displayedBalls.map((num, idx) => {
                        const style = getBallStyle(num);
                        return (
                            <motion.div
                                key={`${idx}-${num}`}
                                initial={{ y: -50, opacity: 0, scale: 0.5, rotateX: 90 }}
                                animate={{ y: 0, opacity: 1, scale: 1, rotateX: 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                className="relative group"
                            >
                                <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br ${style.gradient} 
                                    flex items-center justify-center shadow-[inset_-5px_-5px_10px_rgba(0,0,0,0.4),5px_5px_15px_rgba(0,0,0,0.3)]
                                    border border-white/20 relative overflow-hidden`}
                                >
                                    {/* Brilho Glossy */}
                                    <div className="absolute top-2 left-3 w-8 h-4 bg-white/40 blur-[2px] rounded-full -rotate-12" />
                                    <span className="text-2xl sm:text-3xl font-black text-white drop-shadow-md z-10">{num.toString().padStart(2, '0')}</span>
                                </div>
                                {/* Badge de Ordem */}
                                <div className="absolute -top-2 -right-2 w-6 h-6 bg-slate-900 border border-slate-600 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-300 shadow-md">
                                    {idx + 1}
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
            
            {/* Barra de Progresso */}
            <div className="mt-8 relative h-1 bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 to-yellow-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${(displayedBalls.length / numbers.length) * 100}%` }}
                    transition={{ duration: 0.5 }}
                />
            </div>
        </div>
      </div>

    </div>
  );
}