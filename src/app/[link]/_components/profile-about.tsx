'use client';

import { Button } from '@/components/ui/button';
import { bioForDisplay } from '@/lib/admin-fiche';
import { cn } from '@/lib/utils';
import { type RouterOutputs, api } from '@/trpc/react';
import Highlight from '@tiptap/extension-highlight';
import TiptapLink from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Color, TextStyle } from '@tiptap/extension-text-style';
import TiptapUnderline from '@tiptap/extension-underline';
import { EditorContent, type Extension, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Pencil } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import BioToolbar from './bio-toolbar';
import { usePreview } from './preview-context';

const extensions = [
  StarterKit.configure({ link: false, underline: false }),
  Placeholder.configure({
    placeholder: 'Présentez-vous en quelques lignes…',
    showOnlyWhenEditable: true,
    showOnlyCurrent: false,
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
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const lastSavedBio = useRef(initialData.bio ?? '');
  const sectionRef = useRef<HTMLElement>(null);
  const isEditable = Boolean(profileLink?.canEdit) && !preview;

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: bioForDisplay(initialData.bio),
    editable: isEditable,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-foreground/80 focus:outline-none [&_b]:font-bold [&_p+p]:mt-3 [&_strong]:font-bold prose-p:my-1',
      },
    },
    onUpdate: ({ editor: current }) => setBio(current.getHTML()),
    onFocus: () => setToolbarOpen(true),
    onBlur: ({ event }) => {
      const next = event.relatedTarget;
      if (next instanceof Node && sectionRef.current?.contains(next)) {
        return;
      }
      setToolbarOpen(false);
    },
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
    <section ref={sectionRef} className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
          À propos
        </h2>
        {isEditable && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 rounded-full px-2.5 text-xs"
            onClick={() => {
              setToolbarOpen(true);
              editor?.commands.focus('end');
            }}
          >
            <Pencil className="mr-1 size-3.5" />
            {hasBio ? 'Modifier' : 'Ajouter une bio'}
          </Button>
        )}
      </div>
      {isEditable && toolbarOpen && editor && (
        // biome-ignore lint/nursery/noStaticElementInteractions: keeps the caret in the bio while a format button is pressed
        <div onMouseDown={(event) => event.preventDefault()}>
          <BioToolbar editor={editor} />
        </div>
      )}
      <div
        className={cn(
          isEditable &&
            'cursor-text rounded-xl px-3 py-2 ring-1 ring-border/70 focus-within:ring-foreground/25'
        )}
      >
        <EditorContent editor={editor} />
      </div>
    </section>
  );
}
