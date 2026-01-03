// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Adiciona cabeçalhos de segurança
  const headers = response.headers;

  // Impede que seu site seja aberto dentro de um iframe em outro site (Clickjacking)
  headers.set("X-Frame-Options", "DENY");
  
  // Proteção contra injeção de conteúdo (MIME Sniffing)
  headers.set("X-Content-Type-Options", "nosniff");
  
  // Proteção básica de XSS
  headers.set("X-XSS-Protection", "1; mode=block");
  
  // Controla o quanto de informação é passada ao clicar em links externos
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}

// Configura para rodar em todas as rotas
export const config = {
  matcher: "/:path*",
};