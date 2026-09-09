export const appConfig = {
  auth: {
    magicLinkTtlMinutes: 15,
    sessionTtlDays: 30,
    sessionSlidingRenewalDays: 7, // renew session if less than this many days remain
    maxMagicLinkRequestsPerHour: 5,
  },

  pagination: {
    defaultPageSize: 20,
    maxPageSize: 100,
  },

  rateLimit: {
    authWindowMinutes: 15,
    authMaxRequests: 5,
  },
} as const;