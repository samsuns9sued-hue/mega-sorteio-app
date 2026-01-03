// app/api/contest/draw/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST() {
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
    // Nota: Mantemos a ordem de sorteio para a animação (não ordenamos ainda)

    // 3. Atualiza o Concurso para "Finalizado"
    await prisma.contest.update({
      where: { id: contest.id },
      data: {
        status: "FINISHED",
        drawnNumbers: finalNumbers, // Salva os números
      },
    });

    // 4. CONFERÊNCIA AUTOMÁTICA (O Pulo do Gato)
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

    // 5. Retorna os números para o Frontend fazer a animação
    return NextResponse.json({ drawnNumbers: finalNumbers });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Erro no sorteio." }, { status: 500 });
  }
}