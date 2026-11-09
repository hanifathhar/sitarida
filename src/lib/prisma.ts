import { PrismaClient } from "@prisma/client";

const PRISMA_SCHEMA_VERSION = "spd-v2";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaSchemaVersion?: string;
};

export const prisma =
  globalForPrisma.prisma &&
  globalForPrisma.prismaSchemaVersion === PRISMA_SCHEMA_VERSION
    ? globalForPrisma.prisma
    : new PrismaClient({
        log:
          process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
      });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaSchemaVersion = PRISMA_SCHEMA_VERSION;
}
