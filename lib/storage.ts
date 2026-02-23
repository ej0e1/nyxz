import { prisma } from "@/lib/prisma"

/**
 * Calculate total storage usage (bytes) for a user.
 */
export async function getStorageUsageBytes(userId: string): Promise<bigint> {
  const result = await prisma.file.aggregate({
    where: { userId },
    _sum: { size: true },
  })
  return result._sum.size ?? BigInt(0)
}
