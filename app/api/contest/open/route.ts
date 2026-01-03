// app/api/contest/open/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  // Busca o primeiro concurso que estiver com status OPEN
  const contest = await prisma.contest.findFirst({
    where: { status: "OPEN" },
  });

  if (!contest) {
    return NextResponse.json({ message: "Sem concursos abertos" }, { status: 404 });
  }

  return NextResponse.json(contest);
}