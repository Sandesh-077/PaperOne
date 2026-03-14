import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { email, otp, newPassword } = await req.json()

    if (!email || !otp || !newPassword) {
      return NextResponse.json({ error: 'Email, OTP, and new password required' }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    try {
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

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10)

      // Update user password and clear OTP
      await (prisma.user as any).update({
        where: { email },
        data: {
          password: hashedPassword,
          otp: null,
          otpExpires: null
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Password reset successfully'
      })
    } catch (error: any) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
    }
  } catch (error) {
    console.error('Error resetting password:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
