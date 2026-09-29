import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import { db } from '@/server/db/db';
import { user as userTable } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import * as z from 'zod';

export const userRouter = createTRPCRouter({
  me: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.user.findFirst({
      where: (user, { eq }) => eq(user.id, ctx.user.id),
    });
  }),

  updateEmailDigest: protectedProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .update(userTable)
        .set({ emailDigest: input.enabled })
        .where(eq(userTable.id, ctx.user.id));
      return { emailDigest: input.enabled };
    }),
});
