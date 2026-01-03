// app/dashboard/page.tsx
"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Countdown from "@/components/Countdown";
import DrawAnimation from "@/components/DrawAnimation";

const FloatingBall = ({ number, delay, duration, left, size }: any) => {
  const colors = ["from-yellow-400 to-yellow-600", "from-green-400 to-green-600", "from-blue-400 to-blue-600", "from-pink-400 to-pink-600"];
  return (
    <motion.div
      className={`absolute ${size} rounded-full bg-gradient-to-br ${colors[number % colors.length]} flex items-center justify-center font-bold text-white shadow-2xl border-4 border-white/10 opacity-20`}
      style={{ left }}
      initial={{ y: "110vh", opacity: 0, rotate: 0 }}
      animate={{ y: [100, -50, 100], opacity: [0, 0.3, 0.3, 0], rotate: [0, 180, 360] }}
      transition={{ duration: duration, delay: delay, repeat: Infinity, ease: "easeInOut" }}
    >
      <span className="drop-shadow-lg text-lg">{String(number).padStart(2, '0')}</span>
    </motion.div>
  );
};

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [view, setView] = useState<'JOGAR' | 'MEUS_JOGOS' | 'RESULTADOS'>('JOGAR');
  const [loading, setLoading] = useState(false);
  const [contestInfo, setContestInfo] = useState<any>(null);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [betCart, setBetCart] = useState<number[][]>([]);
  const [myBetsGrouped, setMyBetsGrouped] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  const ITEMS_PER_PAGE = 3;
  const [pageBets, setPageBets] = useState(1);
  const [pageHistory, setPageHistory] = useState(1);
  const [selectedContestDetails, setSelectedContestDetails] = useState<any>(null);
  const [showLiveDraw, setShowLiveDraw] = useState(false);
  const [drawResults, setDrawResults] = useState<number[]>([]);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    loadInitialData();
  }, [status, router]);

  const loadInitialData = () => {
    fetch("/api/contest/open")
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setContestInfo(data);
        if (data && data.status === 'OPEN') startPolling(data.id);
      });
  };

  const startPolling = (contestId: string) => {
    if (pollingInterval.current) clearInterval(pollingInterval.current);
    pollingInterval.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/contest/status?id=${contestId}`);
        const data = await res.json();
        if (data.status === 'FINISHED' && data.drawnNumbers.length > 0) {
          if (pollingInterval.current) clearInterval(pollingInterval.current);
          const seenKey = `seen_draw_${contestId}`;
          if (!localStorage.getItem(seenKey)) {
            setDrawResults(data.drawnNumbers);
            setShowLiveDraw(true);
            localStorage.setItem(seenKey, "true");
          } else {
             setContestInfo(null);
             fetchMyBets();
             if(view === 'RESULTADOS') fetchHistory();
          }
        }
      } catch (error) { console.error(error); }
    }, 5000);
  };
  useEffect(() => { return () => { if (pollingInterval.current) clearInterval(pollingInterval.current); }; }, []);

  const fetchMyBets = async () => {
    try {
        const res = await fetch("/api/bet/my-bets");
        const bets = await res.json();
        if (Array.isArray(bets)) {
            const groups: any = {};
            bets.forEach((bet: any) => {
                if (!groups[bet.contestId]) groups[bet.contestId] = { contest: bet.contest, bets: [] };
                groups[bet.contestId].bets.push(bet);
            });
            setMyBetsGrouped(Object.values(groups).sort((a:any, b:any) => b.contest.number - a.contest.number));
        } else setMyBetsGrouped([]);
    } catch (e) { setMyBetsGrouped([]); }
  };

  const fetchHistory = async () => {
    try {
        const res = await fetch("/api/contest/history");
        const data = await res.json();
        if (Array.isArray(data)) setHistory(data);
        else setHistory([]);
    } catch (e) { setHistory([]); }
  };

  useEffect(() => {
    if (view === 'MEUS_JOGOS') { fetchMyBets(); setPageBets(1); }
    if (view === 'RESULTADOS') { fetchHistory(); setPageHistory(1); }
  }, [view]);

  const MAX_NUMBERS = contestInfo ? contestInfo.maxNumbers : 30;

  const toggleNumber = (num: number) => {
    if (selectedNumbers.includes(num)) {
      setSelectedNumbers(selectedNumbers.filter((n) => n !== num));
    } else {
      if (selectedNumbers.length >= MAX_NUMBERS) {
        alert(`Máximo de ${MAX_NUMBERS} números permitidos!`);
        return;
      }
      setSelectedNumbers([...selectedNumbers, num]);
    }
  };

  const handleSurpresinha = () => {
    const randomSet = new Set<number>();
    while (randomSet.size < MAX_NUMBERS) randomSet.add(Math.floor(Math.random() * 60) + 1);
    setSelectedNumbers(Array.from(randomSet));
  };

  const handleClear = () => setSelectedNumbers([]);

  const handleAddToCart = () => {
    if (selectedNumbers.length < 6) return alert("Selecione pelo menos 6 números.");
    setBetCart([...betCart, selectedNumbers.sort((a, b) => a - b)]);
    setSelectedNumbers([]);
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const handleRemoveFromCart = (indexToRemove: number) => {
    setBetCart(betCart.filter((_, idx) => idx !== indexToRemove));
  };

  const handleFinalizeBets = async () => {
    if (betCart.length === 0) return alert("Carrinho vazio.");
    if (!contestInfo) return alert("Aguarde a abertura do concurso.");
    setLoading(true);
    try {
      const res = await fetch("/api/bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ games: betCart, contestId: contestInfo.id }),
      });
      if (res.ok) {
        alert(`✅ Sucesso! ${betCart.length} jogos registrados.`);
        setBetCart([]);
        setView('MEUS_JOGOS');
      } else {
        const err = await res.json();
        alert(err.message || "Erro ao salvar.");
      }
    } catch { alert("Erro de conexão."); }
    setLoading(false);
  };

  const handleDrawFinish = () => { setShowLiveDraw(false); alert("Sorteio Finalizado!"); setContestInfo(null); setView('MEUS_JOGOS'); fetchMyBets(); };

  if (status === "loading") return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Carregando...</div>;

  const paginatedBets = myBetsGrouped.slice((pageBets - 1) * ITEMS_PER_PAGE, pageBets * ITEMS_PER_PAGE);
  const totalPagesBets = Math.ceil(myBetsGrouped.length / ITEMS_PER_PAGE);
  const paginatedHistory = history.slice((pageHistory - 1) * ITEMS_PER_PAGE, pageHistory * ITEMS_PER_PAGE);
  const totalPagesHistory = Math.ceil(history.length / ITEMS_PER_PAGE);
  const ballNumbers = [5, 12, 45, 33, 21, 9];

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans relative overflow-x-hidden">
      {/* Background (Mantido) */}
      <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-green-900/20 via-slate-950 to-slate-950" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIiBzdHJva2Utd2lkdGg9IjIiLz48L2c+PC9zdmc+')] opacity-40" />
          {ballNumbers.map((num, i) => (<FloatingBall key={i} number={num} delay={i * 2} duration={20 + i * 2} left={`${10 + (i * 15)}%`} size={i % 2 === 0 ? "w-24 h-24" : "w-32 h-32"} />))}
      </div>

      <div className="relative z-10 pb-20">
        <AnimatePresence>
          {showLiveDraw && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4">
              <h2 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-8 animate-pulse text-center">SORTEIO AO VIVO</h2>
              <div className="scale-75 sm:scale-100 w-full"><DrawAnimation numbers={drawResults} onFinish={handleDrawFinish} /></div>
              <p className="text-gray-500 mt-4 text-sm">Aguarde a finalização...</p>
            </motion.div>
          )}
          {selectedContestDetails && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
              <div className="bg-slate-900/90 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl relative flex flex-col">
                <div className="p-4 border-b border-slate-700 flex justify-between items-center sticky top-0 bg-slate-900 z-10"><h3 className="font-bold text-lg text-yellow-500">Concurso #{selectedContestDetails.contest.number}</h3><button onClick={() => setSelectedContestDetails(null)} className="text-gray-400 hover:text-white text-2xl font-bold">&times;</button></div>
                <div className="p-4 space-y-3 overflow-y-auto">
                    {selectedContestDetails.bets.map((bet: any, idx: number) => (
                        <div key={bet.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 shadow-lg">
                            <div className="flex justify-between items-center mb-2"><span className="text-xs text-gray-300 font-bold uppercase tracking-wider">Jogo #{idx + 1}</span>{bet.contest.status === 'FINISHED' && (<span className={`text-xs font-bold ${bet.hits >= 4 ? 'text-green-400' : 'text-slate-500'}`}>{bet.hits} Acertos</span>)}</div>
                            <div className="flex flex-wrap gap-1.5">{bet.selectedNumbers.map((n: number) => {const hit = bet.contest.status === 'FINISHED' && bet.contest.drawnNumbers.includes(n); return <span key={n} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-md ${hit ? 'bg-gradient-to-br from-green-500 to-green-600 text-white ring-1 ring-green-300' : 'bg-slate-700 text-gray-400'}`}>{n.toString().padStart(2,'0')}</span>})}</div>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t border-slate-700 bg-slate-900 sticky bottom-0 text-center"><button onClick={() => setSelectedContestDetails(null)} className="bg-slate-700 hover:bg-slate-600 px-6 py-2 rounded-lg text-white font-bold w-full transition-colors">Fechar</button></div>
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* HEADER RESPONSIVO */}
        <header className="bg-slate-900/60 backdrop-blur-md border-b border-white/5 sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center font-black text-slate-900 text-sm sm:text-lg shadow-lg">M</div>
              <div className="flex flex-col">
                 <span className="font-bold text-sm sm:text-lg text-white leading-none">Mega Sorteio</span>
                 <span className="text-[9px] sm:text-[10px] text-green-400 font-bold tracking-widest uppercase">Dashboard</span>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
               <div className="hidden md:flex flex-col text-right"><span className="text-xs text-gray-400">Logado como</span><span className="text-sm font-bold text-white">{session?.user?.name}</span></div>
               <button onClick={() => signOut()} className="text-[10px] sm:text-xs font-bold bg-slate-800 hover:bg-red-900/30 text-slate-400 hover:text-red-400 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg transition-all border border-slate-700">SAIR</button>
            </div>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-4 pt-4 sm:pt-8">
          
          {/* BANNER PRINCIPAL (Mobile Friendly) */}
          <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 p-5 sm:p-10 mb-6 shadow-2xl">
             <div className="absolute top-0 right-0 w-32 h-32 sm:w-64 sm:h-64 bg-green-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
             {contestInfo ? (
               <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                 <div className="text-center md:text-left space-y-1">
                   <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse"></span>Concurso #{contestInfo.number}
                   </div>
                   <h2 className="text-gray-400 text-xs sm:text-sm uppercase tracking-widest font-semibold">Prêmio Estimado</h2>
                   <div className="text-3xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-600 drop-shadow-sm leading-tight">
                     {Number(contestInfo.prizeValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                   </div>
                   <p className="text-xs sm:text-sm text-slate-400 pt-1">📅 Sorteio: <span className="text-white font-bold">{new Date(contestInfo.drawDate).toLocaleString('pt-BR')}</span></p>
                 </div>
                 <div className="flex flex-col items-center bg-slate-950/50 p-4 sm:p-6 rounded-2xl border border-white/5 w-full md:w-auto">
                   <p className="text-[10px] text-green-400 font-bold mb-2 uppercase tracking-wider">⏱️ Tempo Restante</p>
                   <div className="scale-90 sm:scale-100"><Countdown targetDate={contestInfo.drawDate} /></div>
                 </div>
               </div>
             ) : (<div className="text-center py-6"><h2 className="text-lg text-gray-400 font-light">Nenhum concurso aberto.</h2></div>)}
          </div>

          {/* ABAS (Scrollavel em Mobile) */}
          <div className="flex p-1 bg-slate-900/80 backdrop-blur border border-slate-700 rounded-xl mb-6 shadow-lg overflow-x-auto no-scrollbar">
             <button onClick={() => setView('JOGAR')} className={`flex-1 min-w-[100px] py-2 sm:py-3 rounded-lg font-bold text-xs sm:text-sm transition-all duration-300 whitespace-nowrap ${view === 'JOGAR' ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>APOSTAR</button>
             <button onClick={() => setView('MEUS_JOGOS')} className={`flex-1 min-w-[100px] py-2 sm:py-3 rounded-lg font-bold text-xs sm:text-sm transition-all duration-300 whitespace-nowrap ${view === 'MEUS_JOGOS' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>MEUS JOGOS</button>
             <button onClick={() => setView('RESULTADOS')} className={`flex-1 min-w-[100px] py-2 sm:py-3 rounded-lg font-bold text-xs sm:text-sm transition-all duration-300 whitespace-nowrap ${view === 'RESULTADOS' ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>RESULTADOS</button>
          </div>

          <motion.div key={view} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="min-h-[400px]">
            {view === 'JOGAR' && (
              <div className="space-y-6">
                <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-10 shadow-2xl relative">
                   {/* FERRAMENTAS */}
                   <div className="flex flex-col gap-4 mb-6">
                       <div><h2 className="text-xl font-bold text-white">Monte seu jogo</h2><p className="text-slate-400 text-xs sm:text-sm">Selecione até {MAX_NUMBERS} dezenas.</p></div>
                       <div className="flex gap-2">
                           <button onClick={handleClear} className="flex-1 px-3 py-2 rounded-xl border border-slate-600 text-slate-400 hover:border-red-500 hover:text-red-400 transition-all text-xs font-bold">Limpar</button>
                           <button onClick={handleSurpresinha} className="flex-[2] px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-lg transition-all text-xs font-bold flex items-center justify-center gap-2">🎲 Surpresinha</button>
                       </div>
                   </div>

                   {/* GRID RESPONSIVO (5 colunas no mobile, 10 no desktop) */}
                   <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10 sm:gap-3 mb-8">
                     {Array.from({ length: 60 }, (_, i) => i + 1).map((num) => {
                       const isSelected = selectedNumbers.includes(num);
                       return <button key={num} onClick={() => toggleNumber(num)} className={`aspect-square rounded-full font-bold text-sm sm:text-xl flex items-center justify-center transition-all duration-200 ${isSelected ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white scale-105 shadow-lg ring-2 ring-green-300 border-transparent" : "bg-slate-800 text-slate-500 border border-slate-700 hover:border-slate-500 hover:text-white"}`}>{num.toString().padStart(2, "0")}</button>;
                     })}
                   </div>

                   {/* BARRA DE AÇÃO (Fixo embaixo ou normal) */}
                   <div className="flex flex-col gap-4 pt-4 border-t border-slate-800">
                       <div className="flex justify-between items-center bg-slate-950/50 px-4 py-3 rounded-xl border border-white/5">
                           <span className="text-slate-500 text-xs uppercase font-bold">Selecionados</span>
                           <div className="text-2xl font-black text-white">{selectedNumbers.length} <span className="text-sm font-medium text-slate-500">/ {MAX_NUMBERS}</span></div>
                       </div>
                       <button onClick={handleAddToCart} disabled={selectedNumbers.length < 6 || !contestInfo} className={`w-full py-4 rounded-xl font-black text-base sm:text-lg shadow-xl transition-all active:scale-95 ${(selectedNumbers.length >= 6 && contestInfo) ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-slate-900" : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"}`}>ADICIONAR AO CARRINHO (+1)</button>
                   </div>
                </div>

                {/* CARRINHO RESPONSIVO */}
                {betCart.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-2xl p-4 sm:p-8 shadow-2xl">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">🛒 Carrinho <span className="bg-yellow-500 text-slate-900 text-xs px-2 py-0.5 rounded-full">{betCart.length}</span></h3>
                        <div className="flex flex-col gap-3 mb-6 max-h-[300px] overflow-y-auto">
                            {betCart.map((game, idx) => (
                                <div key={idx} className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex justify-between items-center">
                                    <div className="flex flex-wrap gap-1"><span className="text-[10px] font-bold text-gray-500 uppercase mr-1 mt-1">#{idx + 1}</span>{game.map(n => (<span key={n} className="text-xs font-bold text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">{n.toString().padStart(2, '0')}</span>))}</div>
                                    <button onClick={() => handleRemoveFromCart(idx)} className="text-slate-500 hover:text-red-400 p-2"><span className="text-lg">🗑️</span></button>
                                </div>
                            ))}
                        </div>
                        <button onClick={handleFinalizeBets} disabled={loading} className="w-full py-4 rounded-xl font-black text-lg shadow-xl transition-all transform hover:scale-[1.02] bg-gradient-to-r from-green-600 to-emerald-600 text-white">{loading ? "REGISTRANDO..." : `FINALIZAR (${betCart.length}) JOGOS`}</button>
                    </motion.div>
                )}
              </div>
            )}

            {view === 'MEUS_JOGOS' && (
               <div className="space-y-4">
                  {myBetsGrouped.length === 0 ? (<div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-10 text-center"><p className="text-gray-500">Sem jogos ainda.</p><button onClick={() => setView('JOGAR')} className="mt-2 text-green-400 font-bold underline">Jogar agora</button></div>) : (
                    <>
                      {paginatedBets.map((group: any) => (
                        <div key={group.contest.id} onClick={() => setSelectedContestDetails(group)} className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-lg relative overflow-hidden cursor-pointer transition-all active:scale-98">
                           <div className={`absolute left-0 top-0 bottom-0 w-1 ${group.contest.status === 'FINISHED' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                           <div className="flex justify-between items-center pl-3">
                              <div><h2 className="text-lg font-bold text-white">#{group.contest.number}</h2><span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${group.contest.status === 'FINISHED' ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400'}`}>{group.contest.status === 'FINISHED' ? 'Finalizado' : 'Aberto'}</span></div>
                              <div className="text-right"><span className="block text-2xl font-black text-white">{group.bets.length}</span><span className="text-[9px] text-gray-400 uppercase font-bold">Jogos</span></div>
                           </div>
                        </div>
                      ))}
                      {totalPagesBets > 1 && (<div className="flex justify-center gap-3 mt-6"><button onClick={() => setPageBets(p => Math.max(1, p - 1))} disabled={pageBets === 1} className="bg-slate-800 px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50">←</button><span className="py-2 text-gray-500 text-xs">{pageBets}/{totalPagesBets}</span><button onClick={() => setPageBets(p => Math.min(totalPagesBets, p + 1))} disabled={pageBets === totalPagesBets} className="bg-slate-800 px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50">→</button></div>)}
                    </>
                  )}
               </div>
            )}

            {view === 'RESULTADOS' && (
              <div className="space-y-6">
                {history.length === 0 ? <div className="text-center text-gray-500 py-10">Nada aqui.</div> : (
                  <>
                    {paginatedHistory.map((contest) => (
                      <div key={contest.id} className="bg-slate-900/60 backdrop-blur border border-slate-700 rounded-2xl p-5 shadow-xl">
                        <div className="flex justify-between items-start mb-4 pb-4 border-b border-slate-800">
                          <div><h2 className="text-lg font-black text-yellow-500">#{contest.number}</h2><p className="text-gray-400 text-xs">{new Date(contest.drawDate).toLocaleDateString('pt-BR')}</p></div>
                          <div className="text-right"><p className="text-xs text-gray-500 uppercase">Prêmio</p><p className="text-green-400 font-black text-sm">{Number(contest.prizeValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-4 justify-center">{contest.drawnNumbers.sort((a:any, b:any) => a - b).map((n: number) => (<div key={n} className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-green-700 text-white font-bold flex items-center justify-center text-xs shadow-md border border-green-400/50">{n.toString().padStart(2, '0')}</div>))}</div>
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                           <div className="bg-slate-950/50 p-2 rounded border border-white/5"><span className="block text-gray-500">Sena</span><span className={`font-bold ${contest.winnersCount.sena > 0 ? 'text-green-400' : 'text-slate-600'}`}>{contest.winnersCount.sena}</span></div>
                           <div className="bg-slate-950/50 p-2 rounded border border-white/5"><span className="block text-gray-500">Quina</span><span className={`font-bold ${contest.winnersCount.quina > 0 ? 'text-blue-400' : 'text-slate-600'}`}>{contest.winnersCount.quina}</span></div>
                           <div className="bg-slate-950/50 p-2 rounded border border-white/5"><span className="block text-gray-500">Quadra</span><span className={`font-bold ${contest.winnersCount.quadra > 0 ? 'text-yellow-400' : 'text-slate-600'}`}>{contest.winnersCount.quadra}</span></div>
                        </div>
                      </div>
                    ))}
                    {totalPagesHistory > 1 && (<div className="flex justify-center gap-3 mt-6"><button onClick={() => setPageHistory(p => Math.max(1, p - 1))} disabled={pageHistory === 1} className="bg-slate-800 px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50">←</button><span className="py-2 text-gray-500 text-xs">{pageHistory}/{totalPagesHistory}</span><button onClick={() => setPageHistory(p => Math.min(totalPagesHistory, p + 1))} disabled={pageHistory === totalPagesHistory} className="bg-slate-800 px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50">→</button></div>)}
                  </>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}