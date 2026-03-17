import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Topic lists for each exam paper
const TOPIC_MAPS: Record<string, string[]> = {
  '9701/42': [
    'Atomic structure and the periodic table',
    'Bonding, structure and properties of matter',
    'States of matter and solutions',
    'Energy, enthalpy and thermodynamics',
    'Kinetics',
    'Equilibrium',
    'Oxidation, reduction and redox equilibria',
    'Acid-base equilibria',
    'Electrons in atoms',
    'The periodic table and periodicity',
    'Group 2 and Group 17',
    'Transition metals'
  ],
  '9701/12': [
    'Atomic structure and the periodic table',
    'Bonding, structure and properties of matter',
    'States of matter and solutions',
    'Energy, enthalpy and thermodynamics',
    'Kinetics',
    'Equilibrium and gas equilibria',
    'Oxidation and reduction',
    'Acid-base chemistry',
    'Electrons in atoms',
    'The periodic table',
    'Group 2 and halogens'
  ],
  '9702/42': [
    'Physical quantities and units',
    'Kinematics',
    'Dynamics',
    'Momentum and energy',
    'Circular motion',
    'Oscillations',
    'Waves',
    'Electric fields',
    'Current of electricity',
    'Electromagnetic induction',
    'Alternating currents',
    'Nuclear physics'
  ],
  '9702/12': [
    'Physical quantities and units',
    'Kinematics',
    'Forces and Newton\'s laws',
    'Work, energy and power',
    'Momentum and collisions',
    'Circular motion',
    'Oscillations',
    'Waves and the electromagnetic spectrum',
    'Electric fields and potential',
    'Current and circuits',
    'Nuclear physics'
  ],
  '9703/42': [
    'Bonding and structure',
    'States of matter',
    'Physical chemistry and equilibrium',
    'Energy and thermodynamics',
    'Reaction kinetics',
    'Oxidation and reduction',
    'Acid-base equilibria',
    'Electrochemistry',
    'Organic chemistry - hydrocarbons',
    'Organics - functional groups',
    'Techniques',
    'Chemical tests'
  ],
  '9703/12': [
    'Matter and reactions',
    'Atomic structure and electron configuration',
    'Chemical bonding',
    'States of matter',
    'Thermodynamics and kinetics',
    'Equilibrium and pH',
    'Oxidation and reduction',
    'Organic chemistry basics',
    'Hydrocarbon derivatives',
    'Polymers and synthesis'
  ],
  '9704/42': [
    'Measurement',
    'Mechanics',
    'Thermal physics',
    'Waves and oscillations',
    'Electricity and magnetism',
    'Modern physics',
    'Quantum effects',
    'Nuclear physics'
  ],
  '9704/12': [
    'Kinematics',
    'Forces and Newton\'s laws',
    'Work, energy and power',
    'Momentum',
    'Electricity',
    'Waves',
    'Circular motion and gravitation',
    'Thermodynamics',
    'Nuclear and particle physics'
  ]
}

const FALLBACK_TOPICS = [
  'Topic 1',
  'Topic 2',
  'Topic 3',
  'Topic 4',
  'Topic 5'
]

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  try {
    const { subject, subjectName, paperCode, paperName } = await req.json()

    if (!subject || !paperCode) {
      return NextResponse.json(
        { error: 'subject and paperCode are required' },
        { status: 400 }
      )
    }

    // Get topics for this paperCode, or fallback
    const topicList = TOPIC_MAPS[paperCode] || FALLBACK_TOPICS

    // Upsert each topic
    const results = await Promise.all(
      topicList.map((topicName, index) =>
        (prisma as any).paperTopic.upsert({
          where: {
            userId_subject_paperCode_topicName: {
              userId: user.id,
              subject,
              paperCode,
              topicName
            }
          },
          update: {}, // Don't update if exists
          create: {
            userId: user.id,
            subject,
            subjectName,
            paperCode,
            paperName,
            topicName,
            topicOrder: index,
            source: 'seeded',
            confidenceScore: 0,
            sessionsLogged: 0,
            needsRevision: false
          }
        })
      )
    )

    console.log(`Seeded ${results.length} topics for ${paperCode}`)

    return NextResponse.json({ count: results.length, topics: results })
  } catch (error) {
    console.error('Error seeding paper topics:', error)
    return NextResponse.json({ error: 'Failed to seed topics' }, { status: 500 })
  }
}
