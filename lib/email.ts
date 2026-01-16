import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@example.com'

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured. Email not sent.')
    console.log('Would have sent email to:', to)
    console.log('Subject:', subject)
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      html,
    })

    if (error) {
      console.error('Failed to send email:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, error: 'Failed to send email' }
  }
}

export async function sendPasswordResetEmail(email: string, token: string, userName: string) {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Reset Your Password</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">Reset Your Password</h1>
        <p>Hi ${userName},</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <p style="margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <p><strong>This link will expire in 1 hour.</strong></p>
        <p>If you didn't request a password reset, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
      </body>
    </html>
  `

  return sendEmail({
    to: email,
    subject: 'Reset Your Password',
    html,
  })
}

export async function sendSetPasswordEmail(email: string, token: string, userName: string) {
  const setPasswordUrl = `${APP_URL}/reset-password?token=${token}`
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Set Your Password</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">Welcome! Set Your Password</h1>
        <p>Hi ${userName},</p>
        <p>An account has been created for you. Please click the button below to set your password and activate your account:</p>
        <p style="margin: 30px 0;">
          <a href="${setPasswordUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Set Password
          </a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${setPasswordUrl}</p>
        <p><strong>This link will expire in 24 hours.</strong></p>
        <p>If you didn't expect this email, please contact your administrator.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
      </body>
    </html>
  `

  return sendEmail({
    to: email,
    subject: 'Welcome - Set Your Password',
    html,
  })
}
