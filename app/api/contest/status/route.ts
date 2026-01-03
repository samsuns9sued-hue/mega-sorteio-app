// app/api/contest/status/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ message: "ID necessário" }, { status: 400 });

  const contest = await prisma.contest.findUnique({
    where: { id },
    select: { status: true, drawnNumbers: true } // Seleciona só o necessário para ser rápido
  });

  if (!contest) return NextResponse.json({ message: "Não encontrado" }, { status: 404 });

  return NextResponse.json(contest);
}