// app/api/bet/route.ts
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod"; // Importa o validador

// 1. Define o esquema rigoroso do que é aceitável
const BetSchema = z.object({
  contestId: z.string(),
  games: z.array(
    z.array(z.number().int().min(1).max(60)) // Apenas números inteiros de 1 a 60
  ).min(1, "O carrinho está vazio"),
});

export async function POST(req: Request) {
  // 2. Verifica Autenticação
  const session = await getServerSession();
  const user = await prisma.user.findUnique({
    where: { username: session?.user?.name || "" }
  });

  if (!user) {
    return NextResponse.json({ message: "Acesso não autorizado." }, { status: 401 });
  }

  try {
    const body = await req.json();

    // 3. Validação de Formato (Zod)
    // Se o hacker mandar texto onde devia ser número, o Zod barra aqui.
    const validation = BetSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({ message: "Dados inválidos ou corrompidos." }, { status: 400 });
    }

    const { games, contestId } = validation.data;

    // 4. Validação de Negócio (Banco de Dados)
    const contest = await prisma.contest.findUnique({ where: { id: contestId } });

    if (!contest) {
      return NextResponse.json({ message: "Concurso não encontrado." }, { status: 404 });
    }

    // 5. BLINDAGEM: Verifica se o concurso está ABERTO e se a data não expirou
    if (contest.status !== "OPEN" || new Date() > new Date(contest.drawDate)) {
      return NextResponse.json({ message: "Este concurso já está fechado para apostas." }, { status: 403 });
    }

    // 6. BLINDAGEM: Varredura jogo a jogo
    for (const numbers of games) {
        // Verifica a quantidade permitida nesse concurso específico
        if (numbers.length > contest.maxNumbers) {
            return NextResponse.json({ message: `Tentativa de fraude: Jogo com mais de ${contest.maxNumbers} números.` }, { status: 400 });
        }
        
        if (numbers.length < 6) {
            return NextResponse.json({ message: "Jogo inválido: Mínimo de 6 números." }, { status: 400 });
        }

        // Verifica números duplicados (Ex: [10, 10, 15...])
        const uniqueNumbers = new Set(numbers);
        if (uniqueNumbers.size !== numbers.length) {
            return NextResponse.json({ message: "Jogo inválido: Números repetidos não são permitidos." }, { status: 400 });
        }
    }

    // 7. Se passou por tudo, Salva no Banco
    const dataToSave = games.map((numbers) => ({
        userId: user.id,
        contestId: contestId,
        selectedNumbers: numbers
    }));

    await prisma.bet.createMany({
      data: dataToSave
    });

    return NextResponse.json({ message: "Apostas registradas com segurança!" }, { status: 201 });

  } catch (error) {
    console.error("Erro crítico:", error);
    return NextResponse.json({ message: "Erro interno do servidor." }, { status: 500 });
  }
}