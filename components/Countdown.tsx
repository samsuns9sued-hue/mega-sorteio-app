// components/Countdown.tsx
"use client";

import { useEffect, useState } from "react";
import { differenceInSeconds } from "date-fns";

export default function Countdown({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const target = new Date(targetDate);
      const diff = differenceInSeconds(target, now);

      if (diff <= 0) {
        setIsExpired(true);
        clearInterval(interval);
      } else {
        const d = Math.floor(diff / (3600 * 24));
        const h = Math.floor((diff % (3600 * 24)) / 3600);
        const m = Math.floor((diff % 3600) / 60);
        const s = diff % 60;
        setTimeLeft({ d, h, m, s });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  if (isExpired) return <span className="text-red-400 font-bold">Sorteio Iniciado/Encerrado</span>;

  // Renderização Visual dos Blocos de Tempo
  return (
    <div className="flex gap-2 sm:gap-4 text-center">
      <TimeBlock value={timeLeft.d} label="DIAS" />
      <TimeBlock value={timeLeft.h} label="HRS" />
      <TimeBlock value={timeLeft.m} label="MIN" />
      <TimeBlock value={timeLeft.s} label="SEG" />
    </div>
  );
}

function TimeBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700 text-white font-mono text-2xl sm:text-3xl font-bold w-16 h-16 sm:w-20 sm:h-20 rounded-lg flex items-center justify-center shadow-lg">
        {value.toString().padStart(2, "0")}
      </div>
      <span className="text-[10px] sm:text-xs text-slate-400 mt-1 font-bold tracking-wider">{label}</span>
    </div>
  );
}