'use client';

import { useEffect } from 'react';
import { initCsrfToken } from '@/utils/csrfToken';

/**
 * CsrfLoader — Invisible client component that fetches a CSRF token
 * from the server once on initial page load and stores it in the
 * module-level variable in csrfToken.js.
 *
 * Must be rendered inside the root layout so it runs on every page.
 * Has no visible output — renders nothing.
 */
export default function CsrfLoader() {
  useEffect(() => {
    initCsrfToken();
  }, []);

  return null;
}
