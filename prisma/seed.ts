import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const email = process.env.SEED_USER_EMAIL ?? "demo@example.com"
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log("Seed user already exists:", email)
    return
  }
  await prisma.user.create({
    data: { email, name: "Demo User" },
  })
  console.log("Created seed user:", email)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
