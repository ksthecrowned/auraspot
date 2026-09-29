# Fiche personnalité AuraSpot — design

Date : 29 septembre 2026. Remplace la page publique héritée d'OpenBio (`/[slug]`).

## Objectif

La fiche publique présente une personnalité, montre sa communauté et pousse au soutien. Elle doit faire oublier OpenBio : identité AuraSpot (orbe, dégradé pêche → magenta → violet → bleu, typo Outfit), structure orientée personnalité, grille de blocs reléguée à une section.

Visiteur type : un fan sur mobile, arrivé depuis un réseau social, qui veut découvrir puis soutenir. La fiche reste lisible quand personne ne l'a personnalisée (fiche non revendiquée).

## Décisions

| Sujet | Choix |
| --- | --- |
| Direction visuelle | « Aura » : avatar centré dans un anneau dégradé, halo flou derrière |
| Blocs personnalisés | Conservés, tous types et toutes tailles (`2x2`, `4x1`, `2x4`, `4x2`, `4x4`), éditeur glisser-déposer actuel, nouveau style de carte |
| Preuve sociale | Nombre de soutiens + mur des noms publics. Jamais de montant |
| Ordinateur | Deux colonnes : identité fixe à gauche, contenu à droite |
| Édition | Sur la page même, pour le propriétaire et les gestionnaires |
| Tests | Pas de tests automatisés. Vérification par `typecheck`, `lint` et navigateur |

## Structure

### Mobile (une colonne)

1. **Barre du haut** : wordmark AuraSpot (lien vers `/personalities`), bouton Partager (lien + QR, modal existante), menu `⋯` avec « Signaler » (`/report/[slug]`).
2. **Hero**
   - Halo flou en fond, teinté par `accentColor`, sinon dégradé AuraSpot.
   - Avatar dans un anneau dégradé. Sans photo : initiales sur fond sombre dérivé de l'accent.
   - Nom (Outfit 700) + badge vérifié si `verificationStatus === 'verified'`.
   - Pastilles catégorie et lieu, chacune masquée si absente.
   - Compteur « N soutiens » (« 1 soutien » au singulier ; masqué à 0, le mur prend le relais).
   - Si `claimStatus === 'unclaimed'` : « Fiche non revendiquée · C'est vous ? Revendiquer » vers `/claim/[slug]`.
3. **Réseaux officiels** : rangée d'icônes depuis `social_link`, triée par `sortOrder`. Masquée si vide pour les visiteurs.
4. **Communauté** : jusqu'à 5 avatars à initiales des soutiens publics récents, puis la phrase de résumé. À 0 soutien : « Soyez le premier à soutenir {prénom} ».
5. **À propos** : bio riche. Masquée si vide pour les visiteurs.
6. **Espace de {prénom}** : titre de section + grille de blocs existante. Masquée si vide pour les visiteurs.
7. **Pied de page** : `customFooter` s'il existe, sinon « Découvrir d'autres personnalités sur AuraSpot » vers `/personalities`.
8. **Bouton collé en bas** : « Soutenir {prénom} » vers `/support/[slug]`, dégradé AuraSpot.

### Ordinateur (`md` et plus)

- Colonne gauche (environ 360 px, `sticky`) : hero, réseaux officiels, bouton Soutenir (dans le flux, pas collé en bas).
- Colonne droite : Communauté, À propos, Espace (grille 4 colonnes).
- La barre du haut couvre toute la largeur.

### Phrase de résumé de la communauté

| Noms publics | Total | Texte |
| --- | --- | --- |
| 0 | 0 | « Soyez le premier à soutenir {prénom} » |
| 0 | n > 0 | « n soutiens » |
| 1 | 1 | « Aïcha soutient {prénom} » |
| 1 | n > 1 | « Aïcha et n−1 autres » |
| 2+ | n | « Aïcha, Grâce et n−2 autres » (sans « et 0 autres » quand n = 2 : « Aïcha et Grâce ») |

Les soutiens anonymes comptent dans le total mais n'ont pas d'avatar.

### Prénom

Premier mot du nom. Si le nom tient en un mot, ou si le premier mot fait moins de 3 lettres, on garde le nom entier.

## Mode édition

Actif quand `canEdit` est vrai et que l'aperçu visiteur est désactivé.

- **Barre d'outils** : l'`ActionBar` actuelle (tableau de bord, annuler/rétablir, ajouter un bloc, thème, assistant IA), restylée et placée en bas au centre. Elle remplace le bouton Soutenir collé en bas.
- **Hero** : nom et bio éditables sur place avec sauvegarde automatique (logique reprise de `header.tsx`). Clic sur l'avatar pour le changer. Bouton `✎` pour catégorie et lieu.
- **Réseaux officiels** : bouton `✎` qui ouvre une modal d'édition (ajout, suppression, ordre).
- **Espace** : glisser-déposer, tailles et suppression inchangés. État vide : « Ajoutez votre premier bloc : vidéo, musique, compte à rebours… ».
- **Aperçu** : bascule « Voir comme un visiteur » et bascule mobile / ordinateur conservées.
- **Statistiques** : sous le hero, « {vues} visites ce mois · Voir les statistiques » vers `/app/analytics/[id]`.
- **Fiche suspendue** : bandeau d'avertissement en haut.

### Droit de modification

`canEdit` = l'utilisateur connecté est `link.userId` **ou** figure dans `personality_manager` pour cette fiche. La même règle protège côté serveur `profileLink.update` et les mutations de blocs, qui vérifient aujourd'hui seulement `userId`.

## Données

`profileLink.getByLink` ajoute, en une seule lecture :

| Champ | Contenu |
| --- | --- |
| `category` | `{ name, slug } \| null` |
| `socialLinks` | `{ id, platform, url, label, sortOrder }[]` |
| `supporters` | `{ count, recent: { displayName }[] }` : soutiens au paiement réussi, 5 noms publics les plus récents |
| `canEdit` | booléen |
| `monthlyViews` | nombre, seulement si `canEdit`, sinon absent |

Aucun montant ne sort de cette procédure.

## Composants

Dans `src/app/[link]/_components/` :

| Fichier | Rôle |
| --- | --- |
| `profile-top-bar.tsx` | Wordmark, Partager, menu `⋯` |
| `profile-hero.tsx` | Halo, avatar, nom et bio éditables, pastilles, compteur, mention non revendiquée, statistiques propriétaire |
| `official-socials.tsx` | Rangée d'icônes + modal d'édition |
| `community.tsx` | Mur des soutiens et phrase de résumé |
| `profile-space.tsx` | Section « Espace de … » autour de `Bento`, état vide propriétaire |
| `support-bar.tsx` | Bouton Soutenir, collé en bas sur mobile, intégré sur ordinateur |
| `profile-footer.tsx` | Pied de page |

- `page.tsx` assemble les sections et gère la mise en page une ou deux colonnes.
- Supprimés : `header.tsx` (logique déplacée dans `profile-hero.tsx`), `profile-public-meta.tsx`.
- Conservés tels quels : `bento.tsx`, `bento-layout.tsx`, `bento-history.tsx`, `theme-wrapper.tsx`, `preview-context.tsx`, `action-bar.tsx` (restylage seulement), `personality-verification-badge.tsx`.
- `viewport-container.tsx` : adapté à la largeur deux colonnes.
- Style commun des blocs dans `src/components/bento/card.tsx` : arrondi 20 px, bordure fine, ombre douce, typo Outfit. Les 12 types et les tailles ne changent pas.
- Les formules « prénom » et « phrase de résumé » vivent dans `src/lib/personality.ts`.

## Cas limites

| Cas | Comportement |
| --- | --- |
| Fiche suspendue | 404 pour les visiteurs, bandeau pour qui peut modifier |
| Pas de photo | Initiales sur fond dérivé de l'accent |
| Non revendiquée | Mention + lien Revendiquer. Soutien possible |
| Rien de rempli | Il reste hero, communauté et bouton Soutenir |
| Thème sombre ou personnalisé | `ThemeWrapper` conservé, halo et anneau suivent l'accent |
| Nom très long | Retour à la ligne, taille réduite sur mobile |

## Vérification

- `bun run typecheck` et `bun run lint` sans nouvelle erreur.
- Navigateur, sur fiches locales, en mobile (375 px) et ordinateur : fiche vérifiée avec soutiens, fiche non revendiquée sans photo ni blocs, propriétaire en mode édition, gestionnaire non propriétaire en mode édition, thème sombre.

## Hors périmètre

Page `/support/[slug]`, annuaire `/personalities`, image OG par personnalité, compte « Suivre ».
