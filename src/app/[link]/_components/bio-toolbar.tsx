'use client';

import { Button } from '@/components/ui/button';
import type { Editor } from '@tiptap/react';
import {
  Bold,
  Heading2,
  Highlighter,
  Italic,
  LinkIcon,
  List,
  Palette,
  Underline as UnderlineIcon,
} from 'lucide-react';

export default function BioToolbar({ editor }: { editor: Editor }) {
  const btnClass = 'h-6 w-6 p-0';

  return (
    <div className="inline-flex w-auto items-center gap-0.5 rounded-md border border-border/50 bg-card/80 px-0.5 py-0.5 backdrop-blur-sm">
      <Button
        type="button"
        aria-label="Gras"
        variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
        size="sm"
        className={btnClass}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-3 w-3" />
      </Button>
      <Button
        type="button"
        aria-label="Italique"
        variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
        size="sm"
        className={btnClass}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-3 w-3" />
      </Button>
      <Button
        type="button"
        aria-label="Titre"
        variant={
          editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'
        }
        size="sm"
        className={btnClass}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="h-3 w-3" />
      </Button>
      <Button
        type="button"
        aria-label="Liste"
        variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
        size="sm"
        className={btnClass}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-3 w-3" />
      </Button>

      <div className="mx-0.5 h-4 w-px bg-border" />

      <Button
        type="button"
        aria-label="Souligné"
        variant={editor.isActive('underline') ? 'secondary' : 'ghost'}
        size="sm"
        className={btnClass}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className="h-3 w-3" />
      </Button>
      <Button
        type="button"
        aria-label="Lien"
        variant={editor.isActive('link') ? 'secondary' : 'ghost'}
        size="sm"
        className={btnClass}
        onClick={() => {
          const url = window.prompt('Adresse du lien :');
          if (url) {
            editor.chain().focus().setLink({ href: url }).run();
          }
        }}
      >
        <LinkIcon className="h-3 w-3" />
      </Button>
      <Button
        type="button"
        aria-label="Surlignage"
        variant={editor.isActive('highlight') ? 'secondary' : 'ghost'}
        size="sm"
        className={btnClass}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
      >
        <Highlighter className="h-3 w-3" />
      </Button>
      <Button
        type="button"
        aria-label="Couleur"
        variant="ghost"
        size="sm"
        className={btnClass}
        onClick={() => {
          const color = window.prompt('Couleur hexadécimale (ex. #ff0000) :');
          if (color) {
            editor.chain().focus().setColor(color).run();
          }
        }}
      >
        <Palette className="h-3 w-3" />
      </Button>
    </div>
  );
}
