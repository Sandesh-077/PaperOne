import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { callGemini, parseJsonResponse } from '@/lib/ai-providers'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const body = await req.json()
  const { essayContent, essayType, topic, essayId } = body

  if (!essayContent || !essayType || !topic) {
    return NextResponse.json(
      { error: 'Missing required fields: essayContent, essayType, topic' },
      { status: 400 }
    )
  }

  try {
    // Fetch EnglishProfile
    const profile = await (prisma as any).englishProfile.findUnique({
      where: { userId: user.id }
    })

    if (!profile) {
      return NextResponse.json({ error: 'English profile not found' }, { status: 404 })
    }

    // Build comprehensive Cambridge 8021 evaluation prompt
    const prompt = `You are a senior Cambridge International A-Level English General Paper (8021) examiner using the official May/June 2025 mark scheme for Paper 1 Essay (8021/12). Maximum marks: 30.

The student has written a ${essayType} on the topic: ${topic}

Essay content:
${essayContent}

Using the EXACT Cambridge 8021 Level descriptors, evaluate this essay:

LEVEL 5 (25-30 marks): Range of fully relevant information, developed analysis and evaluation of arguments to reach supported conclusion, wide vocab and variety of language features, language control and accuracy with errors only on sophisticated structures, cohesive response linking ideas convincingly, well organised.

LEVEL 4 (19-24 marks): Relevant information, analyses meaning of question, begins to evaluate arguments, well-reasoned with supportive evidence, range of vocab and language features, language control with some accuracy (errors on less common words), clear response linking ideas, generally well organised.

LEVEL 3 (13-18 marks): Selects information for some main aspects, demonstrates understanding, develops some arguments to form conclusion, logical argument usually supported, communicates clearly but inconsistent register, everyday vocab with some varied features, errors noticeable but not impeding communication, mostly coherent but organisation not sustained.

LEVEL 2 (7-12 marks): Limited information, partial understanding of question, argument partially supported, basic vocab with limited features, frequent errors sometimes impeding communication, fragmented response linking some ideas.

LEVEL 1 (1-6 marks): Limited relevant information, limited response, weak argument, lack of clarity or inappropriate register, basic vocab, frequent errors losing communication, not organised.

Cambridge examiners also use these annotations:
- FOCUSED INTRO: Does the introduction directly address the key words of the question?
- VALID POINT: Each new point made in relation to the key words
- DEVELOPMENT: Further development or evaluation of a valid point
- EXAMPLE [EG]: Use of relevant example
- GENERALISED: Generalised and descriptive points (negative)
- ASSERTION [AE]: Opinions without credible evidence (negative)
- VAGUE [TY]: Vague points and ideas (negative)
- SOPHISTICATED [L]: Ambitious, sophisticated accurate expression
- ERRORS [~~~]: Serious errors impeding communication or informal register

Provide a detailed evaluation. Return ONLY valid JSON:
{
  "cambridgeLevel": 3,
  "marksEstimate": 15,
  "gradeEquivalent": "B",
  "ao1": {
    "descriptor": "...which level descriptor best fits AO1 Selection and Application...",
    "strengths": ["...specific strength with quote from essay...", "..."],
    "improvements": ["...specific improvement needed with example of how to fix it...", "..."],
    "annotations": [{ "type": "VALID_POINT|EXAMPLE|GENERALISED|ASSERTION|VAGUE|NAQ", "quote": "...exact phrase from essay...", "note": "..." }]
  },
  "ao2": {
    "descriptor": "...which level descriptor best fits AO2 Analysis and Evaluation...",
    "strengths": ["...", "..."],
    "improvements": ["...", "..."],
    "annotations": [{ "type": "DEVELOPMENT|ASSERTION|VAGUE|EVAL", "quote": "...", "note": "..." }]
  },
  "ao3": {
    "descriptor": "...which level descriptor best fits AO3 Communication...",
    "strengths": ["...", "..."],
    "improvements": ["...", "..."],
    "annotations": [{ "type": "SOPHISTICATED|ERRORS|FOCUSED_INTRO", "quote": "...exact phrase...", "note": "..." }]
  },
  "overallVerdict": "...2-3 sentences placing the essay in context and what the single biggest improvement would be...",
  "creativeSuggestions": "...3-4 sentences on creative structural or argumentative approaches that would make this essay more memorable and original, with specific examples...",
  "nextLevelTips": "...exactly what this student needs to do to move up one Cambridge level...",
  "writingLevelDelta": 0
}`

    // Call Gemini with extended token limit
    const aiResponse = await callGemini(prompt, 2500)
    const feedback = parseJsonResponse(aiResponse)

    // Update EnglishProfile: writingLevel, recalculate overallScore and readiness estimates
    const newWritingLevel = Math.max(1, Math.min(5, profile.writingLevel + (feedback.writingLevelDelta || 0)))
    const newOverallScore = ((profile.grammarLevel + profile.vocabLevel + newWritingLevel * 2) / 4) * 10

    // Calculate readiness estimates
    const gpReadiness = (newWritingLevel / 5) * 60 + (profile.grammarLevel / 10) * 20 + (profile.vocabLevel / 10) * 20
    const satReadiness = (profile.grammarLevel / 10) * 50 + (profile.vocabLevel / 10) * 30 + (newWritingLevel / 5) * 20
    const ieltsEstimate = ((profile.grammarLevel + profile.vocabLevel + newWritingLevel * 2) / 4) * 10
    const uniReadiness = (newWritingLevel / 5) * 40 + (profile.vocabLevel / 10) * 30 + (profile.grammarLevel / 10) * 30

    const updatedProfile = await (prisma as any).englishProfile.update({
      where: { userId: user.id },
      data: {
        writingLevel: newWritingLevel,
        overallScore: newOverallScore,
        gpReadiness,
        satReadiness,
        ieltsEstimate,
        uniReadiness
      }
    })

    // Update Essay record if provided
    if (essayId) {
      await (prisma as any).essay.update({
        where: { id: essayId },
        data: {
          cambridgeLevel: feedback.cambridgeLevel,
          marksEstimate: feedback.marksEstimate,
          writingFeedback: feedback,
          creativeSuggestions: feedback.creativeSuggestions
        }
      })
    }

    // Save TrainerSession
    await (prisma as any).trainerSession.create({
      data: {
        userId: user.id,
        sessionType: 'writing',
        topic,
        essayContent,
        aiFeedback: feedback,
        cambridgeLevel: feedback.cambridgeLevel,
        marksEstimate: feedback.marksEstimate,
        writingScoreDelta: feedback.writingLevelDelta || 0
      }
    })

    return NextResponse.json({
      feedback,
      updatedProfile: {
        writingLevel: updatedProfile.writingLevel,
        overallScore: updatedProfile.overallScore,
        gpReadiness: updatedProfile.gpReadiness,
        satReadiness: updatedProfile.satReadiness,
        ieltsEstimate: updatedProfile.ieltsEstimate,
        uniReadiness: updatedProfile.uniReadiness
      }
    })
  } catch (error: any) {
    console.error('Writing feedback error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to evaluate essay' },
      { status: 500 }
    )
  }
}
