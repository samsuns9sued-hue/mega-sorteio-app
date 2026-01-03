// app/login/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

// --- COMPONENTES VISUAIS (Reutilizados da Home para consistência) ---

const FloatingBall = ({ number, delay, duration, left, size }: any) => {
  const colors = [
    "from-yellow-400 to-yellow-600", "from-green-400 to-green-600", 
    "from-blue-400 to-blue-600", "from-pink-400 to-pink-600"
  ];
  return (
    <motion.div
      className={`absolute ${size} rounded-full bg-gradient-to-br ${colors[number % colors.length]} flex items-center justify-center font-bold text-white shadow-2xl border-4 border-white/10 opacity-30`}
      style={{ left }}
      initial={{ y: "110vh", opacity: 0, rotate: 0 }}
      animate={{ y: [100, -50, 100], opacity: [0, 0.5, 0.5, 0], rotate: [0, 180, 360] }}
      transition={{ duration: duration, delay: delay, repeat: Infinity, ease: "easeInOut" }}
    >
      <span className="drop-shadow-lg text-lg">{String(number).padStart(2, '0')}</span>
    </motion.div>
  );
};

// --- FORMULÁRIO DE LOGIN ---

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({ username: "", password: "" });

  useEffect(() => {
    if (searchParams.get("mode") === "register") {
      setIsRegister(true);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (isRegister) {
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (res.ok) {
          alert("Conta criada! Fazendo login automáticamento...");
          await signIn("credentials", {
            username: formData.username,
            password: formData.password,
            redirect: true,
            callbackUrl: "/dashboard",
          });
        } else {
          const data = await res.json();
          setError(data.message || "Erro ao cadastrar.");
        }
      } catch (err) { setError("Erro de conexão."); }
    } else {
      const res = await signIn("credentials", {
        username: formData.username,
        password: formData.password,
        redirect: false,
      });

      if (res?.error) setError("Usuário ou senha inválidos.");
      else router.push("/dashboard");
    }
    setLoading(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden p-8 relative z-20"
    >
        {/* Cabeçalho do Card */}
        <div className="text-center mb-8">
            <motion.div 
              initial={{ scale: 0 }} animate={{ scale: 1 }} 
              className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-yellow-500/20"
            >
              <span className="text-3xl font-black text-slate-900">M</span>
            </motion.div>
            <h2 className="text-3xl font-black text-white tracking-tight">
              {isRegister ? "Criar Conta" : "Acessar Painel"}
            </h2>
            <p className="text-slate-400 text-sm mt-2">
              {isRegister ? "Comece a apostar em segundos." : "Bem-vindo de volta, apostador."}
            </p>
        </div>

        {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/50 text-red-200 p-3 rounded-xl mb-6 text-sm text-center font-medium"
            >
              {error}
            </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Usuário</label>
              <input
                  type="text" required
                  className="w-full p-4 bg-slate-950/50 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                  placeholder="Ex: joaosilva"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Senha</label>
              <input
                  type="password" required
                  className="w-full p-4 bg-slate-950/50 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold py-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-95 shadow-lg shadow-green-500/20 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                  <span>Processando...</span>
                </div>
              ) : isRegister ? "Finalizar Cadastro" : "Entrar no Sistema"}
            </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800 text-center">
            <button
              onClick={() => { setIsRegister(!isRegister); setError(""); }}
              className="text-sm text-slate-400 hover:text-yellow-400 font-medium transition-colors"
            >
              {isRegister
                  ? "Já tem uma conta? Clique para entrar."
                  : "Não tem conta? Crie agora, é grátis."}
            </button>
        </div>
        
        <div className="mt-6 text-center">
            <Link href="/" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
                ← Voltar para a página inicial
            </Link>
        </div>
    </motion.div>
  );
}

// --- PÁGINA PRINCIPAL (WRAPPER) ---

export default function LoginPage() {
  const ballNumbers = [7, 13, 22, 35, 42];

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden font-sans">
        
        {/* --- BACKGROUND IGUAL AO DA HOME --- */}
        <div className="fixed inset-0 z-0 pointer-events-none">
            {/* Gradiente */}
            <div className="absolute inset-0 bg-gradient-to-b from-green-900/20 via-slate-950 to-slate-950" />
            
            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIiBzdHJva2Utd2lkdGg9IjIiLz48L2c+PC9zdmc+')] opacity-40" />
            
            {/* Bolinhas (Quantidade reduzida para não poluir o form) */}
            {ballNumbers.map((num, i) => (
                <FloatingBall 
                  key={i} 
                  number={num} 
                  delay={i * 2} 
                  duration={15 + i * 2} 
                  left={`${10 + (i * 20)}%`} 
                  size={i % 2 === 0 ? "w-16 h-16" : "w-24 h-24"} 
                />
            ))}
        </div>
        
        {/* Wrapper do Conteúdo */}
        <div className="relative z-10 w-full flex justify-center">
            <Suspense fallback={<div className="text-white">Carregando...</div>}>
                <LoginForm />
            </Suspense>
        </div>
    </div>
  );
}