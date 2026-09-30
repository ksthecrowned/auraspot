import { isAdminEmail } from '@/lib/admin';
import { auth } from '@/lib/auth';
import { redis } from '@/lib/redis';
import {
  buildObjectKey,
  deleteObjectByUrl,
  uploadObject,
  validateImageFile,
} from '@/lib/storage';
import { db, eq, isProfileLinkEditor } from '@/server/db';
import { link } from '@/server/db/schema';
import { type NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: 'Non connecté' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  const profileLinkId = formData.get('profileLinkId');

  if (typeof profileLinkId !== 'string' || !profileLinkId) {
    return NextResponse.json({ error: 'Profil manquant' }, { status: 400 });
  }
  const invalid = validateImageFile(file);
  if (invalid) {
    return NextResponse.json({ error: invalid }, { status: 400 });
  }

  const profileLink = await db.query.link.findFirst({
    where: (l, { eq }) => eq(l.id, profileLinkId),
    columns: { id: true, image: true, userId: true },
  });

  // Owners and managers edit their fiche; the admin edits any fiche.
  const allowed =
    profileLink &&
    (isAdminEmail(session.user.email) ||
      (await isProfileLinkEditor(session.user.id, profileLink)));
  if (!allowed) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
  }

  const prefix = `avatars/${profileLinkId}`;
  let optimized: Buffer;
  try {
    optimized = await sharp(Buffer.from(await (file as File).arrayBuffer()))
      .resize(400, 400, { fit: 'cover' })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: 'Image illisible' }, { status: 400 });
  }

  // Upload first, then drop the previous avatar: a failed upload never
  // leaves the profile without an image.
  const { url } = await uploadObject({
    key: buildObjectKey(prefix, 'webp'),
    body: optimized,
    contentType: 'image/webp',
  });

  const [updated] = await db
    .update(link)
    .set({ image: url })
    .where(eq(link.id, profileLinkId))
    .returning();

  if (profileLink.image) {
    try {
      await deleteObjectByUrl(profileLink.image, prefix);
    } catch {
      // An orphan file is harmless; the new avatar is already saved.
    }
  }

  if (updated?.link) {
    await redis.set(`profile-link:${updated.link}`, updated, {
      ex: 30 * 60,
    });
  }

  return NextResponse.json({ url });
}
