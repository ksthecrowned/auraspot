import { LOGO_URL, SITE_URL } from '@/lib/site';

interface ResetPasswordProps {
  url: string;
}

export default function ResetPassword({ url }: ResetPasswordProps) {
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
            Réinitialisez votre mot de passe
          </h1>

          <p
            style={{
              fontSize: '14px',
              color: '#52525b',
              lineHeight: 1.6,
              margin: '0 0 12px 0',
            }}
          >
            Nous avons reçu une demande de réinitialisation de votre mot de
            passe AuraSpot. Choisissez-en un nouveau avec le bouton ci-dessous.
          </p>

          <p
            style={{
              fontSize: '13px',
              color: '#a1a1aa',
              margin: '0 0 24px 0',
            }}
          >
            Ce lien expire dans 1 heure.
          </p>

          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <a
              href={url}
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
              Choisir un nouveau mot de passe
            </a>
          </div>

          <p
            style={{
              fontSize: '12px',
              color: '#a1a1aa',
              margin: 0,
            }}
          >
            Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail
            : votre mot de passe ne changera pas.
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
