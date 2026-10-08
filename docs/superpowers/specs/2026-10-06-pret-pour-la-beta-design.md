# Prêt pour la bêta — design

Date : 6 octobre 2026
Statut : à relire

La feuille de route du 4 octobre (« AuraSpot — Lancement, positionnement et acquisition ») prévoit une bêta fermée de 20 à 30 créateurs, avec de l’argent réel et des plafonds. Ce lot couvre les trois points produit qui la bloquent encore : le blocage des fonds Nyole avant retrait, les plafonds, et l’offre fondateur.

## Objectif

- Un don Nyole contesté après son versement au créateur ne doit pas devenir une perte pour AuraSpot.
- Pendant la bêta, un don et un retrait ont un montant maximal.
- Un créateur fondateur ne paie aucune commission pendant 6 mois et porte un badge « Fondateur ».

## Constats dans le code

- Le solde se reconstitue depuis `ledger_entry` (`ledgerBalance` dans `src/server/db/utils/support.ts`). Le montant retirable est le solde moins les retraits `pending`.
- Nyole ne dit pas si le donateur a payé par carte ou par Mobile Money : `getNyoleStatus` ne lit que le statut. Les paiements MTN et Airtel en direct (tout `provider` autre que `nyole`) ne peuvent pas faire l’objet d’une contestation par carte.
- `MAX_SUPPORT_AMOUNT` vaut 2 000 000 et sert aussi de plafond au retrait (`src/server/api/schemas/support.ts`). Il n’existe pas de plafond de retrait propre.
- `src/lib/money.ts` est importé par des composants client (`create-support.tsx`, `request-withdrawal.tsx`). Les plafonds restent donc des constantes du code, pas des variables d’environnement serveur.
- La commission est globale (`SUPPORT_COMMISSION_BPS`). Elle est figée dans `withdrawal.commissionBps` à la demande.

## 1. Blocage des fonds Nyole

### Règle

Un crédit dont le paiement a `provider = 'nyole'` n’est retirable que 14 jours après la création de son écriture de crédit (`ledger_entry.createdAt`, posée quand le paiement passe en `success`). Les crédits MTN et Airtel en direct sont retirables tout de suite.

Constante dans `src/lib/money.ts` : `NYOLE_HOLD_DAYS = 14`.

### Fonction pure

Dans `src/lib/money.ts` :

```ts
type BalanceEntry = {
  entryType: 'credit' | 'debit' | 'fee' | 'withdrawal';
  amount: number;
  createdAt: Date;
  paymentId: string | null;
  held: boolean; // crédit d’un paiement Nyole
};

function withdrawableBalance(
  entries: BalanceEntry[],
  reserved: number,
  now: Date,
  holdDays: number
): { available: number; held: number; nextReleaseAt: Date | null };
```

1. `total` = somme des `credit` moins somme des `debit`, `fee` et `withdrawal`.
2. Un crédit est **bloqué** si `held` est vrai, si `createdAt + holdDays jours > now`, et si aucune écriture `debit` ne porte le même `paymentId`. Un paiement remboursé est déjà retiré du total par son débit : il ne compte pas une seconde fois dans le bloqué.
3. `held` = somme des crédits bloqués.
4. `available` = `max(0, total − held − reserved)`.
5. `nextReleaseAt` = la plus petite date `createdAt + holdDays jours` parmi les crédits bloqués, ou `null` s’il n’y en a pas.

`ledgerBalance` est remplacé par une lecture qui joint `ledger_entry.paymentId` à `payment.provider` et passe les lignes à `withdrawableBalance`. Aucune migration.

### Retrait

- `getWithdrawalPage` renvoie `available`, `held` et `nextReleaseAt`.
- `requestWithdrawal` refuse un montant supérieur à `available` (`invalid-amount`, comme aujourd’hui).
- La page `/personalities/[slug]/withdrawals` affiche « Disponible : X FCFA ». Si `held > 0`, elle ajoute « En attente : Y FCFA. Les dons par Nyole sont disponibles 14 jours après leur réception. Prochain déblocage le JJ/MM. »

## 2. Plafonds

Dans `src/lib/money.ts` :

| Constante | Valeur | S’applique à |
| --- | --- | --- |
| `MAX_SUPPORT_AMOUNT` | 50 000 (au lieu de 2 000 000) | don ponctuel et don mensuel |
| `MAX_WITHDRAWAL_AMOUNT` | 250 000 (nouveau) | chaque demande de retrait |

- `src/server/api/schemas/support.ts` : le `grossAmount` du retrait passe de `.max(MAX_SUPPORT_AMOUNT)` à `.max(MAX_WITHDRAWAL_AMOUNT)`.
- `requestWithdrawal` vérifie aussi `grossAmount <= MAX_WITHDRAWAL_AMOUNT`.
- `request-withdrawal.tsx` refuse un montant supérieur à `MAX_WITHDRAWAL_AMOUNT` avec : « Un retrait ne peut pas dépasser 250 000 FCFA pendant la bêta. » Le montant affiché vient de `formatFcfa(MAX_WITHDRAWAL_AMOUNT)`.
- `create-support.tsx` et `/support/[slug]` utilisent déjà `MAX_SUPPORT_AMOUNT`. Le message d’erreur du formulaire de don indique le plafond avec `formatFcfa`.
- Les plans mensuels actifs dont le montant dépasse 50 000 ne sont pas modifiés : le plafond vaut pour les nouveaux dons. Le renouvellement d’un plan existant n’est pas revalidé.
- Le montant cible d’un objectif n’est pas plafonné.

## 3. Offre fondateur

### Données

Migration : `link.founder_since timestamp with time zone`, nullable. `null` : pas fondateur.

### Administration

- Sur `/admin/personalities/[id]`, un bouton à côté de `VerificationToggle` : « Marquer fondateur » ou « Retirer le statut fondateur ».
- Procédure `admin.setFounder`, sur le modèle de `admin.setVerification`. Elle appelle `setPersonalityFounder({ personalityId, founder })` dans `src/server/db/utils/personality.ts`, à côté de `setPersonalityVerification`, avec les mêmes contrôles (fiche `active`, sinon `not-found`). `true` enregistre `now()` si `founderSince` est `null`, sinon ne change rien. `false` remet `null`.
- Ce qui suit la mise à jour de la vérification (cache de fiche, rafraîchissement de la page admin) est repris tel quel.
- La page admin affiche « Fondateur depuis le JJ/MM/AAAA, 0 % jusqu’au JJ/MM/AAAA » quand la date est posée.

### Commission

Fonctions pures dans `src/lib/money.ts` :

- `FOUNDER_FREE_MONTHS = 6`.
- `founderOfferEndsAt(founderSince: Date): Date` : `founderSince` plus 6 mois calendaires, en UTC. Si le jour n’existe pas dans le mois d’arrivée, on prend le dernier jour de ce mois (31 août donne 28 ou 29 février).
- `commissionBpsFor(founderSince: Date | null, now: Date, defaultBps: number): number` : 0 si `founderSince` n’est pas `null` et `now < founderOfferEndsAt(founderSince)`, sinon `defaultBps`.

`getWithdrawalPage` et `requestWithdrawal` utilisent `commissionBpsFor(link.founderSince, new Date(), supportCommissionBps())`. Le taux reste figé dans `withdrawal.commissionBps` à la demande. Un retrait déjà demandé garde son taux, même si le statut fondateur change ensuite.

La page de retrait affiche « Commission : 0 % jusqu’au JJ/MM/AAAA (offre fondateur). » pendant l’offre, et « Commission : 10 %. » sinon.

### Badge

- Le badge « Fondateur » est affiché tant que `founderSince` n’est pas `null`, même après la fin des 6 mois.
- Sur la fiche publique, dans `profile-hero.tsx`, après le badge vérifié. C’est une pastille texte « Fondateur », avec une infobulle : « Parmi les premiers créateurs d’AuraSpot. »
- Le badge ne s’affiche pas ailleurs (annuaire, carte de partage, QR).

## 4. Tests

`bun test`, à côté du code, dans `src/lib/money.test.ts` :

- `withdrawableBalance` : crédit MTN disponible tout de suite ; crédit Nyole de 13 jours bloqué ; crédit Nyole de 14 jours disponible ; crédit Nyole remboursé non compté deux fois ; frais et retraits soustraits ; `reserved` soustrait ; `available` jamais négatif ; `nextReleaseAt` est le plus proche déblocage, ou `null`.
- `founderOfferEndsAt` : 6 octobre donne 6 avril ; 31 août donne le dernier jour de février.
- `commissionBpsFor` : `null` donne le taux par défaut ; pendant l’offre, 0 ; le jour de fin, le taux par défaut.
- Schéma de retrait (`withdrawal.test.ts`) : 250 000 accepté, 250 001 refusé.
- Schéma de don : 50 000 accepté, 50 001 refusé.

Vérifications manuelles :

- don Nyole réussi : le montant apparaît « En attente » avec sa date de déblocage ;
- don MTN réussi : le montant est disponible tout de suite ;
- retrait de 300 000 refusé avec le message de plafond ;
- marquer une fiche fondateur : badge sur la fiche, commission à 0 % sur la page de retrait, retrait demandé avec `commissionBps = 0` ;
- retirer le statut : badge absent, commission par défaut.

## Hors périmètre

- Distinguer la carte du Mobile Money chez Nyole.
- Plafond par jour ou par mois.
- Parrainage et ses 3 mois sans commission.
- Clés de production, alertes, sauvegardes.
- Consentement des fiches publiées par le script de seed.
- Retirer les plafonds après la bêta : il suffira de changer les constantes.
