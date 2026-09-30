import { LOGO_URL, SITE_URL } from '@/lib/site';

// Monthly support emails: a renewal payment is waiting, or the plan was
// paused after repeated failed renewals.
export default function SupportRenewalEmail({
  kind,
  personalityName,
  amount,
  actionUrl,
  pushSent = false,
}: {
  kind: 'requested' | 'paused';
  personalityName: string;
  amount: string;
  actionUrl: string;
  // true when the payment request was already sent to the supporter's phone.
  pushSent?: boolean;
}) {
  const requested = kind === 'requested';
  const text = { fontSize: '14px', color: '#52525b', lineHeight: 1.6 };

  return (
    <div
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        backgroundColor: '#f4f4f5',
        padding: '40px 16px',
      }}
    >
      <div
        style={{
          maxWidth: '480px',
          margin: '0 auto',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '28px 28px 0 28px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          {/* biome-ignore lint/nursery/noImgElement: email template */}
          <img
            src={LOGO_URL}
            alt="AuraSpot"
            width="32"
            height="32"
            style={{ borderRadius: '8px' }}
          />
          <span style={{ fontSize: '15px', fontWeight: 700, color: '#09090b' }}>
            AuraSpot
          </span>
        </div>

        <div style={{ padding: '24px 28px 28px 28px' }}>
          <h1
            style={{
              fontSize: '22px',
              fontWeight: 700,
              color: '#09090b',
              margin: '0 0 16px 0',
            }}
          >
            {requested
              ? `Votre don mensuel à ${personalityName}`
              : `Don mensuel à ${personalityName} en pause`}
          </h1>

          <p style={{ ...text, margin: '0 0 12px 0' }}>
            {requested && pushSent
              ? `Une demande de paiement de ${amount} a été envoyée sur votre téléphone. Validez-la avec votre code secret.`
              : null}
            {requested && !pushSent
              ? `Votre don mensuel de ${amount} est à renouveler.`
              : null}
            {requested
              ? null
              : `Nous n’avons pas pu encaisser votre don mensuel de ${amount} après plusieurs essais. Il est mis en pause : aucune nouvelle demande ne vous sera envoyée.`}
          </p>

          <p style={{ ...text, margin: '0 0 24px 0' }}>
            {requested
              ? 'Si vous n’avez rien reçu ou si la demande a expiré, payez depuis ce lien :'
              : 'Vous pouvez reprendre votre soutien quand vous voulez :'}
          </p>

          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <a
              href={actionUrl}
              style={{
                display: 'inline-block',
                padding: '12px 32px',
                backgroundColor: '#09090b',
                color: '#ffffff',
                borderRadius: '10px',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              {requested ? 'Payer mon don' : 'Reprendre mon soutien'}
            </a>
          </div>

          <p style={{ ...text, margin: 0 }}>
            Vous pouvez arrêter votre don mensuel à tout moment depuis{' '}
            <a
              href={`${SITE_URL}/account/supports`}
              style={{ color: '#7c3aed', textDecoration: 'none' }}
            >
              Mes soutiens
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
