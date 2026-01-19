import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(req: Request) {
  const formData = await req.formData();
  const topicId = formData.get('topicId');
  const pdf = formData.get('pdf');
  const video = formData.get('video');

  let fileUrl = null;
  let fileType = null;
  if (pdf && typeof pdf === 'object' && 'arrayBuffer' in pdf) {
    const buffer = Buffer.from(await pdf.arrayBuffer());
    const fileName = `note_${Date.now()}.pdf`;
    const filePath = path.join(process.cwd(), 'public', 'uploads', fileName);
    await writeFile(filePath, buffer);
    fileUrl = `/uploads/${fileName}`;
    fileType = 'pdf';
  }

  // Save note to DB using Note model
  const note = await prisma.note.create({
    data: {
      topicId: String(topicId),
      fileUrl,
      fileType,
      content: video ? String(video) : null,
    },
  });

  return NextResponse.json(note);
}
