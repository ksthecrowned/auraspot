'use client';

import { toast } from '@/components/ui/use-toast';
import { initialsOf } from '@/lib/personality';
import { cn } from '@/lib/utils';
import type { RouterOutputs } from '@/trpc/react';
import { Camera } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useState } from 'react';
import { type FileWithPath, useDropzone } from 'react-dropzone';
import { usePreview } from './preview-context';

type Props = {
  profileLink: NonNullable<RouterOutputs['profileLink']['getByLink']>;
};

export default function ProfileLinkAvatar({ profileLink }: Props) {
  const [img, setImg] = useState(profileLink.image);
  const { preview } = usePreview();
  const isEditable = profileLink.canEdit && !preview;

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
        if (!(res.ok && data.url)) {
          throw new Error(data.error ?? 'Upload failed');
        }
        setImg(data.url);
      } catch (err) {
        toast({
          title: 'Photo non enregistrée',
          description: err instanceof Error ? err.message : 'Upload failed',
        });
        setImg(profileLink.image);
      }
    },
    [profileLink.id, profileLink.image]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 'image/png': [], 'image/jpeg': [] },
    disabled: !isEditable,
  });

  return (
    <div className="aura-ring relative @4xl:size-36 size-28 shrink-0 rounded-full p-1">
      <div
        {...(isEditable ? getRootProps() : {})}
        className={cn(
          'group relative flex size-full items-center justify-center overflow-hidden rounded-full border-4 border-background bg-[color-mix(in_oklab,var(--aura-accent,#b43cf0)_28%,#1a1325)]',
          isEditable && 'cursor-pointer'
        )}
      >
        {img ? (
          <Image
            key={img}
            src={img}
            alt={profileLink.name}
            fill
            sizes="144px"
            priority
            unoptimized={img.startsWith('blob:')}
            className="object-cover"
          />
        ) : (
          <span className="font-bold font-brand @4xl:text-4xl text-3xl text-white">
            {initialsOf(profileLink.name)}
          </span>
        )}

        {isEditable && (
          <>
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="size-6 text-white" />
            </div>
            <input {...getInputProps()} />
          </>
        )}
      </div>
    </div>
  );
}
