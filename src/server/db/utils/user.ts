export const isUserPremium = (_user: {
  plan: string;
  subscriptionEndsAt?: Date | null;
  trialEndsAt?: Date | null;
}) => {
  return true;
};

export const isBusinessPlan = (_user: {
  plan: string;
  subscriptionEndsAt?: Date | null;
}) => {
  return true;
};

export const getLinkLimit = (_plan: string): number => {
  return Number.POSITIVE_INFINITY;
};

export const getAiCreditLimit = (_plan: string): number => {
  return 1_000_000;
};
