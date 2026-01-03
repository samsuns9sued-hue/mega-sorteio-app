// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // Verifica se já existe concurso 1
  const existing = await prisma.contest.findUnique({
    where: { number: 1 }
  })

  if (!existing) {
    await prisma.contest.create({
      data: {
        number: 1,
        prizeValue: 1500000.00, // 1.5 Milhões
        drawDate: new Date(new Date().setDate(new Date().getDate() + 7)), // Daqui 7 dias
        status: 'OPEN',
      }
    })
    console.log('✅ Concurso 01 criado com sucesso!')
  } else {
    console.log('ℹ️ Concurso 01 já existe.')
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })