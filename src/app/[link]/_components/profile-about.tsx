'use client';

import { type RouterOutputs, api } from '@/trpc/react';
import Highlight from '@tiptap/extension-highlight';
import TiptapLink from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Color, TextStyle } from '@tiptap/extension-text-style';
import TiptapUnderline from '@tiptap/extension-underline';
import { EditorContent, type Extension, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import BioToolbar from './bio-toolbar';
import { usePreview } from './preview-context';

const extensions = [
  StarterKit.configure({ link: false, underline: false }),
  Placeholder.configure({
    placeholder: 'Présentez-vous en quelques lignes…',
    showOnlyWhenEditable: true,
  }),
  TiptapLink.configure({ openOnClick: false }),
  TiptapUnderline,
  TextStyle,
  Color,
  Highlight.configure({ multicolor: true }),
] as Extension[];

const HTML_TAG_RE = /<[^>]*>/g;

type ProfileLinkData = NonNullable<RouterOutputs['profileLink']['getByLink']>;

export default function ProfileAbout({
  profileLink: initialData,
}: {
  profileLink: ProfileLinkData;
}) {
  const { link } = useParams<{ link: string }>();
  const { data: profileLink } = api.profileLink.getByLink.useQuery(
    { link },
    { initialData, staleTime: 60_000 }
  );
  const { preview } = usePreview();
  const { mutate: updateProfileLink } = api.profileLink.update.useMutation();

  const [bio, setBio] = useState(initialData.bio ?? '');
  const lastSavedBio = useRef(initialData.bio ?? '');
  const isEditable = Boolean(profileLink?.canEdit) && !preview;

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: initialData.bio,
    editable: isEditable,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm dark:prose-invert max-w-none text-foreground/80 focus:outline-none prose-p:my-1',
      },
    },
    onUpdate: ({ editor: current }) => setBio(current.getHTML()),
  });

  useEffect(() => {
    editor?.setEditable(isEditable);
  }, [editor, isEditable]);

  useEffect(() => {
    if (!isEditable || bio === lastSavedBio.current) {
      return;
    }
    const timer = setTimeout(() => {
      lastSavedBio.current = bio;
      updateProfileLink({ id: initialData.id, bio });
    }, 800);
    return () => clearTimeout(timer);
  }, [isEditable, bio, initialData.id, updateProfileLink]);

  if (!profileLink) {
    return null;
  }

  const hasBio = bio.replace(HTML_TAG_RE, '').trim().length > 0;
  if (!(hasBio || isEditable)) {
    return null;
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
        À propos
      </h2>
      <div className="group/bio relative">
        <EditorContent editor={editor} />
        {isEditable && editor && (
          <div className="invisible absolute left-0 z-40 mt-1 group-focus-within/bio:visible">
            <BioToolbar
              editor={editor}
              name={profileLink.name}
              links={profileLink.bento
                .filter((b) => b.type === 'link' && 'href' in b)
                .map((b) => (b as { href: string }).href)}
            />
          </div>
        )}
      </div>
    </section>
  );
}
