"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'

export function ResetPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isValidating, setIsValidating] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [tokenValid, setTokenValid] = useState(false)
  const [tokenType, setTokenType] = useState<'RESET' | 'SET_PASSWORD'>('RESET')
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('No reset token provided')
        setIsValidating(false)
        return
      }

      try {
        const response = await fetch(`/api/auth/reset-password?token=${token}`)
        const data = await response.json()

        if (data.valid) {
          setTokenValid(true)
          setTokenType(data.type || 'RESET')
          setUserName(data.userName || '')
        } else {
          setError(data.error || 'Invalid or expired token')
        }
      } catch {
        setError('Failed to validate token')
      } finally {
        setIsValidating(false)
      }
    }

    validateToken()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'An error occurred. Please try again.')
        return
      }

      setSuccess(true)
      
      // Redirect to sign-in after 3 seconds
      setTimeout(() => {
        router.push('/sign-in')
      }, 3000)
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const title = tokenType === 'SET_PASSWORD' ? 'Set Your Password' : 'Reset Your Password'
  const subtitle = tokenType === 'SET_PASSWORD' 
    ? `Welcome${userName ? `, ${userName}` : ''}! Please create a password for your account.`
    : 'Enter your new password below.'

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden">
        <CardContent className="grid p-0 md:grid-cols-2">
          <div className="relative hidden bg-muted md:block">
            <img
              src="/images/sign-in-background.webp"
              alt="Reset password"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[.75] filter brightness-75"
            />
          </div>
          <div className="p-6 md:p-8">
            {isValidating ? (
              <div className="flex flex-col items-center justify-center gap-4 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-muted-foreground">Validating your link...</p>
              </div>
            ) : success ? (
              <div className="flex flex-col items-center justify-center gap-4 py-8">
                <CheckCircle className="h-12 w-12 text-green-500" />
                <h1 className="text-2xl font-bold">Password Updated!</h1>
                <p className="text-muted-foreground text-center">
                  Your password has been successfully {tokenType === 'SET_PASSWORD' ? 'set' : 'reset'}.
                  <br />
                  Redirecting to sign in...
                </p>
                <Link href="/sign-in" className="underline underline-offset-4">
                  Sign in now
                </Link>
              </div>
            ) : !tokenValid ? (
              <div className="flex flex-col items-center justify-center gap-4 py-8">
                <XCircle className="h-12 w-12 text-red-500" />
                <h1 className="text-2xl font-bold">Invalid Link</h1>
                <p className="text-muted-foreground text-center">
                  {error || 'This password reset link is invalid or has expired.'}
                </p>
                <Link href="/forgot-password" className="underline underline-offset-4">
                  Request a new link
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col items-center text-center">
                    <h1 className="text-2xl font-bold">{title}</h1>
                    <p className="text-balance text-muted-foreground">
                      {subtitle}
                    </p>
                  </div>
                  {error && (
                    <div className="text-sm text-red-500 text-center">
                      {error}
                    </div>
                  )}
                  <div className="grid gap-2">
                    <Label htmlFor="password">New Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      minLength={8}
                      placeholder="At least 8 characters"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      minLength={8}
                      placeholder="Confirm your password"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {tokenType === 'SET_PASSWORD' ? 'Setting Password...' : 'Resetting Password...'}
                      </>
                    ) : (
                      tokenType === 'SET_PASSWORD' ? 'Set Password' : 'Reset Password'
                    )}
                  </Button>

                  <hr />

                  <div className="text-center text-sm">
                    Remember your password?{" "}
                    <Link href="/sign-in" className="underline underline-offset-4">
                      Sign in
                    </Link>
                  </div>
                </div>
              </form>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
