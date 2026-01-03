// app/api/auth/register/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { hash } from "bcryptjs";

export async function POST(req: Request) {
  try {
    // 1. Recebe os dados do formulário
    const { username, password } = await req.json();

    // 2. Validações básicas
    if (!username || !password) {
      return NextResponse.json(
        { message: "Usuário e senha são obrigatórios." },
        { status: 400 }
      );
    }

    // 3. Verifica se o usuário já existe
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Este nome de usuário já está em uso." },
        { status: 409 }
      );
    }

    // 4. Criptografa a senha (segurança)
    const hashedPassword = await hash(password, 10);

    // 5. Cria o usuário no banco
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role: "USER", // Padrão é usuário comum
      },
    });

    // 6. Retorna sucesso (sem mandar a senha de volta)
    return NextResponse.json(
      { user: { id: user.id, username: user.username } },
      { status: 201 }
    );

  } catch (error) {
    console.error("Erro no registro:", error);
    return NextResponse.json(
      { message: "Erro interno ao criar conta." },
      { status: 500 }
    );
  }
}