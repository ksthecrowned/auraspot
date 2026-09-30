<p align="center">
  <img width="96" src="public/logo.png" alt="AuraSpot">
</p>

<h1 align="center">AuraSpot</h1>

<p align="center">
  <strong>Découvrez. Suivez. Soutenez.</strong><br>
  La plateforme pour découvrir des personnalités, suivre leurs réseaux officiels et les soutenir par des dons.
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/licence-AGPL--3.0-purple" alt="Licence AGPL-3.0"></a>
</p>

## Le produit

- **Annuaire** (`/explore`) : recherche par nom, catégorie et lieu.
- **Fiches personnalité** (`/{slug}`) : identité, badge vérifié, réseaux officiels, communauté de soutiens, et un espace de blocs personnalisables (vidéo, musique, compte à rebours, météo, carte…).
- **Dons** sans compte, uniques ou mensuels, en FCFA. Le montant n'est jamais public.
- **Revendication et vérification** des fiches, avec plusieurs gestionnaires possibles.
- **Retraits** avec commission prélevée au retrait, et **statistiques** de visite.
- **Administration** : fiches, catégories, revendications, paiements, retraits, signalements.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript · Bun · Tailwind CSS 4 · shadcn/ui · tRPC 11 · Drizzle ORM (PostgreSQL / Neon) · Better Auth · Upstash Redis · Cloudflare R2 · Resend · Biome.

## Démarrer en local

Prérequis : [Bun](https://bun.sh/) et PostgreSQL.

```bash
bun install
cp .env.example .env   # puis renseignez les variables
bun run db:push        # crée le schéma
bun dev                # http://localhost:3000
```

Une base PostgreSQL locale (`@localhost`) est détectée automatiquement. Sans Upstash, le cache et la limitation de débit fonctionnent en mémoire.

Commandes utiles :

```bash
bun run typecheck      # vérification TypeScript
bun run lint           # Biome
bun run build          # build de production
```

## Origine et licence

AuraSpot est dérivé d'**[OpenBio](https://github.com/vanxh/openbio)**, © vanxh et contributeurs, publié sous licence GNU AGPL-3.0. Il a été modifié et renommé par Kaiser D. Styve à partir de septembre 2026 (voir [`NOTICE`](NOTICE) et l'historique git).

AuraSpot est distribué sous la même licence, la **[GNU Affero General Public License v3.0](LICENSE)**. Si vous déployez une version modifiée accessible en ligne, vous devez en proposer le code source à ses utilisateurs.
