'use client';

import { useEffect } from 'react';
import posthog from 'posthog-js';

export default function PostHogInit() {
  useEffect(() => {
    if (posthog.__loaded) return;
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      // Vercel Analytics already covers pageviews; PostHog here is only for
      // the custom engagement events (onboarding, tab/category/country
      // selection).
      capture_pageview: false,
      person_profiles: 'identified_only',
    });
  }, []);

  return null;
}
