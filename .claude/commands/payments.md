# Paiements

## Fichiers

- Démarrage : `src/server/payments/provider.ts` (`CheckoutProvider`, prestataire `sandbox`)
- Mobile money : `src/server/payments/mobile-money.ts`
- Nyole : `src/server/payments/nyole.ts`
- Transitions : `src/server/payments/transitions.ts` (`canTransition`)
- Statut : `syncPayment` dans `src/server/db/utils/support.ts`
- Webhooks : `src/app/api/webhook/momo/route.ts`, `airtel`, `nyole`, `payments`, `payouts`

## Ajouter un prestataire

1. Le paiement naît en `sandbox` via `getCheckoutProvider()`. Le donateur choisit ensuite l'opérateur.
2. Implémenter l'appel (session ou request-to-pay) à côté de `nyole.ts` ou `mobile-money.ts`.
3. Relire le statut final dans `syncPayment`. Le corps du webhook et le retour `success_url` ne créditent rien.
4. Autoriser le changement de statut dans `canTransition`.
5. Webhook signé : vérifier la signature, puis appeler `syncPayment` pour le paiement nommé. L'appel est idempotent.
6. Tests sur le modèle de `src/server/payments/nyole.test.ts` : `mock.module('@/env.mjs', …)` avant l'import du prestataire, `fetch` remplacé, timeout et signature couverts.
