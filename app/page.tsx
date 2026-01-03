// app/page.tsx
"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence, useScroll, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useState, useEffect, useRef } from "react";

// --- COMPONENTES VISUAIS ---

// Bolinha Flutuante (Otimizada)
const FloatingBall = ({ number, delay, duration, left, size }: any) => {
  const colors = [
    "from-yellow-400 to-yellow-600", "from-green-400 to-green-600", 
    "from-blue-400 to-blue-600", "from-pink-400 to-pink-600",
    "from-purple-400 to-purple-600", "from-orange-400 to-orange-600",
  ];
  return (
    <motion.div
      className={`absolute ${size} rounded-full bg-gradient-to-br ${colors[number % colors.length]} flex items-center justify-center font-bold text-white shadow-2xl border-4 border-white/30`}
      style={{ left }}
      initial={{ y: "110vh", opacity: 0, rotate: 0 }}
      animate={{ y: [100, -50, 100], opacity: [0, 1, 1, 0], rotate: [0, 180, 360] }}
      transition={{ duration: duration, delay: delay, repeat: Infinity, ease: "easeInOut" }}
    >
      <span className="drop-shadow-lg text-lg sm:text-xl">{String(number).padStart(2, '0')}</span>
    </motion.div>
  );
};

// Card de Recurso
const FeatureCard = ({ icon, title, description, delay }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ duration: 0.5, delay }}
    whileHover={{ scale: 1.02, y: -5 }}
    className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 hover:bg-white/10 hover:border-green-500/30 transition-all duration-300 cursor-default group"
  >
    <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-green-500/20">{icon}</div>
    <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">{title}</h3>
    <p className="text-slate-400 text-lg leading-relaxed">{description}</p>
  </motion.div>
);

// Card de Passo a Passo
const StepCard = ({ number, title, description, delay }: any) => (
  <motion.div
    initial={{ opacity: 0, x: -30 }}
    whileInView={{ opacity: 1, x: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    className="flex gap-6 items-start"
  >
    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-2xl sm:text-3xl font-black text-slate-900 shadow-xl shadow-yellow-500/30 flex-shrink-0 relative z-10">
      {number}
    </div>
    <div>
      <h4 className="text-xl sm:text-2xl font-bold text-white mb-2">{title}</h4>
      <p className="text-slate-400 text-lg">{description}</p>
    </div>
  </motion.div>
);

// Contador Animado
const AnimatedCounter = ({ end, suffix = "", duration = 2 }: any) => {
  const [count, setCount] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  useEffect(() => {
    if (!hasStarted) return;
    let startTime: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / (duration * 1000), 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [hasStarted, end, duration]);

  return (
    <motion.span onViewportEnter={() => setHasStarted(true)} className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">
      {count.toLocaleString()}{suffix}
    </motion.span>
  );
};

export default function Home() {
  const { data: session, status } = useSession();
  
  // OTIMIZAÇÃO DE PERFORMANCE DO MOUSE (Usa MotionValue em vez de State)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  // Suaviza o movimento
  const smoothX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const smoothY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  // Lógica de Scroll (Para esconder a setinha e mostrar botão de topo)
  const { scrollY } = useScroll();
  const [showScrollDown, setShowScrollDown] = useState(true);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    return scrollY.onChange((latest) => {
      setShowScrollDown(latest < 100); // Esconde a setinha se descer 100px
      setShowBackToTop(latest > 500); // Mostra voltar ao topo se descer 500px
    });
  }, [scrollY]);

  const ballNumbers = [7, 13, 22, 35, 42, 58, 61, 4, 19, 33];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col relative overflow-hidden font-sans scroll-smooth">
      
      {/* ========== FUNDO INTERATIVO ========== */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-green-900/20 via-slate-950 to-slate-950" />
        {/* Flashlight Effect Otimizado */}
        <motion.div 
          className="absolute w-[800px] h-[800px] rounded-full opacity-20 blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(34,197,94,0.4) 0%, transparent 70%)',
            left: smoothX,
            top: smoothY,
            x: "-50%", // Centraliza no cursor
            y: "-50%"
          }}
        />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIiBzdHJva2Utd2lkdGg9IjIiLz48L2c+PC9zdmc+')] opacity-40" />
        <div className="hidden lg:block">
          {ballNumbers.map((num, i) => (
            <FloatingBall key={i} number={num} delay={i * 2} duration={15 + (i % 3) * 5} left={`${5 + (i * 10)}%`} size={i % 2 === 0 ? "w-12 h-12" : "w-16 h-16"} />
          ))}
        </div>
      </div>

      {/* ========== NAVBAR ========== */}
      <motion.nav 
        initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6 }}
        className="relative z-20 w-full max-w-7xl mx-auto p-6 flex justify-between items-center"
      >
        <Link href="/" className="flex items-center gap-3 group">
          <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }} className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center font-black text-slate-900 text-xl shadow-lg shadow-yellow-500/30 group-hover:shadow-yellow-500/50 transition-shadow">M</motion.div>
          <div className="flex flex-col"><span className="font-black text-xl sm:text-2xl tracking-tight text-white">Mega Sorteio</span><span className="text-xs text-green-400 font-medium tracking-wider">SUA SORTE COMEÇA AQUI</span></div>
        </Link>
        <div className="flex items-center gap-4">
          {status === "authenticated" ? (
            <motion.div whileHover={{ scale: 1.05 }}>
              <Link href="/dashboard" className="flex items-center gap-2 bg-green-600/20 border border-green-500/30 text-green-400 font-bold py-3 px-6 rounded-full hover:bg-green-600/30 transition-all text-sm sm:text-base"><span>🎯</span><span className="hidden sm:inline">Meu Painel</span><span className="sm:hidden">Painel</span><span>→</span></Link>
            </motion.div>
          ) : (
            <motion.div whileHover={{ scale: 1.05 }}><Link href="/login" className="text-slate-400 hover:text-white font-medium py-2 px-4 transition-colors text-sm sm:text-base">Entrar</Link></motion.div>
          )}
        </div>
      </motion.nav>

      {/* ========== HERO SECTION ========== */}
      <main className="relative z-10 flex-1 flex flex-col">
        <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 min-h-[90vh] relative">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="max-w-4xl space-y-8 relative z-20">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} transition={{ duration: 0.5, delay: 0.2 }}>
              <span className="inline-flex items-center gap-2 py-2 px-5 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 text-yellow-400 text-sm font-bold uppercase tracking-wider shadow-lg shadow-yellow-500/10">
                <motion.span animate={{ rotate: [0, 20, -20, 0] }} transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}>🍀</motion.span>
                <span>A plataforma mais fácil do Brasil</span>
                <motion.span animate={{ rotate: [0, -20, 20, 0] }} transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}>🍀</motion.span>
              </span>
            </motion.div>
            
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }} className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-tight">
              Jogar na loteria <br className="hidden sm:block" />
              <span className="relative">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-400 to-green-500">nunca foi tão fácil!</span>
                <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 1, delay: 1 }} className="absolute -bottom-2 left-0 h-1 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full" />
              </span>
            </motion.h1>
            
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.5 }} className="text-xl sm:text-2xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Escolha seus números com <span className="text-green-400 font-semibold">poucos cliques</span>, acompanhe os resultados e <span className="text-yellow-400 font-semibold">realize seus sonhos!</span>
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.7 }} className="pt-6">
              {status === "loading" ? (
                <div className="text-slate-400 text-xl">Carregando...</div>
              ) : status === "authenticated" ? (
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Link href="/dashboard" className="inline-flex items-center gap-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xl sm:text-2xl font-bold py-5 px-12 rounded-2xl shadow-2xl shadow-green-500/30 hover:shadow-green-500/50 transition-all duration-300 group">
                    <span className="text-2xl">🎯</span><span>ACESSAR MEU PAINEL</span><motion.span animate={{ x: [0, 5, 0] }} transition={{ duration: 1, repeat: Infinity }} className="text-2xl">→</motion.span>
                  </Link>
                </motion.div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Link href="/login?mode=register" className="inline-flex items-center gap-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-slate-900 text-xl sm:text-2xl font-bold py-5 px-10 rounded-2xl shadow-2xl shadow-yellow-500/30 hover:shadow-yellow-500/50 transition-all duration-300">
                      <span className="text-2xl">✨</span><span>CRIAR CONTA GRÁTIS</span>
                    </Link>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Link href="/login" className="inline-flex items-center gap-3 bg-white/5 backdrop-blur-sm border-2 border-white/20 text-white text-xl sm:text-2xl font-bold py-5 px-10 rounded-2xl hover:bg-white/10 hover:border-white/40 transition-all duration-300">
                      <span className="text-2xl">👤</span><span>JÁ TENHO CONTA</span>
                    </Link>
                  </motion.div>
                </div>
              )}
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 1 }} className="flex flex-wrap justify-center gap-6 sm:gap-10 pt-8 text-slate-400">
              {[{ icon: "🔒", text: "100% Seguro" }, { icon: "⚡", text: "Rápido e Fácil" }, { icon: "💰", text: "Prêmios Reais" }].map((item, i) => (
                <motion.div key={i} whileHover={{ y: -3 }} className="flex items-center gap-2 text-lg"><span className="text-2xl">{item.icon}</span><span>{item.text}</span></motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* INDICADOR DE SCROLL OTIMIZADO (Só aparece se showScrollDown for true) */}
          <AnimatePresence>
            {showScrollDown && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20"
              >
                <motion.div
                  animate={{ y: [0, 10, 0] }} transition={{ duration: 1.5, repeat: Infinity }}
                  className="flex flex-col items-center text-slate-500 cursor-pointer hover:text-slate-300 transition-colors"
                  onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
                >
                  <span className="text-sm mb-2">Veja como funciona</span><span className="text-2xl">↓</span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* ========== COMO FUNCIONA ========== */}
        <section className="relative z-10 py-24 px-4 bg-gradient-to-b from-transparent to-slate-900/50">
          <div className="max-w-6xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
              <span className="inline-block py-2 px-5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-bold uppercase tracking-wider mb-6">Simples assim</span>
              <h2 className="text-4xl sm:text-5xl font-black text-white mb-6">Como funciona?</h2>
              <p className="text-xl text-slate-400 max-w-2xl mx-auto">Apenas <span className="text-green-400 font-semibold">3 passos simples</span> para começar a jogar</p>
            </motion.div>
            <div className="grid gap-8 max-w-2xl mx-auto">
              <StepCard number={1} title="Crie sua conta grátis" description="É rápido! Só precisa de um e-mail. Nada de formulários complicados." delay={0.1} />
              <StepCard number={2} title="Escolha seus números" description="Toque nos números da sorte ou deixe o sistema escolher para você!" delay={0.2} />
              <StepCard number={3} title="Acompanhe e ganhe!" description="Veja os resultados no seu painel. Se ganhar, é só retirar o prêmio!" delay={0.3} />
            </div>
          </div>
        </section>

        {/* ========== BENEFÍCIOS ========== */}
        <section className="relative z-10 py-24 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <FeatureCard icon="👆" title="Botões grandes" description="Tudo foi feito com botões e letras grandes para você ver e clicar sem dificuldade." delay={0.1} />
              <FeatureCard icon="🎯" title="Simples de usar" description="Sem complicação! Você não precisa entender de tecnologia para usar." delay={0.2} />
              <FeatureCard icon="💬" title="Suporte por WhatsApp" description="Tem dúvida? Nosso time está no WhatsApp pronto para ajudar você!" delay={0.3} />
              <FeatureCard icon="🔔" title="Avisos no celular" description="Receba notificações quando sair o resultado. Você nunca perde nada!" delay={0.4} />
              <FeatureCard icon="💰" title="Saque fácil" description="Ganhou? O dinheiro cai direto no seu PIX de forma rápida e segura." delay={0.5} />
              <FeatureCard icon="🛡️" title="100% seguro" description="Seus dados estão protegidos. Usamos a mesma segurança dos bancos." delay={0.6} />
            </div>
          </div>
        </section>

        {/* ========== ESTATÍSTICAS ========== */}
        <section className="relative z-10 py-24 px-4 bg-gradient-to-r from-green-900/20 to-emerald-900/20">
          <div className="max-w-6xl mx-auto">
            <div className="grid sm:grid-cols-3 gap-8 text-center">
              {[
                { value: 50000, suffix: "+", label: "Jogadores felizes" },
                { value: 2, suffix: "M+", label: "Em prêmios pagos" },
                { value: 99, suffix: "%", label: "Aprovação" },
              ].map((stat, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="p-8">
                  <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                  <p className="text-xl text-slate-400 mt-2">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ========== CTA FINAL ========== */}
        <section className="relative z-10 py-24 px-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="max-w-4xl mx-auto text-center bg-gradient-to-br from-green-900/40 to-emerald-900/40 border border-green-500/20 rounded-3xl p-12 backdrop-blur-sm">
            <motion.span animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }} className="text-6xl inline-block mb-6">🍀</motion.span>
            <h2 className="text-3xl sm:text-5xl font-black text-white mb-6">Pronto para tentar a sorte?</h2>
            <p className="text-xl text-slate-300 mb-10 max-w-xl mx-auto">Milhares de pessoas já estão jogando. Sua vez de realizar sonhos pode ser agora!</p>
            {status !== "authenticated" && (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link href="/login?mode=register" className="inline-flex items-center gap-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-slate-900 text-xl sm:text-2xl font-bold py-5 px-12 rounded-2xl shadow-2xl shadow-yellow-500/30 hover:shadow-yellow-500/50 transition-all duration-300"><span className="text-2xl">🚀</span><span>COMEÇAR AGORA</span></Link>
              </motion.div>
            )}
          </motion.div>
        </section>

        {/* ========== FOOTER ========== */}
        <footer className="relative z-10 border-t border-slate-800 py-12 px-4 bg-slate-950">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center font-black text-slate-900">M</div>
              <span className="font-bold text-lg text-white">Mega Sorteio</span>
            </div>
            <div className="flex gap-8 text-slate-400">
              <Link href="#" className="hover:text-white transition-colors">Termos</Link>
              <Link href="#" className="hover:text-white transition-colors">Privacidade</Link>
              <Link href="#" className="hover:text-white transition-colors">Suporte</Link>
            </div>
            <p className="text-slate-500 text-sm">© 2024 Mega Sorteio. Todos os direitos reservados.</p>
          </div>
        </footer>

        {/* BOTÃO VOLTAR AO TOPO (Só aparece se showBackToTop for true) */}
        <AnimatePresence>
          {showBackToTop && (
            <motion.button
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="fixed bottom-8 right-8 z-50 w-12 h-12 bg-green-600 hover:bg-green-500 text-white rounded-full shadow-lg flex items-center justify-center text-2xl transition-colors"
            >
              ↑
            </motion.button>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}