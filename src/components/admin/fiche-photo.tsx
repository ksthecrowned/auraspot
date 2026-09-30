'use client';

import { initialsOf } from '@/lib/personality';
import { Camera, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { type FileWithPath, useDropzone } from 'react-dropzone';

// Same upload as the owner's avatar (/api/upload: resized, WebP, R2); the
// route lets the admin change any fiche's photo.
export function FichePhoto({
  personalityId,
  name,
  image,
}: {
  personalityId: string;
  name: string;
  image: string | null;
}) {
  const router = useRouter();
  const [img, setImg] = useState(image);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (files: FileWithPath[]) => {
      const file = files[0];
      if (!file) {
        return;
      }
      setError(null);
      setUploading(true);
      setImg(URL.createObjectURL(file));
      const formData = new FormData();
      formData.append('file', file);
      formData.append('profileLinkId', personalityId);
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const data = (await res.json()) as { url?: string; error?: string };
        if (!(res.ok && data.url)) {
          throw new Error(data.error ?? 'Envoi impossible');
        }
        setImg(data.url);
        router.refresh();
      } catch (uploadError) {
        setImg(image);
        setError(
          uploadError instanceof Error
            ? uploadError.message
            : 'Envoi impossible'
        );
      } finally {
        setUploading(false);
      }
    },
    [personalityId, image, router]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 'image/png': [], 'image/jpeg': [] },
    disabled: uploading,
  });

  return (
    <div className="flex items-center gap-4">
      <div
        {...getRootProps()}
        className="group relative flex size-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-muted"
      >
        {img ? (
          <Image
            key={img}
            src={img}
            alt={name}
            fill
            sizes="80px"
            unoptimized={img.startsWith('blob:')}
            className="object-cover"
          />
        ) : (
          <span className="font-bold font-brand text-xl">
            {initialsOf(name)}
          </span>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          {uploading ? (
            <Loader2 className="size-5 animate-spin text-white" />
          ) : (
            <Camera className="size-5 text-white" />
          )}
        </div>
        <input {...getInputProps()} aria-label="Photo de la fiche" />
      </div>
      <div className="text-sm">
        <p className="font-medium">Photo</p>
        <p className="text-muted-foreground text-xs">
          PNG ou JPEG. Cliquez ou déposez une image.
        </p>
        {error && <p className="mt-1 text-destructive text-xs">{error}</p>}
      </div>
    </div>
  );
}
