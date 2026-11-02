import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();
async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password && password.length >= 12) await prisma.admin.upsert({ where: { email }, update: {}, create: { email, passwordHash: await bcrypt.hash(password, 12) } });
  else console.warn("Admin not seeded: set ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters) in .env.local first.");
  const categories = ["Sparklers", "Flower Pots", "Rockets", "Gift Boxes"];
  for (const name of categories) await prisma.category.upsert({ where: { slug: name.toLowerCase().replaceAll(" ", "-") }, update: {}, create: { name, slug: name.toLowerCase().replaceAll(" ", "-") } });
}
main().finally(() => prisma.$disconnect());
