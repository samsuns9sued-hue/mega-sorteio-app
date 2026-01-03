// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers"; // Importamos o arquivo novo

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mega Sorteio",
  description: "Sistema de apostas online",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning={true}>
      <body className={inter.className} suppressHydrationWarning={true}>
        {/* Envolvemos tudo com o Providers */}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}