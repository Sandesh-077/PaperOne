import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }

// Prevent static optimization for this route
export const dynamic = 'force-dynamic'
