import { getMetadata } from '@/lib/metadata';
import { fetchMusicMetadata } from '@/lib/music';
import { fetchLimit, generalLimit, subscribeLimit } from '@/lib/ratelimit';
import { parseViewSource } from '@/lib/share-card';
import { PLATFORMS, normalizeSocialLinks } from '@/lib/social-platforms';
import { fetchTweet } from '@/lib/twitter';
import {
  addDomainToVercel,
  getDomainConfig,
  removeDomainFromVercel,
  verifyDomain,
} from '@/lib/vercel';
import {
  createRateLimitedProcedure,
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from '@/server/api/trpc';

const rateLimitedProcedure = createRateLimitedProcedure(generalLimit);
const rateLimitedSubscribe = createRateLimitedProcedure(subscribeLimit);
const rateLimitedFetch = createRateLimitedProcedure(fetchLimit);
import {
  addEmailSubscriber,
  addProfileLinkBento,
  assertCanEditProfileLink,
  canModifyProfileLink,
  countShareCardViews,
  createProfileLink,
  deleteProfileLink,
  deleteProfileLinkBento,
  getClicksOverTime,
  getDashboardProfileLinks,
  getDeviceBreakdown,
  getEmailSubscribers,
  getGeoBreakdown,
  getProfileDetails,
  getProfileLinkById,
  getProfileLinkByLink,
  getProfileLinkUniqueViews,
  getProfileLinkViews,
  getProfileLinkViewsSince,
  getTopCards,
  getTopReferrers,
  getTotalClicks,
  getViewsOverTime,
  isProfileLinkAvailable,
  isProfileLinkEditor,
  recordLinkClick,
  recordLinkView,
  updateProfileLink,
  updateProfileLinkBento,
} from '@/server/db';
import {
  getSupportersPreview,
  listVisibleDedications,
} from '@/server/db/utils/support';
import { resolveVideoUrl } from '@/server/video';
import type { LinkBento } from '@/types';
import { TRPCError } from '@trpc/server';
import { after } from 'next/server';
import * as z from 'zod';
import {
  CreateLinkBentoSchema,
  CreateLinkSchema,
  DeleteLinkBentoSchema,
  DeleteLinkSchema,
  GetByLinkSchema,
  GetLinkViewsSchema,
  LinkAvailableSchema,
  UpdateLinkBentoSchema,
  UpdateLinkDetailsSchema,
  UpdateLinkSchema,
} from '../schemas';

export const profileLinkRouter = createTRPCRouter({
  linkAvailable: publicProcedure
    .input(LinkAvailableSchema)
    .query(async ({ input }) => {
      return await isProfileLinkAvailable(input.link);
    }),

  create: protectedProcedure
    .input(CreateLinkSchema)
    .mutation(async ({ input, ctx }) => {
      const user = await ctx.db.query.user.findFirst({
        where: (u, { eq }) => eq(u.id, ctx.user.id),
        columns: { id: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const isAvailable = await isProfileLinkAvailable(input.link);
      if (!isAvailable) {
        throw new Error('This profile link is not available');
      }

      const bento = generateInitialBento(input);

      const profileLink = await createProfileLink({
        link: input.link,
        name: input.name || input.link,
        bio: input.bio || "I'm using AuraSpot!",
        bento,
        userId: user.id,
      });

      return profileLink;
    }),

  // Owned and managed profiles, for the dashboard.
  getAll: protectedProcedure.input(z.undefined()).query(({ ctx }) => {
    return getDashboardProfileLinks(ctx.user.id);
  }),

  getByLink: publicProcedure
    .input(GetByLinkSchema)
    .query(async ({ input, ctx }) => {
      const authedUserId = ctx.session?.user?.id;

      const profileLink = await getProfileLinkByLink(input.link);

      if (!profileLink) {
        return null;
      }

      let ip = ctx.req.headers.get('x-real-ip');
      const forwardedFor = ctx.req.headers.get('x-forwarded-for');
      if (!ip && forwardedFor) {
        ip = forwardedFor.split(',').at(0) ?? 'Unknown';
      }

      const country = ctx.req.headers.get('x-vercel-ip-country') ?? undefined;

      after(() =>
        recordLinkView(profileLink.id, {
          ip: ip ?? 'Unknown',
          userAgent: ctx.req.headers.get('user-agent') ?? 'Unknown',
          referrer: ctx.req.headers.get('referer') ?? undefined,
          country,
          source: parseViewSource(input.src),
        })
      );

      const canEdit = authedUserId
        ? await isProfileLinkEditor(authedUserId, profileLink)
        : false;

      const [details, supporters, dedications, monthlyViews] =
        await Promise.all([
          getProfileDetails(profileLink.id),
          getSupportersPreview(profileLink.id),
          listVisibleDedications(profileLink.id, { page: 1, pageSize: 1 }),
          canEdit
            ? getProfileLinkViewsSince(profileLink.id, 30)
            : Promise.resolve(undefined),
        ]);

      return {
        ...profileLink,
        ...details,
        supporters,
        dedications,
        ...(monthlyViews === undefined ? {} : { monthlyViews }),
        canEdit,
        isPremium: true,
      };
    }),

  getViews: publicProcedure
    .input(GetLinkViewsSchema)
    .query(async ({ input }) => {
      return await getProfileLinkViews(input.id);
    }),

  trackClick: rateLimitedProcedure
    .input(
      z.object({
        linkId: z.string(),
        bentoId: z.string(),
        href: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      let ip = ctx.req.headers.get('x-real-ip');
      const forwardedFor = ctx.req.headers.get('x-forwarded-for');
      if (!ip && forwardedFor) {
        ip = forwardedFor.split(',').at(0) ?? 'Unknown';
      }

      await recordLinkClick(input.linkId, {
        bentoId: input.bentoId,
        href: input.href,
        ip: ip ?? 'Unknown',
        userAgent: ctx.req.headers.get('user-agent') ?? 'Unknown',
        referrer: ctx.req.headers.get('referer') ?? undefined,
      });
    }),

  subscribe: rateLimitedSubscribe
    .input(
      z.object({
        linkId: z.string(),
        email: z.string().email(),
      })
    )
    .mutation(({ input }) => {
      return addEmailSubscriber(input.linkId, input.email);
    }),

  subscribers: protectedProcedure
    .input(z.object({ linkId: z.string() }))
    .query(async ({ input, ctx }) => {
      await assertCanEditProfileLink({
        userId: ctx.user.id,
        linkId: input.linkId,
      });
      return getEmailSubscribers(input.linkId);
    }),

  analytics: protectedProcedure
    .input(
      z.object({
        linkId: z.string(),
        days: z.number().min(1).max(90).default(30),
      })
    )
    .query(async ({ input, ctx }) => {
      await assertCanEditProfileLink({
        userId: ctx.user.id,
        linkId: input.linkId,
      });

      const [
        views,
        uniqueViews,
        clicks,
        viewsOverTime,
        clicksOverTime,
        topCards,
        topReferrers,
        deviceBreakdown,
        geoBreakdown,
        shareCardViews,
      ] = await Promise.all([
        getProfileLinkViews(input.linkId),
        getProfileLinkUniqueViews(input.linkId),
        getTotalClicks(input.linkId),
        getViewsOverTime(input.linkId, input.days),
        getClicksOverTime(input.linkId, input.days),
        getTopCards(input.linkId, input.days),
        getTopReferrers(input.linkId, input.days),
        getDeviceBreakdown(input.linkId, input.days),
        getGeoBreakdown(input.linkId, input.days),
        countShareCardViews(input.linkId, input.days),
      ]);

      return {
        views,
        uniqueViews,
        clicks,
        viewsOverTime,
        clicksOverTime,
        topCards,
        topReferrers,
        deviceBreakdown,
        geoBreakdown,
        shareCardViews,
      };
    }),

  checkDomain: protectedProcedure
    .input(z.object({ domain: z.string() }))
    .query(async ({ input }) => {
      const { domain } = input;

      const [config, verification] = await Promise.all([
        getDomainConfig(domain),
        verifyDomain(domain),
      ]);

      const isSubdomain = domain.split('.').length > 2;

      return {
        configured: config?.misconfigured === false,
        verified: verification?.verified ?? false,
        verification: verification?.verification ?? [],
        isSubdomain,
        // For subdomains: CNAME record with subdomain prefix
        // For root domains: A record with @ pointing to Vercel IP
        dns: isSubdomain
          ? {
              type: 'CNAME' as const,
              name: domain.split('.').slice(0, -2).join('.'),
              value: 'cname.vercel-dns.com',
            }
          : {
              type: 'A' as const,
              name: '@',
              value: '76.76.21.21',
            },
      };
    }),

  update: protectedProcedure
    .input(UpdateLinkSchema)
    .mutation(async ({ input, ctx }) => {
      const user = await ctx.db.query.user.findFirst({
        where: (u, { eq }) => eq(u.id, ctx.user.id),
        columns: { id: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      await assertCanEditProfileLink({
        userId: user.id,
        linkId: input.id,
      });

      if (input.customDomain !== undefined) {
        const existing = await getProfileLinkById(input.id);
        const oldDomain = existing?.customDomain;

        if (oldDomain && oldDomain !== input.customDomain) {
          await removeDomainFromVercel(oldDomain);
        }

        if (input.customDomain && input.customDomain !== oldDomain) {
          await addDomainToVercel(input.customDomain);
        }
      }

      return updateProfileLink(input);
    }),

  updateDetails: protectedProcedure
    .input(UpdateLinkDetailsSchema)
    .mutation(async ({ input, ctx }) => {
      await assertCanEditProfileLink({ userId: ctx.user.id, linkId: input.id });

      return updateProfileLink({
        id: input.id,
        categoryId: input.categoryId,
        location: input.location || null,
      });
    }),

  delete: protectedProcedure
    .input(DeleteLinkSchema)
    .mutation(async ({ input, ctx }) => {
      const user = await ctx.db.query.user.findFirst({
        where: (u, { eq }) => eq(u.id, ctx.user.id),
        columns: { id: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      await canModifyProfileLink({
        userId: user.id,
        link: input.link,
      });

      return deleteProfileLink(input.link);
    }),

  createBento: protectedProcedure
    .input(CreateLinkBentoSchema)
    .mutation(async ({ input, ctx }) => {
      const user = await ctx.db.query.user.findFirst({
        where: (u, { eq }) => eq(u.id, ctx.user.id),
        columns: { id: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      await assertCanEditProfileLink({
        userId: user.id,
        link: input.link,
      });

      return addProfileLinkBento(input.link, input.bento);
    }),

  deleteBento: protectedProcedure
    .input(DeleteLinkBentoSchema)
    .mutation(async ({ input, ctx }) => {
      const user = await ctx.db.query.user.findFirst({
        where: (u, { eq }) => eq(u.id, ctx.user.id),
        columns: { id: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      await assertCanEditProfileLink({
        userId: user.id,
        link: input.link,
      });

      return deleteProfileLinkBento(input.link, input.id);
    }),

  updateBento: protectedProcedure
    .input(UpdateLinkBentoSchema)
    .mutation(async ({ input, ctx }) => {
      const user = await ctx.db.query.user.findFirst({
        where: (u, { eq }) => eq(u.id, ctx.user.id),
        columns: { id: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      await assertCanEditProfileLink({
        userId: user.id,
        link: input.link,
      });

      return updateProfileLinkBento(input.link, input.bento);
    }),

  getMetadataOfURL: rateLimitedFetch
    .input(
      z.object({
        url: z.string(),
      })
    )
    .query(async ({ input }) => {
      return await getMetadata(input.url);
    }),

  getTweet: rateLimitedFetch
    .input(z.object({ tweetId: z.string() }))
    .query(async ({ input }) => {
      return await fetchTweet(input.tweetId);
    }),

  // Video block: a full YouTube/TikTok link, TikTok short links resolved.
  resolveVideoUrl: rateLimitedFetch
    .input(z.object({ url: z.string().trim().max(500) }))
    .mutation(async ({ input }) => {
      return { url: await resolveVideoUrl(input.url) };
    }),

  getMusicMetadata: rateLimitedFetch
    .input(z.object({ url: z.string() }))
    .query(async ({ input }) => {
      return await fetchMusicMetadata(input.url);
    }),
});

// One link block per social network given at signup, in order.
function generateInitialBento(input: z.infer<typeof CreateLinkSchema>) {
  const socials = normalizeSocialLinks(input.socials);
  if (!socials.ok) {
    const platform = input.socials[socials.index]?.platform;
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Le lien ${platform ? PLATFORMS[platform].label : ''} n’est pas valide.`,
    });
  }
  const bento: LinkBento[] = [];
  let position = { sm: { x: 0, y: 0 }, md: { x: 0, y: 0 } };
  for (const social of socials.links) {
    bento.push({
      id: crypto.randomUUID(),
      type: 'link',
      href: social.url,
      clicks: 0,
      size: { sm: '2x2', md: '2x2' },
      position,
    });
    position = getNextPosition(position);
  }
  return bento;
}

function getNextPosition(pos: {
  sm: { x: number; y: number };
  md: { x: number; y: number };
}) {
  return {
    sm: {
      x: pos.sm.x % 2 === 0 ? pos.sm.x + 1 : 0,
      y: pos.sm.x % 2 === 0 ? pos.sm.y + 1 : pos.sm.y,
    },
    md: {
      x: pos.md.x % 4 === 0 ? pos.md.x + 1 : 0,
      y: pos.md.x % 4 === 0 ? pos.md.y + 1 : pos.md.y,
    },
  };
}
