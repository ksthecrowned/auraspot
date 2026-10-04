import { SITE_URL } from '@/lib/site';
import EmailLetter, { EmailButton } from './letter';

const text = { fontSize: '14px', color: '#52525b', lineHeight: 1.6 };

export default function SupportThankedEmail({
  firstName,
  personalityName,
  slug,
  reply,
}: {
  firstName: string;
  personalityName: string;
  slug: string;
  reply?: string | null;
}) {
  return (
    <EmailLetter title={`${firstName} vous remercie`}>
      <p style={{ ...text, margin: 0 }}>
        {firstName} vous remercie pour votre soutien.
      </p>
      {reply ? (
        <p
          style={{
            ...text,
            margin: '16px 0 0 0',
            padding: '12px 16px',
            backgroundColor: '#f4f4f5',
            borderRadius: '12px',
            color: '#09090b',
          }}
        >
          {reply}
        </p>
      ) : null}
      <EmailButton
        href={`${SITE_URL}/${slug}`}
        label={`Voir la fiche de ${personalityName}`}
      />
    </EmailLetter>
  );
}
