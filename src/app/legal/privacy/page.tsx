import LegalDocument, { type LegalSection } from '@/components/legal-document';
import { CONTACT_EMAIL, ROOT_DOMAIN, SITE_NAME } from '@/lib/site';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: `Politique de confidentialité · ${SITE_NAME}`,
  description: `Quelles données ${SITE_NAME} collecte, pourquoi, combien de temps, et vos droits.`,
};

const EMAIL = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

const SECTIONS: LegalSection[] = [
  {
    id: 'responsable',
    title: 'Responsable du traitement',
    content: (
      <p>
        Le site {ROOT_DOMAIN} (« {SITE_NAME} ») est édité par{' '}
        <strong>Kaiser D. Styve</strong>, Pointe-Noire, République du Congo, qui
        est responsable du traitement des données décrites ici. Pour toute
        question : {EMAIL}.
      </p>
    ),
  },
  {
    id: 'donnees',
    title: 'Données collectées',
    content: (
      <>
        <p>Nous ne collectons que ce qui est nécessaire au service :</p>
        <ul>
          <li>
            <strong>Compte</strong> : nom, adresse e-mail, mot de passe (stocké
            sous forme chiffrée, jamais en clair), photo de profil si vous vous
            connectez avec Google.
          </li>
          <li>
            <strong>Fiches publiques</strong> : nom, photo, biographie, lieu,
            catégorie, réseaux sociaux et blocs de contenu. Ces informations
            sont publiques par nature.
          </li>
          <li>
            <strong>Revendications</strong> : votre lien avec la fiche, votre
            explication et les liens vers vos justificatifs.
          </li>
          <li>
            <strong>Signalements</strong> : le motif, votre description et, si
            vous êtes connecté, votre compte.
          </li>
          <li>
            <strong>Dons</strong> : montant, date, nom affiché facultatif, choix
            de l’afficher ou non, statut et référence du paiement. Les données
            de carte ou de compte de paiement sont traitées par le prestataire
            de paiement et ne nous sont pas transmises.
          </li>
          <li>
            <strong>Retraits</strong> : montants demandés, commission et statut
            des versements.
          </li>
          <li>
            <strong>Statistiques de visite</strong> : adresse IP, type
            d’appareil et de navigateur, pays, page d’origine, et clics sur les
            blocs d’une fiche.
          </li>
          <li>
            <strong>E-mails collectés sur une fiche</strong> : si une fiche
            contient un bloc « Collecte d’e-mails », l’adresse que vous y
            saisissez est transmise à la personne qui gère cette fiche.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'finalites',
    title: 'Pourquoi nous les utilisons',
    content: (
      <ul>
        <li>
          Créer et sécuriser votre compte, et vous permettre de vous connecter.
        </li>
        <li>
          Publier et gérer les fiches, et examiner les revendications et les
          signalements.
        </li>
        <li>
          Traiter les dons, tenir le journal des soldes et effectuer les
          retraits.
        </li>
        <li>
          Fournir aux gestionnaires de fiches des statistiques de visite
          agrégées, et mesurer l’audience du site.
        </li>
        <li>
          Vous envoyer les e-mails liés au service (vérification d’adresse,
          réinitialisation du mot de passe) et, si vous l’avez activé, un résumé
          hebdomadaire de vos statistiques.
        </li>
        <li>
          Proposer, à votre demande, une rédaction de biographie assistée par
          intelligence artificielle : le texte de votre fiche est alors envoyé
          au modèle pour générer une suggestion.
        </li>
        <li>Prévenir la fraude, les abus et l’usurpation d’identité.</li>
      </ul>
    ),
  },
  {
    id: 'bases',
    title: 'Bases légales',
    content: (
      <p>
        Ces traitements reposent sur l’exécution du service que vous utilisez
        (compte, fiches, dons, retraits), sur notre intérêt légitime à sécuriser
        la plateforme et à mesurer son audience, sur le respect de nos
        obligations légales (notamment comptables pour les paiements), et sur
        votre consentement lorsqu’il est demandé (résumé hebdomadaire, affichage
        public de votre nom sur un don).
      </p>
    ),
  },
  {
    id: 'public',
    title: 'Ce qui est public',
    content: (
      <>
        <p>
          Les informations d’une fiche sont visibles par tous. Pour les dons,
          seuls le nombre de soutiens et, si vous l’avez choisi, votre nom
          affiché sont publics.
        </p>
        <p>
          <strong>Le montant d’un don n’est jamais public.</strong> Il n’est
          visible que par vous et par les personnes chargées de la gestion des
          paiements.
        </p>
      </>
    ),
  },
  {
    id: 'conservation',
    title: 'Durée de conservation',
    content: (
      <ul>
        <li>
          Compte et fiches : tant que le compte est actif, puis suppression à
          votre demande.
        </li>
        <li>
          Dons, paiements et retraits : pendant la durée imposée par les
          obligations comptables et fiscales applicables.
        </li>
        <li>Statistiques de visite : 13 mois.</li>
        <li>
          Revendications et signalements : le temps de leur examen, puis
          archivage limité en cas de litige.
        </li>
      </ul>
    ),
  },
  {
    id: 'destinataires',
    title: 'Destinataires et prestataires',
    content: (
      <>
        <p>
          Vos données ne sont jamais vendues. Elles sont accessibles à l’équipe
          {` ${SITE_NAME}`} dans la limite de ses fonctions, et confiées à des
          prestataires techniques qui agissent pour notre compte :
        </p>
        <ul>
          <li>
            Vercel : hébergement du site, stockage des images, mesure
            d’audience.
          </li>
          <li>Neon : base de données.</li>
          <li>Upstash : cache et limitation des abus.</li>
          <li>Resend : envoi des e-mails.</li>
          <li>
            Google : connexion avec un compte Google, si vous la choisissez.
          </li>
          <li>
            Les prestataires de paiement (paiement mobile, carte) : traitement
            des dons et des retraits.
          </li>
        </ul>
        <p>
          Certains de ces prestataires sont situés hors de la République du
          Congo. Nous leur demandons des garanties de sécurité et de
          confidentialité adaptées.
        </p>
      </>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies',
    content: (
      <p>
        {SITE_NAME} n’utilise qu’un cookie indispensable : celui qui maintient
        votre session de connexion. Il n’y a pas de cookie publicitaire. La
        mesure d’audience fonctionne sans cookie.
      </p>
    ),
  },
  {
    id: 'droits',
    title: 'Vos droits',
    content: (
      <>
        <p>
          Conformément à la législation congolaise relative à la protection des
          données à caractère personnel, vous pouvez accéder à vos données, les
          faire rectifier ou supprimer, vous opposer à certains traitements ou
          retirer votre consentement. Vous pouvez aussi vous désinscrire du
          résumé hebdomadaire depuis vos réglages ou le lien présent dans chaque
          e-mail.
        </p>
        <p>Pour exercer ces droits, écrivez-nous à {EMAIL}.</p>
      </>
    ),
  },
  {
    id: 'age',
    title: 'Âge minimum',
    content: (
      <p>
        Le service est réservé aux personnes âgées d’au moins 18 ans. Nous ne
        collectons pas sciemment de données concernant des mineurs.
      </p>
    ),
  },
  {
    id: 'modifications',
    title: 'Modifications',
    content: (
      <p>
        Cette politique peut évoluer. La date de dernière mise à jour figure en
        haut de la page. En cas de changement important, nous vous en
        informerons par e-mail ou sur le site.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Politique de confidentialité"
      intro={
        <p>
          Ce que {SITE_NAME} collecte, pourquoi, combien de temps, et comment
          exercer vos droits.
        </p>
      }
      updatedAt="30 septembre 2026"
      sections={SECTIONS}
      related={{ href: '/legal/terms', label: 'Conditions d’utilisation' }}
    />
  );
}
