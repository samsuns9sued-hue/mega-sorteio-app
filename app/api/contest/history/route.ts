// app/api/contest/history/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // 1. Busca todos os concursos FINALIZADOS, do mais recente para o mais antigo
    const contests = await prisma.contest.findMany({
      where: { status: "FINISHED" },
      orderBy: { number: "desc" },
    });

    // 2. Para cada concurso, conta os vencedores (estatística anônima)
    const contestsWithStats = await Promise.all(
      contests.map(async (contest) => {
        
        // Agrupa as apostas por número de acertos (hits)
        const groups = await prisma.bet.groupBy({
          by: ['hits'],
          where: { 
            contestId: contest.id,
            hits: { in: [4, 5, 6] } // Só interessa quem acertou 4, 5 ou 6
          },
          _count: {
            _all: true
          }
        });

        // Formata o resultado para ficar fácil no frontend
        // Ex: { sena: 0, quina: 2, quadra: 15 }
        const stats = {
          sena: groups.find(g => g.hits === 6)?._count._all || 0,
          quina: groups.find(g => g.hits === 5)?._count._all || 0,
          quadra: groups.find(g => g.hits === 4)?._count._all || 0,
        };

        return { ...contest, winnersCount: stats };
      })
    );

    return NextResponse.json(contestsWithStats);

  } catch (error) {
    return NextResponse.json({ message: "Erro ao buscar histórico" }, { status: 500 });
  }
}