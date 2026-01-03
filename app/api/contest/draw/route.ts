// app/api/contest/draw/route.ts
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { randomInt } from "crypto"; // <--- A Mágica da Segurança

export async function POST() {
  
  // --- BLINDAGEM DE ACESSO (PERMANECE IGUAL) ---
  const session = await getServerSession();
  
  if (!session || !session.user?.name) {
    return NextResponse.json({ message: "Não autorizado. Faça login." }, { status: 401 });
  }

  const userAdmin = await prisma.user.findUnique({
    where: { username: session.user.name }
  });

  if (!userAdmin || userAdmin.role !== "ADMIN") {
    console.warn(`Tentativa de fraude no sorteio IP/User: ${session.user.name}`);
    return NextResponse.json({ message: "Apenas administradores podem realizar sorteios." }, { status: 403 });
  }

  try {
    // 1. Busca o concurso aberto
    const contest = await prisma.contest.findFirst({
      where: { status: "OPEN" },
    });

    if (!contest) {
      return NextResponse.json({ message: "Não há concurso aberto para sortear." }, { status: 400 });
    }

    // --- BLINDAGEM DE ALEATORIEDADE (CSPRNG) ---
    // Usamos um Set para garantir que não haja números repetidos
    const drawnNumbers = new Set<number>();

    // Loop de segurança: Continua gerando até ter 6 números únicos
    // randomInt(min, max) é exclusivo no máximo, então usamos 1, 61 para gerar de 1 a 60.
    while (drawnNumbers.size < 6) {
      const secureNumber = randomInt(1, 61); // Gera de 1 a 60 com entropia de hardware
      drawnNumbers.add(secureNumber);
    }
    
    // Converte para array
    const finalNumbers = Array.from(drawnNumbers); 
    
    // Log de Auditoria no Servidor (Para você ver nos logs da Vercel quem sorteou e o que saiu)
    console.log(`[AUDITORIA] Sorteio realizado por ${session.user.name}. Números: ${finalNumbers.join(', ')}`);

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
      // Lógica de intersecção segura
      const hits = bet.selectedNumbers.filter((num) => 
        finalNumbers.includes(num)
      ).length;

      return prisma.bet.update({
        where: { id: bet.id },
        data: { hits: hits },
      });
    });

    // Executa todas as atualizações no banco
    await prisma.$transaction(updates);

    // 5. Retorna os números
    return NextResponse.json({ drawnNumbers: finalNumbers });

  } catch (error) {
    console.error("Erro crítico no sorteio:", error);
    return NextResponse.json({ message: "Erro interno no servidor de sorteio." }, { status: 500 });
  }
}