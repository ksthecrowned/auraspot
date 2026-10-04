import { SITE_URL } from '@/lib/site';
import EmailLetter, { EmailButton } from './letter';

const text = { fontSize: '14px', color: '#52525b', lineHeight: 1.6 };

export default function GoalReachedEmail({
  personalityName,
  slug,
  title,
  percent,
  target,
}: {
  personalityName: string;
  slug: string;
  title: string;
  percent: number;
  target: string;
}) {
  return (
    <EmailLetter title="Objectif atteint">
      <p style={{ ...text, margin: 0 }}>
        L’objectif « {title} » de {personalityName} est atteint ({percent} %).
        La cible publique était de {target}.
      </p>
      <EmailButton href={`${SITE_URL}/${slug}`} label="Voir la fiche" />
    </EmailLetter>
  );
}
