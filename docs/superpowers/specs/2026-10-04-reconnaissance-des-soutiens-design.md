# Reconnaissance des soutiens : dédicaces, objectifs de collecte, carte de partage — design

Date : 4 octobre 2026
Statut : à relire

## Objectif

Aujourd'hui, celui qui soutient ne reçoit rien en retour : ni statut, ni reconnaissance, ni raison de revenir. Cette tranche rend le soutien visible et lui donne un but, sans jamais révéler le montant d'un don.

| Fonction | Ce qu'elle apporte |
| --- | --- |
| **Dédicaces** | Le fan laisse un message public, et le créateur peut le remercier. C'est la version numérique des *mabanga* de la rumba. |
| **Objectifs de collecte** | Le créateur annonce un projet chiffré (« Financer mon clip »). Le fan voit à quoi sert son don et où en est la collecte. |
| **Carte de partage** | Après un don réussi, le fan partage une image « J'ai soutenu X » dans son statut WhatsApp. C'est la boucle d'acquisition principale. |

Ces trois fonctions sont prévues pour la bêta fermée avec les créateurs fondateurs. Le contexte se trouve dans le document « AuraSpot — Lancement, positionnement et acquisition ».

## Principes communs

- **Un don individuel ne montre jamais son montant.** Ni sur la fiche, ni dans une dédicace, ni sur une carte de partage.
- **Rien n'est public sans l'accord du fan.** La dédicace et le nom sur la carte suivent le choix `isPublic` déjà présent sur `support`.
- **Seul un paiement réussi compte.** Un don en attente, échoué ou remboursé n'affiche ni dédicace ni progression.
- **Seules les fiches revendiquées et vérifiées sont concernées.** C'est la règle actuelle de `src/lib/support-eligibility.ts`.

## 1. Dédicaces

### Parcours

1. Sur `/support/[slug]`, sous le champ « Nom affiché », un champ facultatif « Votre message pour {prénom} », limité à 280 caractères.
2. Le message n'est publié que si la case « Afficher mon nom » est cochée. Sinon, le champ est désactivé, avec la mention « Les messages accompagnent un soutien public ».
3. Une fois le paiement réussi, la dédicace apparaît dans la section Communauté de la fiche, au-dessus des avatars.
4. Le créateur ou un gestionnaire peut :
   - **remercier** : un cœur, plus une réponse facultative de 140 caractères au maximum ;
   - **masquer** la dédicace, qui disparaît de la fiche sans que le don soit touché.
5. Un visiteur peut signaler une dédicace, avec le nouveau motif `inappropriate_message`.

### Affichage sur la fiche

- Les 3 dédicaces les plus récentes sous le titre « Communauté », puis un lien « Voir les N messages » vers `/{slug}/messages` (liste paginée, 20 par page).
- Chaque dédicace montre :
  - les initiales colorées (même palette que `community.tsx`) ;
  - le nom affiché ;
  - la date relative (« il y a 2 jours ») ;
  - un badge « Soutien mensuel » si le don vient d'un `recurringSupport` ;
  - le cœur et la réponse du créateur s'il en a laissé.
- Le texte s'affiche brut :
  - pas de Markdown ;
  - les URL ne deviennent pas des liens et apparaissent en texte simple ;
  - les retours à la ligne sont limités à 3.

### Données

Colonnes ajoutées à `support` (`src/server/db/schema/support.ts`) :

| Colonne | Type | Rôle |
| --- | --- | --- |
| `message` | `text`, nullable | Dédicace, 280 caractères au maximum, validée par zod |
| `messageHiddenAt` | `timestamp`, nullable | Masquée par le créateur ou par un admin |
| `thankedAt` | `timestamp`, nullable | Le créateur a remercié |
| `thankYouReply` | `text`, nullable | Réponse du créateur, 140 caractères au maximum |

Index : `support_personality_message_idx` sur (`personalityId`, `createdAt`), filtré par `message is not null`.

Pour un don mensuel, chaque renouvellement crée un nouveau `support` **sans message**. La dédicace se laisse au premier paiement ; le fan peut en écrire une nouvelle depuis `/account/supports`.

### API

| Procédure | Accès | Rôle |
| --- | --- | --- |
| `support.create` | public | Schéma `CreateSupportSchema` étendu avec `message` (facultatif, ignoré si `isPublic` est faux) |
| `support.messages` | public, `generalLimit` | Liste paginée des dédicaces visibles : `{ id, displayName, message, createdAt, isMonthly, thankedAt, thankYouReply }`. **Aucun montant** |
| `support.thank` | gestionnaire de la fiche | Pose `thankedAt` et une `thankYouReply` facultative |
| `support.hideMessage` | gestionnaire ou admin | Pose `messageHiddenAt` |
| `support.editMessage` | le fan connecté, auteur du soutien | Modifie ou retire son message |

Le droit « gestionnaire » reprend la règle `canEdit` existante : propriétaire de la fiche ou ligne `personality_manager`.

### Notifications

- Le créateur reçoit un e-mail groupé, au plus un par jour : « 3 nouveaux messages de vos soutiens ». C'est un nouveau modèle, `support-messages.tsx`.
- Le fan qui a laissé une adresse e-mail est prévenu quand le créateur le remercie.

## 2. Objectifs de collecte

### Parcours

1. En mode édition, sur sa fiche, le créateur clique sur « Lancer un objectif » et remplit :
   - **titre** : 80 caractères au maximum ;
   - **description** : 280 caractères, facultative ;
   - **montant cible** : en FCFA, de 10 000 à 50 000 000 ;
   - **date de fin** : facultative.
2. La fiche montre une carte « Objectif » sous le hero : titre, barre de progression, pourcentage, nombre de soutiens et date de fin s'il y en a une.
3. Sur `/support/[slug]`, le rappel « Votre don compte pour : {titre} » s'affiche au-dessus des montants.
4. À 100 %, la carte affiche « Objectif atteint 🎉 » et les dons continuent d'y être rattachés jusqu'à la clôture.
5. Le créateur clôt l'objectif à la main, ou il se clôt seul à sa date de fin. Il passe alors dans l'historique, sur `/{slug}/objectifs`.

**Règle :** un seul objectif actif par fiche.

### Ce qui est public

- Le **montant cible** est public : le créateur le choisit en connaissance de cause, et le formulaire le lui dit.
- La **progression** est publique en pourcentage seulement, arrondie à l'unité inférieure et plafonnée à 100 % pour l'affichage. Le total collecté n'est jamais affiché en FCFA aux visiteurs. Le créateur le voit dans ses statistiques.
- Ces règles ne révèlent aucun don individuel.

### Données

Nouvelle table `support_goal` :

| Colonne | Type | Rôle |
| --- | --- | --- |
| `id` | `uuid` | |
| `personalityId` | `uuid` → `link.id` | |
| `title` | `text` | 80 caractères au maximum |
| `description` | `text`, nullable | 280 caractères au maximum |
| `targetAmount` | `integer` | En XAF |
| `status` | `active` \| `closed` | « Atteint » se calcule, il n'est pas stocké |
| `endsAt` | `timestamp`, nullable | |
| `closedAt` | `timestamp`, nullable | |
| `createdAt` | `timestamp` | |

Index unique partiel sur `personalityId` filtré par `status = 'active'`.

Ajout à `support` : `goalId uuid`, nullable, avec `references(() => supportGoal.id, { onDelete: 'set null' })`. Il est fixé à la création du `support` s'il existe un objectif actif à ce moment-là. Les renouvellements mensuels suivent la même règle.

**Calcul de la progression :** somme des `payment.amount` au statut `success`, dont le `support.goalId` est celui de l'objectif. Un remboursement fait baisser la progression. Le résultat est mis en cache Redis pendant 5 minutes, et le cache est invalidé par `applyPaymentEvent` quand un paiement change de statut.

### API et tâches planifiées

| Procédure | Accès | Rôle |
| --- | --- | --- |
| `personality.goal` | public | `{ id, title, description, targetAmount, percent, supporters, endsAt }` |
| `personality.createGoal` | gestionnaire | Refusé s'il existe déjà un objectif actif |
| `personality.closeGoal` | gestionnaire | |
| `personality.goalTotal` | gestionnaire | Total collecté en FCFA, pour les statistiques |

`/api/cron/recurring` clôt aussi les objectifs dont `endsAt` est passé ; aucune tâche planifiée n'est ajoutée.

Quand un objectif franchit 100 %, les gestionnaires reçoivent un e-mail (`goal-reached.tsx`).

## 3. Carte de partage « J'ai soutenu X »

### Parcours

1. Sur `/support/checkout/[paymentId]`, une fois le paiement réussi, l'écran de remerciement propose « Partager sur WhatsApp ».
2. Sur mobile, le bouton appelle `navigator.share({ files: [image], text, url })` si le partage de fichiers est disponible. Sinon, il ouvre `https://wa.me/?text=…` avec le texte et le lien, et propose « Télécharger l'image ».
3. Le lien partagé vaut `https://auraspot.me/{slug}?src=carte`.

### Image

- **Route :** `/api/og/support/[paymentId]`, en Edge, sur le modèle de `src/app/api/og/route.tsx`.
- **Formats :** `1080×1920` (statut WhatsApp, par défaut) et `?format=wide` en `1200×630`.
- **Contenu :**
  - l'avatar de la fiche dans l'anneau dégradé AuraSpot ;
  - « {Nom affiché} soutient {nom} » si le soutien est public, sinon « J'ai soutenu {nom} » ;
  - le titre de l'objectif actif s'il y en a un, avec son pourcentage ;
  - le wordmark et `auraspot.me/{slug}`.
  - **Jamais de montant.**
- **Accès :**
  - l'image n'est servie que pour un paiement au statut `success` ; sinon, réponse 404 ;
  - `paymentId` est un UUID non devinable, mais l'image n'affiche de toute façon rien de privé : ni nom non public, ni montant ;
  - cache `public, max-age=86400`.

### Mesure

- Ajout d'une colonne `source text`, nullable, à `link_view`. Elle est remplie depuis `?src=` (liste blanche : `carte`, `qr`, `bio`), puis le paramètre est retiré de l'URL côté client.
- Les statistiques de la fiche affichent ensuite « Visites venues des cartes de partage ».

## Ordre de réalisation

1. **Dédicaces** : schéma, `support.create`, affichage, remerciement, masquage, signalement.
2. **Carte de partage** : route d'image, écran de remerciement, `?src=carte`.
3. **Objectifs** : schéma, création et clôture, carte sur la fiche, progression et cache.
4. **E-mails** : messages groupés, objectif atteint.

Chaque étape fait l'objet de sa propre migration (`bun run db:generate`) et de ses propres commits.

## Tests

En tests unitaires `*.test.ts`, avec `bun test` :

- validation des schémas zod :
  - message limité à 280 caractères ;
  - message ignoré si le soutien n'est pas public ;
  - montant cible dans les bornes ;
- calcul du pourcentage : arrondi inférieur, plafond d'affichage, prise en compte d'un remboursement ;
- choix du texte de la carte : soutien public ou anonyme, avec ou sans objectif ;
- liste blanche de `?src=`.

Vérifications manuelles, sur mobile à 375 px :

- don public avec message ;
- don anonyme ;
- remerciement et masquage par un gestionnaire ;
- objectif qui passe 100 % ;
- partage de la carte sur Android et iOS.

## Cas limites

| Cas | Comportement |
| --- | --- |
| Message offensant | Le créateur le masque ; un visiteur le signale ; un admin le masque depuis `/admin/reports` |
| Fan qui rend son soutien privé après coup (`setVisibility`) | Sa dédicace disparaît de la fiche |
| Paiement remboursé | La dédicace disparaît et la progression baisse |
| Objectif clôturé pendant un paiement en cours | Le paiement reste rattaché à l'objectif ; l'historique le compte |
| Fiche suspendue | Ni dédicace, ni objectif, ni carte |
| Lien de carte partagé avant confirmation du paiement | Réponse 404 ; l'écran ne propose le partage qu'après succès |

## Hors périmètre

- Les avantages pour les soutiens mensuels (posts réservés, badge « Soutien fidèle »).
- L'option « Je couvre les frais » au paiement.
- Les classements de fans.
- La modération automatique des messages.
