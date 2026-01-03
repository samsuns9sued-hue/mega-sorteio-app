// app/api/contest/draw/route.ts
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth"; // Importação necessária para segurança
import { NextResponse } from "next/server";

export async function POST() {
  
  // --- INÍCIO DA BLINDAGEM DE SEGURANÇA ---
  // 1. Pega a sessão do usuário atual
  const session = await getServerSession();
  
  // 2. Se não estiver logado, bloqueia
  if (!session || !session.user?.name) {
    return NextResponse.json({ message: "Não autorizado. Faça login." }, { status: 401 });
  }

  // 3. Busca o usuário no banco para conferir se é ADMIN de verdade
  const userAdmin = await prisma.user.findUnique({
    where: { username: session.user.name }
  });

  // 4. Se não for ADMIN, bloqueia com erro 403 (Proibido)
  if (!userAdmin || userAdmin.role !== "ADMIN") {
    console.warn(`Tentativa não autorizada de sorteio pelo usuário: ${session.user.name}`);
    return NextResponse.json({ message: "Apenas administradores podem realizar sorteios." }, { status: 403 });
  }
  // --- FIM DA BLINDAGEM ---


  // --- DAQUI PARA BAIXO É A SUA LÓGICA ORIGINAL (MANTIDA INTACTA) ---
  try {
    // 1. Busca o concurso aberto
    const contest = await prisma.contest.findFirst({
      where: { status: "OPEN" },
    });

    if (!contest) {
      return NextResponse.json({ message: "Não há concurso aberto." }, { status: 400 });
    }

    // 2. Gera 6 números aleatórios únicos (1 a 60)
    const drawnNumbers = new Set<number>();
    while (drawnNumbers.size < 6) {
      drawnNumbers.add(Math.floor(Math.random() * 60) + 1);
    }
    // Converte para array
    const finalNumbers = Array.from(drawnNumbers); 
    
    // 3. Atualiza o Concurso para "Finalizado"
    await prisma.contest.update({
      where: { id: contest.id },
      data: {
        status: "FINISHED",
        drawnNumbers: finalNumbers, 
      },
    });

    // 4. CONFERÊNCIA AUTOMÁTICA
    // Busca todas as apostas desse concurso
    const bets = await prisma.bet.findMany({
      where: { contestId: contest.id },
    });

    // Para cada aposta, calcula os acertos
    const updates = bets.map((bet) => {
      const hits = bet.selectedNumbers.filter((num) => 
        finalNumbers.includes(num)
      ).length;

      return prisma.bet.update({
        where: { id: bet.id },
        data: { hits: hits },
      });
    });

    // Executa todas as atualizações
    await prisma.$transaction(updates);

    // 5. Retorna os números
    return NextResponse.json({ drawnNumbers: finalNumbers });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Erro no sorteio." }, { status: 500 });
  }
}