import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { NEXT_AUTH_OPTIONS } from '@/lib/auth'
import prisma from '@/db'
import { createPasswordResetToken } from '@/lib/token'
import { sendSetPasswordEmail } from '@/lib/email'
import { permissions } from '@/lib/permissions'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(NEXT_AUTH_OPTIONS)
    const currentUser = session?.user || null

    // Only admins and superusers can send set password emails
    if (!currentUser || (!permissions.isSuperUser(currentUser) && !permissions.isAdmin(currentUser))) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      )
    }

    const { userId } = await req.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Create set password token (24 hour expiry)
    const token = await createPasswordResetToken(user.id, 'SET_PASSWORD')

    // Send set password email
    const emailResult = await sendSetPasswordEmail(user.email, token, user.name)

    if (!emailResult.success) {
      console.error('Failed to send set password email:', emailResult.error)
      return NextResponse.json(
        { error: 'Failed to send email. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Set password email sent successfully.',
    })
  } catch (error) {
    console.error('Send set password email error:', error)
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
