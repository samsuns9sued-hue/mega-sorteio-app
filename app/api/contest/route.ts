// app/api/contest/route.ts
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const contests = await prisma.contest.findMany({ orderBy: { number: 'desc' } });
  return NextResponse.json(contests);
}

export async function POST(req: Request) {
  const session = await getServerSession();
  const user = await prisma.user.findUnique({ where: { username: session?.user?.name || "" } });

  if (user?.role !== "ADMIN") return NextResponse.json({ message: "Acesso Negado" }, { status: 403 });

  try {
    const data = await req.json();

    const existing = await prisma.contest.findUnique({ where: { number: Number(data.number) } });
    if (existing) return NextResponse.json({ message: "Concurso já existe." }, { status: 409 });

    const newContest = await prisma.contest.create({
      data: {
        number: Number(data.number),
        prizeValue: data.prizeValue,
        drawDate: new Date(data.drawDate),
        // Adicionamos o maxNumbers aqui (se não vier, usa 30)
        maxNumbers: Number(data.maxNumbers) || 30, 
        status: "OPEN",
      }
    });

    return NextResponse.json(newContest, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Erro ao criar" }, { status: 500 });
  }
}