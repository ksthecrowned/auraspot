import LegalDocument, { type LegalSection } from '@/components/legal-document';
import { CONTACT_EMAIL, ROOT_DOMAIN, SITE_NAME } from '@/lib/site';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: `Conditions d’utilisation · ${SITE_NAME}`,
  description: `Les règles d’utilisation de ${SITE_NAME} : fiches, revendications, dons, commission et retraits.`,
};

const EMAIL = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

const SECTIONS: LegalSection[] = [
  {
    id: 'editeur',
    title: 'Éditeur',
    content: (
      <p>
        Le site {ROOT_DOMAIN} (« {SITE_NAME} ») est édité par{' '}
        <strong>Kaiser D. Styve</strong>, Pointe-Noire, République du Congo.
        Contact : {EMAIL}.
      </p>
    ),
  },
  {
    id: 'service',
    title: 'Le service',
    content: (
      <p>
        {SITE_NAME} permet de découvrir des personnalités (artistes, sportifs,
        créateurs…), de consulter leurs fiches et leurs réseaux officiels, et de
        les soutenir par des dons. Les personnalités, ou leurs représentants,
        peuvent créer ou revendiquer leur fiche, la personnaliser, suivre leurs
        statistiques et retirer les dons reçus. L’utilisation du site implique
        l’acceptation des présentes conditions.
      </p>
    ),
  },
  {
    id: 'compte',
    title: 'Compte',
    content: (
      <ul>
        <li>
          Vous devez avoir au moins 18 ans pour créer un compte ou faire un don.
        </li>
        <li>
          Les informations fournies doivent être exactes et tenues à jour.
        </li>
        <li>
          Vous êtes responsable de la confidentialité de vos identifiants et de
          l’activité de votre compte.
        </li>
        <li>
          Un don unique peut être fait sans compte ; un don mensuel nécessite un
          compte.
        </li>
      </ul>
    ),
  },
  {
    id: 'fiches',
    title: 'Fiches, revendication et vérification',
    content: (
      <>
        <p>
          Une fiche peut être créée par la personnalité elle-même ou par un
          tiers. Elle peut alors être <strong>revendiquée</strong> par la
          personne concernée ou son représentant, sur justificatifs. Une
          revendication approuvée donne le droit de gérer la fiche ; plusieurs
          gestionnaires peuvent être désignés.
        </p>
        <p>
          Le <strong>badge vérifié</strong> signifie que {SITE_NAME} a contrôlé
          l’identité de la personne ou le mandat de son représentant. Il ne
          certifie pas l’exactitude de chaque information publiée sur la fiche.
        </p>
        <p>
          Il est interdit de créer ou de revendiquer une fiche en se faisant
          passer pour quelqu’un d’autre.
        </p>
      </>
    ),
  },
  {
    id: 'contenus',
    title: 'Contenus et signalements',
    content: (
      <>
        <p>
          Vous restez responsable des contenus que vous publiez et garantissez
          disposer des droits nécessaires. Sont interdits notamment les contenus
          illicites, trompeurs, haineux, violents, portant atteinte aux droits
          d’autrui ou à la vie privée.
        </p>
        <p>
          Toute fiche peut être signalée. {SITE_NAME} examine les signalements
          et peut suspendre une fiche ou un compte en cas de manquement, sans
          préjudice d’autres recours.
        </p>
      </>
    ),
  },
  {
    id: 'dons',
    title: 'Dons',
    content: (
      <>
        <p>
          Un don est un soutien volontaire à une personnalité. Il ne donne droit
          à aucune contrepartie, sauf si la personnalité en propose elle-même.
          Les montants sont exprimés en francs CFA (FCFA).
        </p>
        <p>
          <strong>Les dons ne sont pas remboursables</strong>, une fois le
          paiement confirmé.
        </p>
        <p>
          Le montant d’un don n’est jamais affiché publiquement. Le donateur
          peut choisir d’afficher son nom sur la fiche. Un don mensuel peut être
          arrêté à tout moment depuis « Mes dons » ; les paiements déjà
          effectués restent acquis.
        </p>
      </>
    ),
  },
  {
    id: 'retraits',
    title: 'Commission et retraits',
    content: (
      <>
        <p>
          L’utilisation de {SITE_NAME} est gratuite pour les personnalités et
          les donateurs. {SITE_NAME} se rémunère uniquement par une{' '}
          <strong>commission de 10 % prélevée au moment du retrait</strong>.
        </p>
        <ul>
          <li>Montant minimum de retrait : 5 000 FCFA.</li>
          <li>
            Délai de versement : de 24 heures à 7 jours après la demande, selon
            le moyen de paiement.
          </li>
          <li>
            Une demande de retrait ne vaut pas versement : le versement est
            effectif lorsque le prestataire de paiement le confirme.
          </li>
        </ul>
        <p>
          {SITE_NAME} peut retenir un retrait en cas de soupçon de fraude,
          d’usurpation ou de litige, le temps de l’examen.
        </p>
      </>
    ),
  },
  {
    id: 'responsabilite',
    title: 'Responsabilité',
    content: (
      <p>
        {SITE_NAME} met tout en œuvre pour assurer la disponibilité et la
        sécurité du service, sans pouvoir garantir une absence totale
        d’interruption. {SITE_NAME} n’est pas responsable des contenus publiés
        par les utilisateurs, ni des engagements pris par une personnalité
        envers ses soutiens. Les paiements sont traités par des prestataires
        tiers, selon leurs propres conditions.
      </p>
    ),
  },
  {
    id: 'donnees',
    title: 'Données personnelles',
    content: (
      <p>
        Le traitement de vos données est décrit dans la{' '}
        <Link href="/legal/privacy">politique de confidentialité</Link>.
      </p>
    ),
  },
  {
    id: 'droit',
    title: 'Droit applicable',
    content: (
      <p>
        Les présentes conditions sont soumises au droit de la République du
        Congo. En cas de litige, une solution amiable sera recherchée en
        priorité ; à défaut, les tribunaux compétents de Pointe-Noire seront
        saisis.
      </p>
    ),
  },
  {
    id: 'modifications',
    title: 'Modifications',
    content: (
      <p>
        Ces conditions peuvent évoluer. La date de dernière mise à jour figure
        en haut de la page. Continuer à utiliser le service après une
        modification vaut acceptation des nouvelles conditions.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalDocument
      title="Conditions d’utilisation"
      intro={
        <p>
          Les règles du jeu sur {SITE_NAME} : fiches, revendications, dons,
          commission et retraits.
        </p>
      }
      updatedAt="30 septembre 2026"
      sections={SECTIONS}
      related={{
        href: '/legal/privacy',
        label: 'Politique de confidentialité',
      }}
    />
  );
}
