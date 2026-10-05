# Carte souvenir et centre du QR code — design

Date : 5 octobre 2026
Statut : à relire

Ce document remplace le contenu de l’image décrit dans la section 3 de `docs/superpowers/specs/2026-10-04-reconnaissance-des-soutiens-design.md`. Le parcours de partage après un don, le lien `?src=carte` et l’interdiction d’afficher un montant restent ceux de ce document. La route d’image est déjà en runtime `nodejs` ; elle le reste, parce que Sharp ne tourne pas sur Edge. L’ancienne spec indiquait Edge : c’est périmé.

## Objectif

La carte téléchargée après un don réussi doit montrer l’artiste, avec les informations déjà publiques de sa fiche, et la mention du donateur en signature. Aujourd’hui la photo est prévue, mais les fichiers sont en WebP : le générateur ne les dessine pas, et l’anneau dégradé apparaît à la place.

Le bouton Partager de la fiche ne change pas : il envoie le nom et l’URL, sans image.

Le QR code reste un QR code, avec sa couleur, son lien, son téléchargement et sa copie. Le seul ajout est le centre : logo AuraSpot ou photo de la fiche.

## 1. Carte souvenir

### Parcours

Inchangé. Sur `/support/checkout/[paymentId]`, après un paiement `success`, « Partager sur WhatsApp » et « Télécharger l’image » continuent d’utiliser `/api/og/support/[paymentId]`.

### Formats

| Format | Taille | Quand |
| --- | --- | --- |
| Story, défaut | 1080×1920 | sans paramètre, ou tout paramètre autre que `wide` |
| Large | 1200×630 | `?format=wide` |

### Contenu, format story, de haut en bas

1. **Photo** dans l’anneau dégradé actuel. Le serveur convertit le fichier en PNG avant de le dessiner. Sans photo, ou si le chargement ou la conversion échoue, un disque sombre (`#120818`) occupe le cercle. Le dégradé ne sert plus de photo de remplacement.
2. **Nom** de la fiche. Si `verificationStatus` est `verified`, une pastille ronde `#F75FC0`, avec une coche blanche, est collée à droite du nom. Pas d’infobulle : l’image ne peut pas en afficher.
3. **Catégorie** et **lieu**, chacun seulement s’il est renseigné après trim.
4. **Bio**, seulement si le texte brut n’est pas vide. Voir `shareCardBio` ci-dessous.
5. **Nombre de soutiens**, le `count` de `getSupportersPreview`, seulement s’il est supérieur à zéro. Libellé : `1 soutien`, ou `{formatThousands(count)} soutiens`. Les noms des autres soutiens ne sont pas dessinés. Aucun montant.
6. **Objectif** rattaché à ce don, via `getGoalSnapshot(support.goalId)`, comme aujourd’hui : `{titre} · {pourcentage} %`. Si l’appel renvoie `null`, la ligne est absente.
7. **Mention du donateur**, `shareCardHeadline`, inchangée : `{nom affiché} soutient {artiste}` quand le soutien est public et que le nom affiché trimé n’est pas vide, sinon `J’ai soutenu {artiste}`.
8. `{ROOT_DOMAIN}/{slug}` puis le mot `AuraSpot`.

Un champ absent ne laisse pas de vide à sa place.

### Contenu, format large

Photo, nom, pastille, catégorie, lieu, mention du donateur, lien et mot AuraSpot. La bio, le nombre de soutiens et l’objectif sont absents, même s’ils existent.

### Accès et cache

- UUID invalide, paiement autre que `success`, personnalité absente ou fiche `suspended` : 404.
- L’image ne contient ni montant, ni nom de donateur lorsque le soutien n’est pas public.
- `Cache-Control: public, max-age=300`. Une carte déjà envoyée sur WhatsApp reste le fichier partagé à ce moment-là.

## 2. Texte et photo, côté serveur

### Fonctions pures dans `src/lib/share-card.ts`

`shareCardBio(bio: string | null): string | null`

1. `null` ou `undefined` donne `null`.
2. Les balises sont retirées avec `/<[^>]*>/g`.
3. Les entités `&nbsp;`, `&amp;`, `&lt;`, `&gt;`, `&quot;` et `&#39;` sont décodées, dans cet ordre (`&amp;` après `&nbsp;`, pour ne pas décoder deux fois).
4. Chaque suite d’espaces, y compris les retours à la ligne, devient une espace unique, puis le texte est trimé.
5. Chaîne vide : `null`.
6. 140 points de code ou moins : le texte tel quel.
7. Au-delà : les 139 premiers points de code Unicode (`Array.from`), plus `…` (U+2026). Le résultat fait 140 points de code. Une emoji n’est pas coupée en deux.

`shareCardShowsDetail(format: string | null): boolean` vaut `false` seulement quand `format === 'wide'`. Le format story dessine la bio, le nombre de soutiens et l’objectif. Le format large ne les dessine pas.

`qrOffersProfilePhoto(image: string | null | undefined): boolean` vaut vrai quand `image?.trim()` est non vide.

`shareCardHeadline` et `shareCardSizes` ne changent pas.

### Chargement de la photo

`loadProfilePhotoPng(url: string)` dans `src/lib/profile-photo.ts` :

- L’URL doit être `http:` ou `https:`. Sinon, `null`.
- Téléchargement avec un délai de 5 secondes et un corps limité à 8 × 1024 × 1024 octets. Au-delà, ou en cas d’erreur réseau, `null`.
- Sharp produit un PNG. Échec de décodage : `null`.
- La carte souvenir demande un carré cover de 560×560, intégré en `data:image/png;base64,…`.
- Le portrait QR demande un PNG de 256×256 : fond blanc `#ffffff`, photo cover dans un cercle, coins blancs opaques. Les coins transparents laisseraient voir les modules du QR.

Les deux routes appellent cette fonction. Aucune des deux ne passe l’URL R2 au navigateur pour le dessin.

## 3. Centre du QR code

### Parcours

`LinkQRModal` reçoit `image: string | null`. Les deux appelants le fournissent : `profile-top-bar.tsx` depuis la fiche, `link-card.tsx` depuis `link.image`.

L’interrupteur Logo est retiré. À la place, deux choix : **Logo** et **Photo**. Logo est sélectionné à l’ouverture. Photo n’est affiché que si `qrOffersProfilePhoto(image)` est vrai. Sinon le centre est le logo AuraSpot et le sélecteur n’est pas rendu.

Le lien du QR, le niveau `Q`, la couleur, le fond blanc, le téléchargement `auraspot-{slug}.png` et la copie dans le presse-papiers restent les mêmes. Le bouton Partager de la fiche n’est pas modifié.

### Route `GET /api/qr-avatar/[slug]`

Runtime `nodejs`. Elle cherche la fiche par son slug exact.

404 si la fiche n’existe pas, si `status` est `suspended`, ou si `image` est vide. Elle ne télécharge que l’URL stockée dans cette colonne.

Réponse : le PNG 256×256 décrit plus haut, `Content-Type: image/png`, `Cache-Control: public, max-age=300`.

Le modal n’appelle cette route que lorsque Photo est choisi : `imageSettings.src` vaut `/api/qr-avatar/{slug}`, le slug passé par `encodeURIComponent`. Logo continue d’utiliser le fichier same-origin `public/logo.png`.

Si la route répond 404 ou échoue alors que Photo est choisi, le QR est quand même dessiné, sans image au centre.

## 4. Tests

`bun test`, dans `src/lib/share-card.test.ts` :

- `shareCardHeadline` : les cas déjà couverts restent valides.
- `shareCardBio` : `null`, balises retirées, entités décodées, espaces resserrés, chaîne vide ignorée, texte de 140 points de code conservé, texte plus long coupé à 139 points de code plus `…`.
- `shareCardShowsDetail` : `null` et toute valeur autre que `wide` incluent le détail ; `wide` l’exclut.
- `qrOffersProfilePhoto` : `null`, `undefined` et chaîne vide ou blanche donnent faux ; une URL non vide donne vrai.

Aucun test ne génère l’image Open Graph ni le PNG Sharp.

Vérifications manuelles :

- fiche avec photo WebP : la carte story montre la photo, le nom, les champs présents et la mention du donateur ;
- fiche sans photo : disque sombre, le reste s’affiche ;
- don public et don anonyme ;
- `?format=wide` : pas de bio, pas de compteur, pas d’objectif ;
- QR Logo et QR Photo : aperçu, téléchargement et copie ;
- fiche sans photo : le choix Photo est absent.

## Hors périmètre

- Joindre une image au bouton Partager de la fiche.
- Entourer le QR des informations de l’artiste.
- Retirer le choix de couleur du QR.
- Changer `?src=carte` ou la mesure des visites.
- Afficher un montant, sur la carte ou dans le QR.
- Migration de schéma.
