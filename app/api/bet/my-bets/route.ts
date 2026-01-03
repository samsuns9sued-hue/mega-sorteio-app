// app/api/bet/my-bets/route.ts
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession();
  
  if (!session?.user?.name) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  try {
    // Busca usuário
    const user = await prisma.user.findUnique({
      where: { username: session.user.name }
    });

    if (!user) return NextResponse.json([], { status: 200 });

    // Busca apostas com detalhes do concurso
    const bets = await prisma.bet.findMany({
      where: { userId: user.id },
      include: {
        contest: true // Traz os dados do concurso junto
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(bets);

  } catch (error) {
    return NextResponse.json({ message: "Erro" }, { status: 500 });
  }
}