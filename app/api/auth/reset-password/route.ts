import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/db'
import { validatePasswordResetToken, markTokenAsUsed } from '@/lib/token'
import { createHash } from '@/lib/hash'

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json()

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Validate token
    const validation = await validatePasswordResetToken(token)

    if (!validation.valid || !validation.resetToken) {
      return NextResponse.json(
        { error: validation.error || 'Invalid or expired token' },
        { status: 400 }
      )
    }

    const { resetToken } = validation

    // Hash the new password
    const passwordHash = await createHash(password)

    // Update user's password
    await prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    })

    // Mark token as used
    await markTokenAsUsed(token)

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully.',
    })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}

// GET endpoint to validate token without resetting password
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Token is required' },
        { status: 400 }
      )
    }

    const validation = await validatePasswordResetToken(token)

    if (!validation.valid) {
      return NextResponse.json({
        valid: false,
        error: validation.error,
      })
    }

    return NextResponse.json({
      valid: true,
      type: validation.resetToken?.type,
      userName: validation.resetToken?.user.name,
    })
  } catch (error) {
    console.error('Token validation error:', error)
    return NextResponse.json(
      { valid: false, error: 'An error occurred' },
      { status: 500 }
    )
  }
}
