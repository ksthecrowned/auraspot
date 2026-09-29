'use server';

import { env } from '@/env.mjs';
import { ROOT_DOMAIN, SITE_NAME } from '@/lib/site';
import type { ReactElement } from 'react';
import { Resend } from 'resend';

const resend = new Resend(env.RESEND_API_KEY);

export interface Email {
  react: ReactElement;
  subject: string;
  to: string[];
  from?: string;
}

export const sendEmail = async (email: Email) => {
  return await resend.emails.send({
    from: env.EMAIL_FROM ?? `${SITE_NAME} <hello@${ROOT_DOMAIN}>`,
    ...email,
  });
};
