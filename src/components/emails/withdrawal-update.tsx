import { LOGO_URL } from '@/lib/site';

// Sent to the person who asked for a withdrawal once the admin has paid it
// (with the transfer reference) or refused it (with the reason).
export default function WithdrawalUpdateEmail({
  kind,
  personalityName,
  netAmount,
  payoutNumber,
  reference,
  note,
  actionUrl,
}: {
  kind: 'paid' | 'refused';
  personalityName: string;
  netAmount: string;
  payoutNumber: string | null;
  reference?: string | null;
  note?: string | null;
  actionUrl: string;
}) {
  const paid = kind === 'paid';
  const text = { fontSize: '14px', color: '#52525b', lineHeight: 1.6 };
  const detail = {
    ...text,
    margin: '0 0 6px 0',
    color: '#09090b',
  };

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
            {paid
              ? 'Votre retrait est versé'
              : 'Votre demande de retrait est refusée'}
          </h1>

          <p style={{ ...text, margin: '0 0 16px 0' }}>
            {paid
              ? `Nous avons envoyé ${netAmount} pour ${personalityName}${payoutNumber ? ` sur le ${payoutNumber}` : ''}.`
              : `Votre demande de ${netAmount} pour ${personalityName} n’a pas été versée. Le montant est de nouveau disponible dans votre solde.`}
          </p>

          <div
            style={{
              backgroundColor: '#f4f4f5',
              borderRadius: '10px',
              padding: '14px 16px',
              margin: '0 0 24px 0',
            }}
          >
            {paid && reference && (
              <p style={detail}>Référence du transfert : {reference}</p>
            )}
            {!paid && note && <p style={detail}>Motif : {note}</p>}
            <p style={{ ...detail, margin: 0, color: '#52525b' }}>
              Montant net : {netAmount}
            </p>
          </div>

          <div style={{ textAlign: 'center' }}>
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
              Voir mes retraits
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
