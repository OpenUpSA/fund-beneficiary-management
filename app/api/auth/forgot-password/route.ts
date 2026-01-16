import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/db'
import { createPasswordResetToken } from '@/lib/token'
import { sendPasswordResetEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    })

    // Always return success to prevent email enumeration attacks
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      })
    }

    // Create password reset token
    const token = await createPasswordResetToken(user.id, 'RESET')

    // Send password reset email
    const emailResult = await sendPasswordResetEmail(user.email, token, user.name)

    if (!emailResult.success) {
      console.error('Failed to send password reset email:', emailResult.error)
      // Still return success to prevent email enumeration
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
