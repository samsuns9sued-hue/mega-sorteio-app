// prisma/admin.ts
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // ATENÇÃO: Coloque aqui o nome de usuário que você criou no cadastro
  const username = "admin" 

  await prisma.user.update({
    where: { username: username },
    data: { role: 'ADMIN' }
  })
  console.log(`✅ Usuário ${username} agora é ADMINISTRADOR!`)
}

main()
  .then(async () => await prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect() })