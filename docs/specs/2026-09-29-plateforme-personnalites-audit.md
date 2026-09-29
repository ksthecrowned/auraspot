# Audit OpenBio — plateforme de personnalités

Date : 29 septembre 2026. Aucun code applicatif n’a été modifié pour produire ce document.

OpenBio est aujourd’hui un constructeur de pages « link in bio ». Le profil public est une ligne `link` dont le `userId` est obligatoire. Le paiement est un abonnement Polar Free / Pro / Business. Il n’existe ni personnalité indépendante, ni soutien, ni journal financier, ni administration.

La relation cible est **Personnalité, communauté, soutien**.

## A. Architecture actuelle

**Structure.** Next.js 16 (App Router), tRPC 11, Drizzle sur Neon, Redis Upstash, Better Auth, Vercel Blob, Resend, Polar. Trois routers : `user`, `profileLink`, `ai`.

### Données

| Table | Rôle |
| --- | --- |
| `user` | Compte, `plan` (`free` \| `pro` \| `business`), client Polar, essai 7 jours, crédits IA |
| `link` | Slug unique, nom, bio, avatar, bento JSON, thème, domaine custom, `isPublic`, `userId` NOT NULL |
| `link_view` / `link_click` | Vues (IP, pays, appareil) et clics de cartes |
| `email_subscriber` | E-mails collectés sur une page |
| `session`, `account`, `verification` | Auth Better Auth. `verification` est un jeton d’e-mail, pas une vérification d’identité |

### Flux

- **Authentification.** E-mail et mot de passe (vérification obligatoire), GitHub et Google. Le cookie de session protège `/app` et `/create-link` dans `src/proxy.ts`. `protectedProcedure` exige un utilisateur.
- **Profil.** `/claim-link` choisit un slug libre, puis redirige vers l’inscription et `/create-link`. La création exige un compte et un quota de plan (1 page en Free, 5 en Pro, illimité en Business). La page publique est `/[slug]`, aussi servie par sous-domaine et domaine personnalisé. Le propriétaire est `session.user.id === link.userId`. Le badge « vérifié » s’affiche quand le propriétaire est Pro ou en essai. Son libellé actuel est « Verified Pro member ».
- **Paiement.** Checkout Polar des produits Pro et Business. Les webhooks mettent à jour `user.plan`. Le succès renvoie vers `/app?upgraded=true`. Aucun argent ne va vers une personne.
- **Découverte.** `/explore` liste les pages `isPublic`, les plus récentes d’abord, sans recherche, catégorie ni lieu.
- **Administration.** Absente. Le mot `admin` est seulement un slug réservé.

### Pages

`/`, `/explore`, `/[slug]`, `/claim-link`, `/create-link`, `/app`, `/app/analytics/[id]`, auth, mentions légales. SEO : titre, description, image `/api/og`, JSON-LD `Person`.

## B. Écart avec le produit cible

| Cible | État du dépôt |
| --- | --- |
| Personnalité sans compte | `link.userId` obligatoire |
| Création, revendication et vérification distinctes | « Claim » crée la page du compte. Le badge signifie un abonnement |
| Soutien sans inscription | Aucun paiement visiteur |
| Commission au retrait, usage gratuit | Plans payants Polar |
| Ledger et retraits | Aucun solde, aucune écriture |
| Annuaire | Liste chronologique |
| Plusieurs gestionnaires | Un seul `userId` |
| Admin, claims, modération | Rien |

### Réutilisation

- **Conserver.** Better Auth, e-mails Resend, Redis, Blob, rate limit, SEO, partage, QR, analytics de vues, composants shadcn.
- **Adapter.** La page `/[slug]`, Explore, la saisie des réseaux (aujourd’hui transformée en cartes bento à la création), le dashboard, le proxy de slug, le composant de badge.
- **Remplacer.** Polar, les plans, l’essai, les crédits IA liés au plan, et le sens du badge.
- **Laisser de côté comme cœur de produit.** Tarifs Pro/Business, célébration d’upgrade, quotas de pages, domaine custom comme privilège premium. Les cartes bento peuvent rester un complément de fiche. Elles ne définissent plus le produit.

## C. Architecture cible

Un compte peut être supporter, gestionnaire, ou les deux. Une personnalité existe sans compte.

| Entité | Contenu | Règle |
| --- | --- | --- |
| `personality` | Slug, nom, avatar, bio, lieu, catégorie | Publique dès la création. `claimStatus` (`unclaimed` \| `claimed`) et `verificationStatus` (`unverified` \| `verified`) sont séparés |
| `category` | Nom, slug, ordre, actif | Administrable. La liste Musique, Sport, Créateurs, etc. n’est pas figée |
| `social_link` | Plateforme, identifiant ou URL | Réseaux officiels, distincts des cartes bento |
| `personality_manager` | User, personnalité, rôle | Plusieurs gestionnaires autorisés |
| `claim` | Lien déclaré, justificatifs, statut | `PENDING`, `APPROVED`, `REJECTED`, `MORE_INFORMATION_REQUIRED`. L’approbation donne le droit de gestion |
| `support` | Montant, devise, visibilité, nom | `userId` nullable. Le montant n’est pas public par défaut |
| `payment` | Fournisseur, référence, statut | `pending`, `success`, `failed`, `cancelled`, `refunded`. Webhooks idempotents |
| `ledger_entry` | Crédit, débit, frais, retrait | Le solde se reconstitue depuis le journal |
| `withdrawal` | Brut, commission, net, statut | Une demande n’est pas un versement réussi. Le taux de commission est lu en configuration |
| `report` | Signalement, usurpation, suspension | Modération admin |

Le badge signifie que la plateforme a vérifié l’identité de la personne ou l’autorisation du représentant. Il ne certifie pas chaque information publiée.

Le fournisseur de paiement est une interface du domaine (mobile money, carte, autres pays). Le premier marché est le Congo, en FCFA. Un soutien récurrent est un abonnement envers une personnalité. Il n’y a pas d’abonnement Premium de la plateforme.

### Parcours public

Découvrir une personnalité, ouvrir sa fiche, lire son statut, suivre ses réseaux officiels, la soutenir sans créer de compte, revenir.

### Routes

| Surface | Évolution |
| --- | --- |
| `/` | Annuaire : recherche, catégories, populaires, récentes, plus soutenues |
| `/[slug]` | Fiche personnalité : statut, réseaux, bouton Soutenir. Bento en second plan |
| `/soutenir/[slug]` | Montant puis paiement, sans compte obligatoire |
| `/claim/[slug]` | Revendication après authentification, avec justificatifs |
| `/app` | Personnalités gérées et historique de soutiens |
| `/admin` | Fiches, catégories, revendications, vérifications, paiements, retraits, signalements |

## D. Ordre de migration

1. Schéma `personality`, catégories, réseaux, gestionnaires et revendications, sans rendre `userId` obligatoire sur la fiche.
2. Création d’une fiche publique non revendiquée, et profil qui affiche les trois statuts.
3. Découverte : recherche, catégories, tris.
4. Revendication puis vérification, et réécriture du badge.
5. Soutien, paiement abstrait, ledger, retrait, commission configurable, webhooks idempotents.
6. Compte supporter facultatif : historique, récurrence, confidentialité.
7. Administration et retrait des plans Polar.

Les pages publiques actuelles restent en place jusqu’à ce que la personnalité les remplace. La première tranche de code est le schéma, sans supprimer `link` ni Polar.
