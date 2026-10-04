import { SITE_URL } from '@/lib/site';
import EmailLetter, { EmailButton } from './letter';

const text = { fontSize: '14px', color: '#52525b', lineHeight: 1.6 };

export default function SupportMessagesEmail({
  count,
  personalityName,
  slug,
}: {
  count: number;
  personalityName: string;
  slug: string;
}) {
  const headline =
    count > 1
      ? `${count} nouveaux messages de vos soutiens`
      : '1 nouveau message de vos soutiens';

  return (
    <EmailLetter title={headline}>
      <p style={{ ...text, margin: 0 }}>
        {count > 1
          ? `${count} nouveaux messages ont été publiés sur la fiche de ${personalityName}.`
          : `Un nouveau message a été publié sur la fiche de ${personalityName}.`}
      </p>
      <EmailButton
        href={`${SITE_URL}/${slug}/messages`}
        label="Lire les messages"
      />
    </EmailLetter>
  );
}
