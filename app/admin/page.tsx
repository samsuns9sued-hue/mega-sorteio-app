// app/admin/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import DrawAnimation from "@/components/DrawAnimation";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [view, setView] = useState<'DASHBOARD' | 'DRAWING'>('DASHBOARD');
  const [contests, setContests] = useState<any[]>([]);
  const [drawResults, setDrawResults] = useState<number[]>([]);
  
  const [selectedContestId, setSelectedContestId] = useState<string | null>(null);
  const [detailsData, setDetailsData] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [newContest, setNewContest] = useState({ number: "", prizeValue: "", drawDate: "", maxNumbers: "30" });

  useEffect(() => {
    if (status === "authenticated" && (session?.user as any)?.role === "ADMIN") {
      fetchContests();
    } else if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status]);

  const fetchContests = async () => {
    try {
        const res = await fetch("/api/contest");
        const data = await res.json();
        // Blindagem contra erro de tipo
        if (Array.isArray(data)) {
            setContests(data);
        } else {
            console.error("Erro no fetch admin:", data);
            setContests([]);
        }
    } catch(e) {
        setContests([]);
    }
  };

  // ... (o resto do código do Admin permanece igual) ...
  // Para economizar espaço, mantenha as funções handleCreate, handleDelete, etc. iguais
  // Apenas a fetchContests acima era o ponto crítico.
  
  // Copie abaixo todo o resto do seu arquivo admin/page.tsx original, 
  // pois a única mudança crítica foi na fetchContests.
  
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm("Confirmar criação?")) return;
    const res = await fetch("/api/contest", { method: "POST", body: JSON.stringify(newContest) });
    if (res.ok) {
      alert("Criado!");
      setNewContest({ number: "", prizeValue: "", drawDate: "", maxNumbers: "30" });
      fetchContests();
    } else alert("Erro ao criar.");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Isso apagará todas as apostas. Continuar?")) return;
    await fetch(`/api/contest/${id}`, { method: "DELETE" });
    fetchContests();
  };

  const startDraw = async () => {
    setView('DRAWING');
    try {
      const res = await fetch("/api/contest/draw", { method: "POST" });
      const data = await res.json();
      if (res.ok) setDrawResults(data.drawnNumbers);
      else { alert(data.message); setView('DASHBOARD'); }
    } catch { setView('DASHBOARD'); }
  };

  const openDetails = async (id: string) => {
    setSelectedContestId(id);
    setLoadingDetails(true);
    setDetailsData(null);
    try {
      const res = await fetch(`/api/contest/${id}`);
      const data = await res.json();
      setDetailsData(data);
    } catch (e) { alert("Erro ao carregar detalhes"); }
    setLoadingDetails(false);
  };

  const closeDetails = () => { setSelectedContestId(null); setDetailsData(null); };

  if (status === "loading" || (session?.user as any)?.role !== "ADMIN") return <div className="p-10 text-white">Carregando...</div>;

  if (view === 'DRAWING') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <h1 className="text-yellow-500 text-3xl font-bold mb-10">Realizando Sorteio...</h1>
        {drawResults.length > 0 && (
          <DrawAnimation numbers={drawResults} onFinish={() => { alert("Finalizado!"); setView('DASHBOARD'); fetchContests(); }} />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8 relative">
      {/* Mantenha o JSX do Admin igual ao anterior */}
      {selectedContestId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <button onClick={closeDetails} className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl font-bold">✕</button>
            <div className="p-8">
              {loadingDetails ? <div className="text-center py-10 text-yellow-500">Carregando...</div> : detailsData ? (
                <>
                  <h2 className="text-2xl font-bold text-white mb-1">Relatório do Concurso #{detailsData.contest.number}</h2>
                  <p className="text-gray-400 text-sm mb-6">Max. Dezenas: <span className="text-white font-bold">{detailsData.contest.maxNumbers}</span></p>
                  {detailsData.contest.status === 'FINISHED' && (
                    <div className="bg-slate-800 p-4 rounded-xl mb-6 text-center">
                      <p className="text-xs uppercase tracking-widest text-gray-400 mb-3">Dezenas Sorteadas</p>
                      <div className="flex justify-center flex-wrap gap-2">
                        {detailsData.contest.drawnNumbers.sort((a:any,b:any)=>a-b).map((n: number) => (
                          <span key={n} className="w-10 h-10 rounded-full bg-green-600 text-white font-bold flex items-center justify-center shadow-lg">{n.toString().padStart(2, '0')}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-slate-800 p-4 rounded-xl border-l-4 border-blue-500"><p className="text-gray-400 text-xs uppercase">Total de Apostas</p><p className="text-3xl font-bold text-white">{detailsData.stats.totalBets}</p></div>
                    <div className="bg-slate-800 p-4 rounded-xl border-l-4 border-yellow-500"><p className="text-gray-400 text-xs uppercase">Prêmio Ofertado</p><p className="text-xl font-bold text-white truncate">{Number(detailsData.contest.prizeValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-4 border-b border-slate-700 pb-2">Quadro de Ganhadores</h3>
                  <div className="space-y-4">
                    <WinnerRow title="Sena (6 Acertos)" color="text-green-400" winners={detailsData.stats.sena} icon="🏆"/>
                    <WinnerRow title="Quina (5 Acertos)" color="text-blue-400" winners={detailsData.stats.quina} icon="🥈"/>
                    <WinnerRow title="Quadra (4 Acertos)" color="text-yellow-400" winners={detailsData.stats.quadra} icon="🥉"/>
                  </div>
                </>
              ) : <div className="text-red-400">Erro.</div>}
            </div>
            <div className="bg-slate-950 p-4 border-t border-slate-800 flex justify-end"><button onClick={closeDetails} className="bg-slate-800 hover:bg-slate-700 px-6 py-2 rounded text-white font-bold">Fechar</button></div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-10">
          <h1 className="text-3xl font-bold text-yellow-500">Administração</h1>
          <button onClick={() => router.push('/dashboard')} className="text-gray-400 hover:text-white">Voltar ao Site</button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 h-fit">
            <h2 className="text-xl font-bold mb-4 text-green-400">Novo Concurso</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div><label className="text-xs text-gray-500">Nº Concurso</label><input type="number" required className="w-full bg-slate-800 border border-slate-700 p-2 rounded text-white" value={newContest.number} onChange={e => setNewContest({...newContest, number: e.target.value})} /></div>
              <div><label className="text-xs text-gray-500">Prêmio (R$)</label><input type="number" required step="0.01" className="w-full bg-slate-800 border border-slate-700 p-2 rounded text-white" value={newContest.prizeValue} onChange={e => setNewContest({...newContest, prizeValue: e.target.value})} /></div>
              <div><label className="text-xs text-gray-500">Data Sorteio</label><input type="datetime-local" required className="w-full bg-slate-800 border border-slate-700 p-2 rounded text-white" value={newContest.drawDate} onChange={e => setNewContest({...newContest, drawDate: e.target.value})} /></div>
              <div><label className="text-xs text-gray-500">Máx. Dezenas (Surpresinha)</label><input type="number" required min="6" max="60" className="w-full bg-slate-800 border border-slate-700 p-2 rounded text-white" value={newContest.maxNumbers} onChange={e => setNewContest({...newContest, maxNumbers: e.target.value})} /></div>
              <button type="submit" className="w-full bg-green-700 hover:bg-green-600 py-3 rounded font-bold">Agendar</button>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-xl border border-yellow-500/30 flex justify-between items-center">
              <div><h3 className="text-lg font-bold text-white">Controle de Sorteio</h3><p className="text-sm text-gray-400">Sorteio do concurso aberto.</p></div>
              <button onClick={startDraw} className="bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-full font-bold shadow-lg animate-pulse">SORTEAR AGORA</button>
            </div>

            <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
              {/* ADICIONEI ESTA DIV ABAIXO PARA ROLAGEM LATERAL NO CELULAR */}
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[600px]"> {/* Adicionei min-w para garantir largura mínima */}
                  <thead className="bg-slate-950 text-gray-400">
                    <tr>
                      <th className="p-4 whitespace-nowrap">#</th>
                      <th className="p-4 whitespace-nowrap">Status</th>
                      <th className="p-4 whitespace-nowrap">Max. Dezenas</th>
                      <th className="p-4 whitespace-nowrap">Prêmio</th>
                      <th className="p-4 text-right whitespace-nowrap">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {contests.map(c => (
                      <tr key={c.id} className="hover:bg-slate-800/50">
                        <td className="p-4 font-bold">#{c.number}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs whitespace-nowrap ${c.status === 'OPEN' ? 'bg-green-900 text-green-200' : 'bg-gray-700 text-gray-300'}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="p-4 text-center text-gray-300">{c.maxNumbers}</td>
                        <td className="p-4 text-green-400 whitespace-nowrap">
                          {Number(c.prizeValue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="p-4 text-right space-x-3 whitespace-nowrap">
                          <button onClick={() => openDetails(c.id)} className="text-blue-400 hover:text-blue-300 font-bold text-sm">Ver Detalhes</button>
                          <button onClick={() => handleDelete(c.id)} className="text-red-400 hover:text-red-300 text-sm">Excluir</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WinnerRow({ title, color, winners, icon }: { title: string, color: string, winners: string[], icon: string }) {
    return (
        <div className="bg-slate-800/50 p-3 rounded-lg flex items-start gap-3">
            <span className="text-2xl">{icon}</span>
            <div className="flex-1">
                <div className="flex justify-between items-center mb-1"><span className={`font-bold ${color}`}>{title}</span><span className="text-xs bg-slate-700 px-2 py-1 rounded text-white">{winners.length} ganhador(es)</span></div>
                {winners.length > 0 ? <div className="flex flex-wrap gap-2 mt-2">{winners.map((name, idx) => <span key={idx} className="text-xs bg-slate-900 border border-slate-700 text-gray-300 px-2 py-1 rounded">{name}</span>)}</div> : <p className="text-xs text-gray-600 italic">Acumulado</p>}
            </div>
        </div>
    )
}