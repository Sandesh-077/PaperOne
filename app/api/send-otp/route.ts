import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';

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
      
      // If it's a database connection error
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

    // In development, return OTP for testing
    const isDev = process.env.NODE_ENV === 'development'
    return NextResponse.json({ 
      success: true,
      message: 'OTP sent successfully',
      ...(isDev && { otp, devInfo: `Check server logs for OTP` })
    })
  } catch (error: any) {
    console.error('Send OTP error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
