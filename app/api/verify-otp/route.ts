import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json()

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP required' }, { status: 400 })
    }

    // Find user and check OTP
    const user = await (prisma.user as any).findUnique({
      where: { email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if OTP is correct
    if ((user as any).otp !== otp) {
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 })
    }

    // Check if OTP has expired
    if (!(user as any).otpExpires || new Date() > (user as any).otpExpires) {
      return NextResponse.json({ error: 'OTP expired' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully'
    })
  } catch (error) {
    console.error('Error verifying OTP:', error)
    return NextResponse.json({ error: 'Failed to verify OTP' }, { status: 500 })
  }
}
