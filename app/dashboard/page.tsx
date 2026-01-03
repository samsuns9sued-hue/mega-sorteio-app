// app/dashboard/page.tsx
"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Countdown from "@/components/Countdown";
import DrawAnimation from "@/components/DrawAnimation";

// --- COMPONENTE VISUAL: BOLINHA FLUTUANTE ---
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

  // Estados Gerais
  const [view, setView] = useState<'JOGAR' | 'MEUS_JOGOS' | 'RESULTADOS'>('JOGAR');
  const [loading, setLoading] = useState(false);
  const [contestInfo, setContestInfo] = useState<any>(null);

  // --- ESTADO DO JOGO ATUAL ---
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);

  // --- NOVO: CARRINHO DE APOSTAS ---
  // Guarda uma lista de arrays (ex: [ [1,2,3...], [4,5,6...] ])
  const [betCart, setBetCart] = useState<number[][]>([]);

  // Estados de Dados e Paginação
  const [myBetsGrouped, setMyBetsGrouped] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const ITEMS_PER_PAGE = 3;
  const [pageBets, setPageBets] = useState(1);
  const [pageHistory, setPageHistory] = useState(1);
  const [selectedContestDetails, setSelectedContestDetails] = useState<any>(null);

  // Sorteio
  const [showLiveDraw, setShowLiveDraw] = useState(false);
  const [drawResults, setDrawResults] = useState<number[]>([]);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  // --- LOAD INITIAL ---
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

  // --- FETCHES ---
  const fetchMyBets = async () => {
    const res = await fetch("/api/bet/my-bets");
    const bets = await res.json();
    const groups: any = {};
    bets.forEach((bet: any) => {
        if (!groups[bet.contestId]) groups[bet.contestId] = { contest: bet.contest, bets: [] };
        groups[bet.contestId].bets.push(bet);
    });
    setMyBetsGrouped(Object.values(groups).sort((a:any, b:any) => b.contest.number - a.contest.number));
  };

  const fetchHistory = async () => {
    const res = await fetch("/api/contest/history");
    const data = await res.json();
    setHistory(data);
  };

  useEffect(() => {
    if (view === 'MEUS_JOGOS') { fetchMyBets(); setPageBets(1); }
    if (view === 'RESULTADOS') { fetchHistory(); setPageHistory(1); }
  }, [view]);

  // --- LÓGICA DE JOGO ---
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

  // --- LÓGICA DO CARRINHO ---
  
  // 1. Adicionar ao Carrinho
  const handleAddToCart = () => {
    if (selectedNumbers.length < 6) return alert("Selecione pelo menos 6 números.");
    
    // Adiciona o jogo atual à lista de jogos pendentes
    setBetCart([...betCart, selectedNumbers.sort((a, b) => a - b)]);
    
    // Limpa a seleção para o próximo jogo
    setSelectedNumbers([]);
    
    // Feedback visual simples
    // (Poderia ser um toast, mas um scroll suave ajuda)
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  // 2. Remover do Carrinho
  const handleRemoveFromCart = (indexToRemove: number) => {
    setBetCart(betCart.filter((_, idx) => idx !== indexToRemove));
  };

  // 3. Finalizar (Enviar tudo para API)
  const handleFinalizeBets = async () => {
    if (betCart.length === 0) return alert("Adicione jogos ao carrinho antes de finalizar.");
    if (!contestInfo) return alert("Aguarde a abertura do concurso.");

    setLoading(true);
    try {
      const res = await fetch("/api/bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            games: betCart, // Envia o array de jogos
            contestId: contestInfo.id 
        }),
      });

      if (res.ok) {
        alert(`✅ Sucesso! ${betCart.length} jogos registrados.`);
        setBetCart([]); // Limpa o carrinho
        setView('MEUS_JOGOS'); // Redireciona
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
      
      {/* BACKGROUND */}
      <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-green-900/20 via-slate-950 to-slate-950" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIiBzdHJva2Utd2lkdGg9IjIiLz48L2c+PC9zdmc+')] opacity-40" />
          {ballNumbers.map((num, i) => (<FloatingBall key={i} number={num} delay={i * 2} duration={20 + i * 2} left={`${10 + (i * 15)}%`} size={i % 2 === 0 ? "w-24 h-24" : "w-32 h-32"} />))}
      </div>

      <div className="relative z-10 pb-20">
        <AnimatePresence>
          {showLiveDraw && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center">
              <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-8 animate-pulse">SORTEIO AO VIVO</h2>
              <DrawAnimation numbers={drawResults} onFinish={handleDrawFinish} />
              <p className="text-gray-500 mt-10 text-sm">Aguarde a finalização...</p>
            </motion.div>
          )}
          {selectedContestDetails && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
              <div className="bg-slate-900/90 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl relative flex flex-col">
                <div className="p-5 border-b border-slate-700 flex justify-between items-center sticky top-0 bg-slate-900 z-10"><h3 className="font-bold text-xl text-yellow-500">Jogos - Concurso #{selectedContestDetails.contest.number}</h3><button onClick={() => setSelectedContestDetails(null)} className="text-gray-400 hover:text-white text-2xl font-bold">&times;</button></div>
                <div className="p-5 space-y-4 overflow-y-auto">
                    {selectedContestDetails.bets.map((bet: any, idx: number) => (
                        <div key={bet.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 shadow-lg">
                            <div className="flex justify-between items-center mb-3"><span className="text-sm text-gray-300 font-bold uppercase tracking-wider">Jogo #{idx + 1}</span>{bet.contest.status === 'FINISHED' && (<span className={`text-sm font-bold ${bet.hits >= 4 ? 'text-green-400' : 'text-slate-500'}`}>{bet.hits} Acertos</span>)}</div>
                            <div className="flex flex-wrap gap-2">{bet.selectedNumbers.map((n: number) => {const hit = bet.contest.status === 'FINISHED' && bet.contest.drawnNumbers.includes(n); return <span key={n} className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-md ${hit ? 'bg-gradient-to-br from-green-500 to-green-600 text-white ring-2 ring-green-300' : 'bg-slate-700 text-gray-400'}`}>{n.toString().padStart(2,'0')}</span>})}</div>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t border-slate-700 bg-slate-900 sticky bottom-0 text-center"><button onClick={() => setSelectedContestDetails(null)} className="bg-slate-700 hover:bg-slate-600 px-8 py-3 rounded-lg text-white font-bold w-full transition-colors">Fechar Detalhes</button></div>
              </div>
            </div>
          )}
        </AnimatePresence>

        <header className="bg-slate-900/40 backdrop-blur-md border-b border-white/5 sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3"><div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center font-black text-slate-900 text-lg shadow-lg shadow-yellow-500/20">M</div><div className="flex flex-col"><span className="font-bold text-lg text-white leading-none">Mega Sorteio</span><span className="text-[10px] text-green-400 font-bold tracking-widest uppercase">Dashboard</span></div></div>
            <div className="flex items-center gap-4"><div className="hidden sm:flex flex-col text-right"><span className="text-xs text-gray-400">Logado como</span><span className="text-sm font-bold text-white">{session?.user?.name}</span></div><button onClick={() => signOut()} className="text-xs font-bold bg-slate-800 hover:bg-red-900/30 text-slate-400 hover:text-red-400 px-4 py-2 rounded-lg transition-all border border-slate-700 hover:border-red-500/30">SAIR</button></div>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-4 pt-8">
          
          <div className="relative overflow-hidden rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-white/10 p-6 sm:p-10 mb-8 shadow-2xl">
             <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
             {contestInfo ? (
               <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                 <div className="text-center md:text-left space-y-2"><div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-bold uppercase tracking-wider mb-2"><span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>Próximo Concurso #{contestInfo.number}</div><h2 className="text-gray-400 text-sm uppercase tracking-widest font-semibold">Estimativa de Prêmio</h2><div className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-600 drop-shadow-sm">{Number(contestInfo.prizeValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div><p className="text-sm text-slate-400 flex items-center gap-2 justify-center md:justify-start">📅 Sorteio: <span className="text-white font-bold">{new Date(contestInfo.drawDate).toLocaleString('pt-BR')}</span></p></div>
                 <div className="flex flex-col items-center bg-slate-950/50 p-6 rounded-2xl border border-white/5"><p className="text-xs text-green-400 font-bold mb-4 uppercase tracking-wider flex items-center gap-2">⏱️ Tempo Restante</p><Countdown targetDate={contestInfo.drawDate} /></div>
               </div>
             ) : (<div className="text-center py-10"><h2 className="text-2xl text-gray-400 font-light">Nenhum concurso aberto.</h2></div>)}
          </div>

          <div className="flex p-1 bg-slate-900/80 backdrop-blur border border-slate-700 rounded-2xl mb-8 shadow-lg overflow-x-auto">
             <button onClick={() => setView('JOGAR')} className={`flex-1 min-w-[120px] py-3 rounded-xl font-bold text-sm transition-all duration-300 ${view === 'JOGAR' ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>APOSTAR</button>
             <button onClick={() => setView('MEUS_JOGOS')} className={`flex-1 min-w-[120px] py-3 rounded-xl font-bold text-sm transition-all duration-300 ${view === 'MEUS_JOGOS' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>MEUS JOGOS</button>
             <button onClick={() => setView('RESULTADOS')} className={`flex-1 min-w-[120px] py-3 rounded-xl font-bold text-sm transition-all duration-300 ${view === 'RESULTADOS' ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>RESULTADOS</button>
          </div>

          <motion.div key={view} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="min-h-[400px]">
            {view === 'JOGAR' && (
              <div className="space-y-6">
                
                {/* 1. SELEÇÃO DE NÚMEROS */}
                <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
                   <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                       <div><h2 className="text-2xl font-bold text-white">Monte seu jogo</h2><p className="text-slate-400 text-sm">Selecione até {MAX_NUMBERS} dezenas.</p></div>
                       <div className="flex gap-3 w-full sm:w-auto">
                           <button onClick={handleClear} className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-slate-600 text-slate-400 hover:border-red-500 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm font-bold">Limpar</button>
                           <button onClick={handleSurpresinha} className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20 transition-all text-sm font-bold flex items-center justify-center gap-2">🎲 Surpresinha ({MAX_NUMBERS})</button>
                       </div>
                   </div>

                   <div className="grid grid-cols-6 sm:grid-cols-10 gap-2 sm:gap-3 mb-10">
                     {Array.from({ length: 60 }, (_, i) => i + 1).map((num) => {
                       const isSelected = selectedNumbers.includes(num);
                       return <button key={num} onClick={() => toggleNumber(num)} className={`aspect-square rounded-full font-bold text-lg sm:text-xl flex items-center justify-center transition-all duration-200 ${isSelected ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white scale-105 shadow-lg shadow-green-500/40 ring-2 ring-green-300 border-transparent" : "bg-slate-800 text-slate-500 border border-slate-700 hover:border-slate-500 hover:text-white hover:bg-slate-700"}`}>{num.toString().padStart(2, "0")}</button>;
                     })}
                   </div>

                   <div className="flex flex-col sm:flex-row justify-between items-center gap-6 pt-6 border-t border-slate-800">
                       <div className="bg-slate-950/50 px-6 py-3 rounded-2xl border border-white/5"><span className="text-slate-500 text-xs uppercase font-bold tracking-wider block mb-1">Selecionados</span><div className="text-3xl font-black text-white">{selectedNumbers.length} <span className="text-lg font-medium text-slate-500">/ {MAX_NUMBERS}</span></div></div>
                       
                       {/* BOTÃO ADICIONAR AO CARRINHO (AMARELO) */}
                       <button
                           onClick={handleAddToCart}
                           disabled={selectedNumbers.length < 6 || !contestInfo}
                           className={`w-full sm:w-auto px-8 py-5 rounded-2xl font-black text-lg shadow-xl transition-all transform active:scale-95 
                             ${(selectedNumbers.length >= 6 && contestInfo) 
                               ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-slate-900 hover:shadow-orange-500/20 hover:scale-[1.02]" 
                               : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"}`}
                       >
                           ADICIONAR AO CARRINHO (+1)
                       </button>
                   </div>
                </div>

                {/* 2. ÁREA DO CARRINHO (APARECE SE TIVER ITENS) */}
                {betCart.length > 0 && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl"
                    >
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                           🛒 Jogos Pendentes 
                           <span className="bg-yellow-500 text-slate-900 text-xs px-2 py-1 rounded-full">{betCart.length}</span>
                        </h3>
                        
                        <div className="grid gap-4 mb-8">
                            {betCart.map((game, idx) => (
                                <div key={idx} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex justify-between items-center group hover:border-slate-600 transition-all">
                                    <div className="flex flex-wrap gap-2">
                                        <span className="text-xs font-bold text-gray-500 uppercase mr-2 mt-1">Jogo {idx + 1}:</span>
                                        {game.map(n => (
                                            <span key={n} className="text-sm font-bold text-slate-300 bg-slate-800 px-2 py-1 rounded-full border border-slate-700">{n.toString().padStart(2, '0')}</span>
                                        ))}
                                    </div>
                                    <button 
                                        onClick={() => handleRemoveFromCart(idx)}
                                        className="text-slate-500 hover:text-red-400 hover:bg-red-900/20 p-2 rounded-lg transition-colors"
                                        title="Remover jogo"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end pt-4 border-t border-slate-700">
                             {/* BOTÃO FINALIZAR (VERDE) */}
                             <button
                                 onClick={handleFinalizeBets}
                                 disabled={loading}
                                 className="w-full sm:w-auto px-12 py-5 rounded-2xl font-black text-xl shadow-xl transition-all transform hover:scale-[1.02] bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-green-500/30"
                             >
                                 {loading ? "REGISTRANDO..." : `FINALIZAR (${betCart.length}) JOGOS ✓`}
                             </button>
                        </div>
                    </motion.div>
                )}
              </div>
            )}

            {view === 'MEUS_JOGOS' && (
               <div className="space-y-4">
                  {myBetsGrouped.length === 0 ? (<div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-10 text-center"><p className="text-gray-500 text-lg">Você ainda não participou de nenhum concurso.</p><button onClick={() => setView('JOGAR')} className="mt-4 text-green-400 font-bold hover:underline">Começar agora</button></div>) : (
                    <>
                      {paginatedBets.map((group: any) => (
                        <div key={group.contest.id} onClick={() => setSelectedContestDetails(group)} className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 hover:border-green-500/50 rounded-2xl p-6 shadow-lg relative overflow-hidden cursor-pointer transition-all group">
                           <div className={`absolute left-0 top-0 bottom-0 w-1 transition-all group-hover:w-2 ${group.contest.status === 'FINISHED' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                           <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pl-4">
                              <div><h2 className="text-2xl font-bold text-white group-hover:text-green-400 transition-colors">Concurso #{group.contest.number}</h2><div className="flex items-center gap-2 mt-2"><span className={`px-2 py-1 rounded text-xs font-bold uppercase ${group.contest.status === 'FINISHED' ? 'bg-green-900/50 text-green-400 border border-green-500/30' : 'bg-yellow-900/50 text-yellow-400 border border-yellow-500/30'}`}>{group.contest.status === 'FINISHED' ? 'Finalizado' : 'Aguardando Sorteio'}</span><span className="text-xs text-gray-500">{new Date(group.contest.drawDate).toLocaleDateString()}</span></div></div>
                              <div className="text-center bg-slate-950/50 px-6 py-3 rounded-xl border border-white/5 min-w-[120px]"><span className="block text-3xl font-black text-white">{group.bets.length}</span><span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Jogos</span></div>
                           </div>
                        </div>
                      ))}
                      {totalPagesBets > 1 && (<div className="flex justify-center gap-4 mt-8"><button onClick={() => setPageBets(p => Math.max(1, p - 1))} disabled={pageBets === 1} className="bg-slate-800 px-6 py-2 rounded-lg font-bold disabled:opacity-50 hover:bg-slate-700">Anterior</button><span className="py-2 text-gray-500 font-mono">Pág {pageBets} / {totalPagesBets}</span><button onClick={() => setPageBets(p => Math.min(totalPagesBets, p + 1))} disabled={pageBets === totalPagesBets} className="bg-slate-800 px-6 py-2 rounded-lg font-bold disabled:opacity-50 hover:bg-slate-700">Próxima</button></div>)}
                    </>
                  )}
               </div>
            )}

            {view === 'RESULTADOS' && (
              <div className="space-y-6">
                {history.length === 0 ? <div className="text-center text-gray-500 py-10">Nenhum resultado disponível.</div> : (
                  <>
                    {paginatedHistory.map((contest) => (
                      <div key={contest.id} className="bg-slate-900/60 backdrop-blur border border-slate-700 rounded-3xl p-8 shadow-xl">
                        <div className="flex flex-col sm:flex-row justify-between items-start mb-8 border-b border-slate-800 pb-6 gap-4">
                          <div><h2 className="text-2xl font-black text-yellow-500">Concurso #{contest.number}</h2><p className="text-gray-400 text-sm mt-1">Realizado em {new Date(contest.drawDate).toLocaleDateString('pt-BR')}</p></div>
                          <div className="text-right"><p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Prêmio Total</p><p className="text-green-400 font-black text-xl sm:text-2xl">{Number(contest.prizeValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
                        </div>
                        <div className="flex flex-wrap gap-3 mb-8 justify-center sm:justify-start">{contest.drawnNumbers.sort((a:any, b:any) => a - b).map((n: number) => (<div key={n} className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-green-700 text-white font-bold flex items-center justify-center shadow-lg border-2 border-green-400/50 text-lg">{n.toString().padStart(2, '0')}</div>))}</div>
                        <div className="grid grid-cols-3 gap-4"><div className="bg-slate-950/50 rounded-2xl p-4 text-center border border-white/5"><p className="text-xs text-gray-500 uppercase font-bold mb-2">Sena</p><p className={`font-black text-2xl ${contest.winnersCount.sena > 0 ? 'text-green-400' : 'text-slate-600'}`}>{contest.winnersCount.sena}</p></div><div className="bg-slate-950/50 rounded-2xl p-4 text-center border border-white/5"><p className="text-xs text-gray-500 uppercase font-bold mb-2">Quina</p><p className={`font-black text-2xl ${contest.winnersCount.quina > 0 ? 'text-blue-400' : 'text-slate-600'}`}>{contest.winnersCount.quina}</p></div><div className="bg-slate-950/50 rounded-2xl p-4 text-center border border-white/5"><p className="text-xs text-gray-500 uppercase font-bold mb-2">Quadra</p><p className={`font-black text-2xl ${contest.winnersCount.quadra > 0 ? 'text-yellow-400' : 'text-slate-600'}`}>{contest.winnersCount.quadra}</p></div></div>
                      </div>
                    ))}
                    {totalPagesHistory > 1 && (<div className="flex justify-center gap-4 mt-8"><button onClick={() => setPageHistory(p => Math.max(1, p - 1))} disabled={pageHistory === 1} className="bg-slate-800 px-6 py-2 rounded-lg font-bold disabled:opacity-50 hover:bg-slate-700">Anterior</button><span className="py-2 text-gray-500 font-mono">Pág {pageHistory} / {totalPagesHistory}</span><button onClick={() => setPageHistory(p => Math.min(totalPagesHistory, p + 1))} disabled={pageHistory === totalPagesHistory} className="bg-slate-800 px-6 py-2 rounded-lg font-bold disabled:opacity-50 hover:bg-slate-700">Próxima</button></div>)}
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