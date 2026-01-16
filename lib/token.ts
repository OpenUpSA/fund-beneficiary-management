import { randomBytes } from 'crypto'
import prisma from '@/db'
import { PasswordResetType } from '@prisma/client'

const RESET_TOKEN_EXPIRY_HOURS = 1
const SET_PASSWORD_TOKEN_EXPIRY_HOURS = 24

export function generateToken(): string {
  return randomBytes(32).toString('hex')
}

export async function createPasswordResetToken(
  userId: number,
  type: PasswordResetType = 'RESET'
): Promise<string> {
  const token = generateToken()
  const expiryHours = type === 'SET_PASSWORD' ? SET_PASSWORD_TOKEN_EXPIRY_HOURS : RESET_TOKEN_EXPIRY_HOURS
  const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000)

  // Delete any existing unused tokens for this user of the same type
  await prisma.passwordResetToken.deleteMany({
    where: {
      userId,
      type,
      usedAt: null,
    },
  })

  // Create new token
  await prisma.passwordResetToken.create({
    data: {
      token,
      userId,
      type,
      expiresAt,
    },
  })

  return token
}

export async function validatePasswordResetToken(token: string) {
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!resetToken) {
    return { valid: false, error: 'Invalid token' }
  }

  if (resetToken.usedAt) {
    return { valid: false, error: 'Token has already been used' }
  }

  if (new Date() > resetToken.expiresAt) {
    return { valid: false, error: 'Token has expired' }
  }

  return { valid: true, resetToken }
}

export async function markTokenAsUsed(token: string) {
  await prisma.passwordResetToken.update({
    where: { token },
    data: { usedAt: new Date() },
  })
}
