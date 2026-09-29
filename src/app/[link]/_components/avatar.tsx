'use client';

import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import type { RouterOutputs } from '@/trpc/react';
import { UploadCloud } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useState } from 'react';
import { type FileWithPath, useDropzone } from 'react-dropzone';

type Props = {
  profileLink: NonNullable<RouterOutputs['profileLink']['getByLink']>;
};

export default function ProfileLinkAvatar({ profileLink }: Props) {
  const [img, setImg] = useState(profileLink.image);

  const onDrop = useCallback(
    async (acceptedFiles: FileWithPath[]) => {
      const file = acceptedFiles[0];
      if (!file) {
        return;
      }

      setImg(URL.createObjectURL(file));

      const formData = new FormData();
      formData.append('file', file);
      formData.append('profileLinkId', profileLink.id);

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const data = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !data.url) {
          throw new Error(data.error ?? 'Upload failed');
        }
        setImg(data.url);
      } catch (err) {
        toast({
          title: 'Error',
          description: err instanceof Error ? err.message : 'Upload failed',
        });
        setImg(profileLink.image ?? '/logo.png');
      }
    },
    [profileLink.id, profileLink.image]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 'image/png': [], 'image/jpeg': [] },
  });

  if (!profileLink.canEdit && !profileLink.image) {
    return null;
  }

  return (
    <div
      {...(profileLink.canEdit ? getRootProps() : {})}
      className={cn(
        'flex h-[100px] w-[100px] flex-col items-center justify-center gap-y-1 rounded-full border border-border bg-background/50 shadow-lg ring-4 ring-background md:h-[150px] md:w-[150px]',
        !profileLink.image && profileLink.canEdit && 'border-dashed',
        profileLink.canEdit && 'cursor-pointer',
        img && 'border-0 border-transparent bg-transparent'
      )}
    >
      {img && (
        <Image
          key={img}
          src={img}
          alt="Profile link image"
          width={150}
          height={150}
          priority
          className="max-h-full max-w-full rounded-full object-cover"
        />
      )}

      {profileLink.canEdit && !img && (
        <>
          <UploadCloud className="h-8 w-8 text-muted-foreground" />
          <p className="font-semibold text-muted-foreground text-sm">Upload</p>
        </>
      )}

      {profileLink.canEdit && <input {...getInputProps()} />}
    </div>
  );
}
