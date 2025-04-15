import { PrismaClient } from '@prisma/client'

// Define a function that creates the PrismaClient instance
const prismaClientSingleton = () => {
  return new PrismaClient()
}

// Extend globalThis to include a global prisma instance
declare global {
  var prisma: PrismaClient | undefined
}

// If the prisma instance is not already set on globalThis, instantiate it
const prisma = globalThis.prisma ?? prismaClientSingleton()

// Export the prisma client
export default prisma

// Set prisma on globalThis to ensure it's reused across hot reloads in development
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma
}
