# Paiements via Nyole — conception

Date : 2026-09-30
Statut : validée en conversation, en attente de relecture

## Objectif

Ajouter [Nyole](https://nyole.com) comme second moyen d'encaisser les dons, à
côté de l'intégration directe MTN MoMo / Airtel Money qui reste en place. Nyole
apporte la carte bancaire (Visa / Mastercard) et un second chemin pour le Mobile
Money, en XAF, au Congo-Brazzaville.

## Décisions prises

- **Les deux coexistent.** Sur la page de paiement, le donateur choisit :
  MTN MoMo direct, Airtel Money direct, ou « Carte ou Mobile Money via Nyole ».
- **AuraSpot absorbe les 5 % de Nyole.** La personnalité est créditée du montant
  complet du don ; aucune écriture de frais dans le ledger.
- Les moyens proposés sur la page Nyole (Airtel, MTN, carte) se règlent dans le
  tableau de bord Nyole, pas par l'API.

## Ce que Nyole offre (docs consultées le 2026-09-30)

- **Session de paiement hébergée** : `POST https://app.nyole.com/api/v1/checkout/sessions`,
  `Authorization: Bearer af_(live|test)_sec_...`, en-tête `Idempotency-Key`
  optionnel (même clé → même session).
  Champs utilisés : `amount` (entier), `currency`, `description`,
  `success_url`, `cancel_url`, `metadata`, `merchant_name`, `customer_email`.
  Réponse 201 : `id`, `url`, `status: "pending"`, `livemode`.
- **Statut** : `GET /api/v1/checkout/sessions/{id}/status` →
  `status` ∈ `PENDING | SUCCESS | FAILED | CANCELLED | REFUNDED`, `paid`,
  `amount`, `currency`, `provider_reference`.
- **Webhook** : en-têtes `X-Afriflow-Timestamp` et
  `X-Afriflow-Signature: t=<ts>,v1=<hex>` ; `v1 = HMAC-SHA256(secret, "<ts>.<corps brut>")`
  avec la clé secrète ; rejet au-delà de 5 minutes ; réponse 200 attendue ;
  livraisons possibles en double (10 essais sur 72 h). Événement :
  `payment.completed`, `data.metadata` renvoyé.
- **Mode test** : clés `af_test_...`, aucun argent ne bouge ;
  `POST /api/checkout/sandbox` (sans clé) simule le résultat d'une session test.
- **Pas d'API de reversement vers des tiers** : seul le marchand retire son
  solde, vers un numéro Mobile Money à son nom, sous 24–48 h.

## Parcours

1. Le don crée un `payment` avec `provider = 'sandbox'` (inchangé).
2. Sur `/support/checkout/[paymentId]`, l'option Nyole n'apparaît que si
   `NYOLE_SECRET_KEY` est défini.
3. Choix de Nyole → mutation `support.payWithNyole` :
   - réserve le paiement : `provider 'sandbox' → 'nyole'`, seulement s'il est
     encore `sandbox` et `pending` (même garde que MoMo) ;
   - crée la session avec `amount`, `currency: 'XAF'`,
     `Idempotency-Key: <paymentId>`, `metadata: { payment_id }`,
     `success_url` et `cancel_url` = `<SITE_URL>/support/checkout/<paymentId>`,
     `description: 'Don AuraSpot'`, `merchant_name: 'AuraSpot'` ;
   - enregistre `providerReference = session.id` ; l'URL de reprise se
     déduit de l'identifiant (`<NYOLE_CHECKOUT_BASE>/checkout/<id>`, soit
     `https://app.nyole.com/checkout/<id>`), donc aucune colonne à ajouter ;
   - renvoie `url` ; le client redirige.
   - Échec de création de session → le paiement passe `failed` (comme un refus
     opérateur) et l'erreur est affichée.
   - Si la réservation a déjà eu lieu (double clic) et que la session existe,
     on renvoie son `url` au lieu d'une erreur.
4. Retour sur la page de paiement : le polling existant (`syncCheckout`)
   appelle `syncPayment`, qui interroge Nyole pour un paiement `nyole`.
   Correspondance : `SUCCESS→success`, `FAILED→failed`,
   `CANCELLED→cancelled`, `REFUNDED→refunded`, `PENDING→pending`.
   Seul le serveur valide : l'arrivée sur `success_url` ne crédite rien.
5. Paiement Nyole encore `pending` : la page propose
   « Reprendre le paiement sur Nyole » (lien de session) ou
   « Faire un nouveau don ». Pas de bascule vers MoMo/Airtel direct sur le
   même paiement.

## Webhook `/api/webhook/nyole`

- Lit le corps **brut** (`request.text()`), vérifie la signature (comparaison
  en temps constant, fenêtre de 5 minutes). Invalide → 401.
- Extrait l'identifiant de session du corps, puis applique le statut **relu
  par l'API** (`syncPayment({ providerReference })`), comme pour MoMo/Airtel.
- Répond 200 dans tous les cas valides, y compris doublon ou paiement inconnu,
  pour que Nyole arrête de réessayer.
- Identifiant d'événement pour l'idempotence : `nyole:<sessionId>:<status>`
  (même convention que les opérateurs directs).

## Dons mensuels

Aucun changement dans `renewPlan`. Le push USSD de renouvellement n'est tenté
que si le dernier paiement réussi était MTN/Airtel direct (seul cas où
`payerOperator` / `payerPhone` sont enregistrés). Payé via Nyole → le
renouvellement part par email avec le lien de paiement, où le donateur choisit
de nouveau son moyen.

## Paiements expirés et paiement tardif

- `closeStalePendingPayments` passe par `syncPayment`, donc interroge aussi
  Nyole avant de clore un paiement vieux de plus de 3 jours.
- Une session Nyole ne peut pas être annulée par API : un paiement tardif sur
  un paiement déjà clos est possible. `applyPaymentEvent` accepte donc
  `cancelled → success` **uniquement pour `provider = 'nyole'`** : le ledger
  est crédité, le don mensuel associé n'est pas modifié.

## Retraits

Aucun changement de code. Le ledger reste unique quelle que soit la
provenance. Les fonds Nyole se retirent depuis le tableau de bord Nyole ; les
versements aux personnalités suivent le processus actuel
(`/api/webhook/payouts`).

## Fichiers

- `src/server/payments/nyole.ts` (nouveau) : configuration, `createSession`,
  `getSessionStatus`, `verifyWebhookSignature`, `toPaymentStatus`.
- `src/server/db/utils/support.ts` : `startNyolePayment` ;
  `syncMobileMoneyPayment` renommé `syncPayment` et étendu à Nyole ;
  transition `cancelled → success` pour Nyole.
- `src/server/db/utils/recurring.ts` : utilise `syncPayment`.
- `src/server/api/routers/support.ts`, `src/server/api/schemas/support.ts` :
  mutation `payWithNyole` ; `checkout` expose `provider` et, pour Nyole,
  l'URL de reprise.
- `src/components/forms/mobile-money-checkout.tsx` : option Nyole, état
  « Reprendre sur Nyole ».
- `src/app/api/webhook/nyole/route.ts` (nouveau).
- `src/env.mjs`, `.env.example` : `NYOLE_SECRET_KEY`, `NYOLE_BASE_URL`
  (optionnel, défaut `https://app.nyole.com` ; les chemins `/api/v1/...`,
  `/checkout/<id>` et `/api/checkout/sandbox` en dérivent).
- Aucune migration : `provider` est un texte libre et reçoit `'nyole'`.

## Tests

- Unitaires (`bun test`) : signature valide / fausse / horodatage périmé /
  corps modifié ; correspondance des statuts ; `cancelled → success` accepté
  pour Nyole, refusé pour MoMo.
- Bout en bout en mode test : don → Nyole → `/api/checkout/sandbox` succès →
  paiement `success`, ledger crédité, page confirmée ; idem échec.
- Webhook en local : requête signée construite à la main vers la route.

## Hors périmètre

- Reversements automatiques via Nyole (pas d'API).
- Frais répercutés sur le donateur.
- Changement de moyen de paiement après avoir choisi Nyole.
