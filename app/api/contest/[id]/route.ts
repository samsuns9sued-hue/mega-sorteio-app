// app/api/contest/[id]/route.ts
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

// Helper para verificar Admin
async function isAdmin() {
  const session = await getServerSession();
  if (!session?.user?.name) return false;
  const user = await prisma.user.findUnique({ where: { username: session.user.name } });
  return user?.role === "ADMIN";
}

// GET: Retorna DETALHES COMPLETOS do concurso (Estatísticas e Ganhadores)
export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  if (!await isAdmin()) return NextResponse.json({ message: "Proibido" }, { status: 403 });

  try {
    const params = await props.params;
    const contestId = params.id;

    // 1. Busca dados básicos e contagem total
    const contest = await prisma.contest.findUnique({ where: { id: contestId } });
    const totalBets = await prisma.bet.count({ where: { contestId: contestId } });

    // 2. Busca Ganhadores por categoria
    // Sena (6 acertos), Quina (5), Quadra (4)
    const senaWinners = await prisma.bet.findMany({
      where: { contestId: contestId, hits: 6 },
      include: { user: { select: { username: true } } }
    });

    const quinaWinners = await prisma.bet.findMany({
      where: { contestId: contestId, hits: 5 },
      include: { user: { select: { username: true } } }
    });

    const quadraWinners = await prisma.bet.findMany({
      where: { contestId: contestId, hits: 4 },
      include: { user: { select: { username: true } } }
    });

    return NextResponse.json({
      contest,
      stats: {
        totalBets,
        sena: senaWinners.map(b => b.user.username), // Retorna lista de nomes
        quina: quinaWinners.map(b => b.user.username),
        quadra: quadraWinners.map(b => b.user.username),
      }
    });

  } catch (error) {
    return NextResponse.json({ message: "Erro ao buscar detalhes" }, { status: 500 });
  }
}

// DELETE: Apaga o concurso (Mantido igual ao anterior)
export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  if (!await isAdmin()) return NextResponse.json({ message: "Proibido" }, { status: 403 });

  try {
    const params = await props.params;
    await prisma.$transaction([
      prisma.bet.deleteMany({ where: { contestId: params.id } }),
      prisma.contest.delete({ where: { id: params.id } })
    ]);
    return NextResponse.json({ message: "Excluído com sucesso" });
  } catch (error) {
    return NextResponse.json({ message: "Erro ao excluir" }, { status: 500 });
  }
}