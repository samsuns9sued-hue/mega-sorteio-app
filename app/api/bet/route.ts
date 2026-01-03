// app/api/bet/route.ts
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession();
  
  const user = await prisma.user.findUnique({
    where: { username: session?.user?.name || "" }
  });

  if (!user) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  try {
    // Agora esperamos "games" (array de arrays) em vez de "numbers"
    const { games, contestId } = await req.json();

    // 1. Busca o concurso
    const contest = await prisma.contest.findUnique({ where: { id: contestId } });
    if (!contest) return NextResponse.json({ message: "Concurso inválido" }, { status: 404 });

    // 2. Validações do Lote
    if (!games || !Array.isArray(games) || games.length === 0) {
      return NextResponse.json({ message: "Nenhum jogo enviado." }, { status: 400 });
    }

    // Verifica cada jogo do carrinho
    for (const numbers of games) {
        if (numbers.length < 6) return NextResponse.json({ message: "Existem jogos com menos de 6 números." }, { status: 400 });
        if (numbers.length > contest.maxNumbers) return NextResponse.json({ message: `Existem jogos ultrapassando ${contest.maxNumbers} dezenas.` }, { status: 400 });
    }

    // 3. Salva todos de uma vez (Bulk Insert)
    const dataToSave = games.map((numbers: number[]) => ({
        userId: user.id,
        contestId: contestId,
        selectedNumbers: numbers
    }));

    await prisma.bet.createMany({
      data: dataToSave
    });

    return NextResponse.json({ message: "Apostas realizadas com sucesso!" }, { status: 201 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Erro ao processar apostas." }, { status: 500 });
  }
}