import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP to user (valid for 10 min)
    try {
      await (prisma.user as any).update({
        where: { email },
        data: {
          otp,
          otpExpires: new Date(Date.now() + 10 * 60 * 1000)
        }
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
    }

    // Log OTP for development
    console.log(`🔐 OTP for ${email}: ${otp}`);

    // TODO: In production, send OTP via email using SendGrid, Resend, or similar
    // For now, we log it to the console for development

    return NextResponse.json({ success: true, otp: process.env.NODE_ENV === 'development' ? otp : undefined });
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
