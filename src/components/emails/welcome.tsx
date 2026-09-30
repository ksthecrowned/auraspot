import { LOGO_URL, SITE_URL } from '@/lib/site';

interface WelcomeEmailProps {
  name?: string;
}

export default function WelcomeEmail({ name }: WelcomeEmailProps) {
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
        {/* Header */}
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
          <span
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: '#09090b',
              letterSpacing: '-0.01em',
            }}
          >
            AuraSpot
          </span>
        </div>

        {/* Content */}
        <div style={{ padding: '24px 28px 28px 28px' }}>
          <h1
            style={{
              fontSize: '22px',
              fontWeight: 700,
              color: '#09090b',
              margin: '0 0 16px 0',
            }}
          >
            Bienvenue sur AuraSpot{name ? `, ${name}` : ''} !
          </h1>

          <p
            style={{
              fontSize: '14px',
              color: '#52525b',
              lineHeight: 1.6,
              margin: '0 0 12px 0',
            }}
          >
            Merci pour votre inscription ! Sur AuraSpot, vous suivez et soutenez
            les personnalités que vous aimez, et vous pouvez créer la page de
            votre propre personnalité.
          </p>

          <p
            style={{
              fontSize: '14px',
              color: '#52525b',
              lineHeight: 1.6,
              margin: '0 0 24px 0',
            }}
          >
            Commencez par réserver votre adresse et personnaliser votre page.
          </p>

          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <a
              href={`${SITE_URL}/claim-link`}
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
              Créer ma page
            </a>
          </div>

          <p
            style={{
              fontSize: '14px',
              color: '#52525b',
              lineHeight: 1.6,
              margin: '0 0 4px 0',
            }}
          >
            Une question ? Répondez simplement à cet e-mail.
          </p>
          <p style={{ fontSize: '14px', color: '#52525b', margin: 0 }}>
            &mdash; L’équipe AuraSpot
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            borderTop: '1px solid #e4e4e7',
            padding: '16px 28px',
            fontSize: '12px',
            color: '#a1a1aa',
            textAlign: 'center',
            backgroundColor: '#fafafa',
          }}
        >
          <p style={{ margin: 0 }}>
            <a
              href={SITE_URL}
              style={{ color: '#7c3aed', textDecoration: 'none' }}
            >
              AuraSpot
            </a>{' '}
            &middot; Découvrez. Suivez. Soutenez.
          </p>
        </div>
      </div>
    </div>
  );
}
