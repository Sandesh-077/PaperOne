import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { email } = await req.json()
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    console.log(`Attempting to send OTP for email: ${email}`)

    // Save OTP to user (valid for 10 min)
    try {
      const user = await (prisma.user as any).findUnique({
        where: { email }
      })

      if (!user) {
        console.log(`User not found with email: ${email}`)
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      await (prisma.user as any).update({
        where: { email },
        data: {
          otp,
          otpExpires: new Date(Date.now() + 10 * 60 * 1000)
        }
      })

      console.log(`✅ OTP generated for ${email}: ${otp}`)
    } catch (dbError: any) {
      console.error('Database error:', {
        message: dbError?.message,
        code: dbError?.code,
        meta: dbError?.meta
      })
      
      if (dbError?.message?.includes('Can\'t reach database') || 
          dbError?.message?.includes('ECONNREFUSED')) {
        return NextResponse.json(
          { error: 'Database connection failed. Please ensure the database is configured.' },
          { status: 503 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to process request. Please try again.' },
        { status: 500 }
      )
    }

    // Send OTP via Resend email
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured. OTP not sent via email.')
      return NextResponse.json({
        success: true,
        message: 'OTP generated but email service not configured',
        otp: process.env.NODE_ENV === 'development' ? otp : undefined,
        devInfo: 'Configure RESEND_API_KEY to send emails'
      })
    }

    try {
      // Import Resend only when API key is available
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)

      const emailResponse = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
        to: email,
        subject: 'Your PaperOne Password Reset OTP',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">PaperOne Password Reset</h1>
            <p>Hello,</p>
            <p>Your One-Time Password (OTP) to reset your password is:</p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <p style="font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 0; color: #1f2937;">
                ${otp}
              </p>
            </div>
            <p style="color: #6b7280;">This OTP will expire in 10 minutes.</p>
            <p style="color: #6b7280;">If you didn't request a password reset, please ignore this email or contact support.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #9ca3af; font-size: 12px;">© PaperOne 2026. All rights reserved.</p>
          </div>
        `
      })

      if (emailResponse.error) {
        console.error('Resend error:', emailResponse.error)
        return NextResponse.json(
          { error: 'Failed to send email. Please try again.' },
          { status: 500 }
        )
      }

      console.log(`📧 OTP email sent to ${email}`)
      return NextResponse.json({
        success: true,
        message: 'OTP sent to your email'
      })
    } catch (emailError: any) {
      console.error('Email sending error:', emailError)
      return NextResponse.json(
        { error: 'Failed to send email. Please try again.' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Send OTP error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
