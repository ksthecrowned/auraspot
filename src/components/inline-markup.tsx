import { parseInlineMarkup } from '@/lib/inline-markup';

export function InlineMarkup({ text }: { text: string }) {
  return parseInlineMarkup(text).map((part, index) => {
    const key = `${part.type}-${index}`;
    if (part.type === 'break') {
      return <br key={key} />;
    }
    if (part.type === 'bold') {
      return (
        <strong key={key} className="font-bold text-foreground">
          {part.value}
        </strong>
      );
    }
    return <span key={key}>{part.value}</span>;
  });
}
