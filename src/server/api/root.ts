import { adminRouter } from '@/server/api/routers/admin';
import { aiRouter } from '@/server/api/routers/ai';
import { personalityRouter } from '@/server/api/routers/personality';
import { profileLinkRouter } from '@/server/api/routers/profile-link';
import { supportRouter } from '@/server/api/routers/support';
import { userRouter } from '@/server/api/routers/user';
import { createTRPCRouter } from '@/server/api/trpc';

export const appRouter = createTRPCRouter({
  user: userRouter,
  profileLink: profileLinkRouter,
  personality: personalityRouter,
  admin: adminRouter,
  support: supportRouter,
  ai: aiRouter,
});

export type AppRouter = typeof appRouter;
