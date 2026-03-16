import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { callGroq, parseJsonResponse } from '@/lib/ai-providers'

export const dynamic = 'force-dynamic'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({error: 'Unauthorized'}, {status: 401})

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({error: 'User not found'}, {status: 404})

  const essayId = params.id
  
  try {
    // Fetch essay and verify ownership
    const essay = await prisma.essay.findFirst({
      where: { id: essayId, userId: user.id }
    })
    
    if (!essay) return NextResponse.json({error: 'Essay not found'}, {status: 404})

    // Build the prompt for Gemini
    const essayTypeLabel = essay.essayType ? 
      {
        'full': 'Full Essay',
        'introduction': 'Introduction',
        'conclusion': 'Conclusion',
        'argument': 'Argument Paragraph',
        'counterclaim': 'Counter-claim',
        'rebuttal': 'Rebuttal'
      }[essay.essayType] || essay.essayType : 'Full Essay'

    const prompt = `You are an experienced Cambridge A-Level General Paper (8021) examiner. A student has submitted a ${essayTypeLabel} for a GP essay on this topic.

Essay content:
${essay.content}

Evaluate strictly against the official Cambridge GP 8021 marking criteria:
- AO1 Content (max 20 marks): quality of ideas, relevance, depth of argument, examples used
- AO2 Language (max 15 marks): vocabulary range, sentence variety, formal register, clarity, accuracy  
- AO3 Structure (max 15 marks): organisation, paragraphing, coherence, intro/conclusion quality

For each AO give: a band (Band 1-5), estimated score out of max, array of 2 specific strengths, array of 2 specific improvements with examples from the text.
Also give overall: estimated total out of 50, grade (A-E), the single most important thing to fix, the single best thing done.

Return ONLY valid JSON — no markdown, no explanation:
{
  "ao1": { "band": "Band 3", "score": "11/20", "strengths": ["...","..."], "improvements": ["...","..."] },
  "ao2": { "band": "Band 3", "score": "9/15", "strengths": ["...","..."], "improvements": ["...","..."] },
  "ao3": { "band": "Band 3", "score": "9/15", "strengths": ["...","..."], "improvements": ["...","..."] },
  "overall": { "total": "29/50", "grade": "C", "topFix": "...", "topStrength": "..." }
}`

    // Call Gemini API
    const responseText = await callGroq(prompt, 2000)
    
    // Parse the response
    const feedback = parseJsonResponse(responseText)

    // Update essay with feedback
    const updatedEssay = await prisma.essay.update({
      where: { id: essayId },
      data: {
        aiFeedback: feedback,
        aiFeedbackAt: new Date()
      }
    })

    return NextResponse.json({ feedback })
  } catch (error) {
    console.error('Error generating essay feedback:', error)
    return NextResponse.json({error: 'Failed to generate feedback'}, {status: 500})
  }
}
