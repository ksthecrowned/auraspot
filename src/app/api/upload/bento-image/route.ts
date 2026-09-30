import { auth } from '@/lib/auth';
import { buildObjectKey, uploadObject, validateImageFile } from '@/lib/storage';
import { type NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: 'Non connecté' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  const invalid = validateImageFile(file);
  if (invalid) {
    return NextResponse.json({ error: invalid }, { status: 400 });
  }

  let optimized: Buffer;
  try {
    optimized = await sharp(Buffer.from(await (file as File).arrayBuffer()))
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: 'Image illisible' }, { status: 400 });
  }

  const { url } = await uploadObject({
    key: buildObjectKey(`bento-images/${session.user.id}`, 'webp'),
    body: optimized,
    contentType: 'image/webp',
  });

  return NextResponse.json({ url });
}
