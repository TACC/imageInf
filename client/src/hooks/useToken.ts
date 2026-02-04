import { useQuery } from '@tanstack/react-query';
import { useConfig } from './useConfig';
import { jwtDecode } from 'jwt-decode';
import type { TokenInfo } from '../types/token';
import { isInIframe } from '../utils/iframe.ts';

interface TapisJwtPayload {
  tenant_id: string;
  sub: string;
  iss: string;
  exp: number;
  iat: number;
  jti: string;
}

const getHostFromIss = (iss: string): string => {
  try {
    const url = new URL(iss);
    return url.hostname;
  } catch {
    throw new Error('Invalid ISS URL in token');
  }
};

const fetchTokenFromPortalUsingCookie = async (): Promise<string | null> => {
  if (!isInIframe()) {
    return null;
  }

  try {
    // Since we're on the same domain (via an iframe), use relative path
    // The cookie will be sent automatically with credentials: 'include'
    const response = await fetch('/api/auth/tapis/', {
      credentials: 'include',
    });

    if (!response.ok) {
      console.warn('Failed to fetch token from portal:', response.status);
      return null;
    }

    const data = await response.json();
    return data.token || null;
  } catch (error) {
    console.warn('Failed to fetch token from portal:', error);
    return null;
  }
};

const validateTokenAndGetHost = async (token: string, fallbackHost: string): Promise<TokenInfo> => {
  try {
    // Decode JWT to get tenant and host
    const decodedToken = jwtDecode<TapisJwtPayload>(token);
    const tapisHost = `https://${getHostFromIss(decodedToken.iss)}`;

    // Check if token is expired
    const now = Date.now() / 1000;
    if (decodedToken.exp < now) {
      console.warn('Token is expired');

      // Clear any stale sessionStorage
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('expires_at');

      return {
        token: '',
        tapisHost: fallbackHost,
        isValid: false,
      };
    }

    // Validate token with API
    const response = await fetch(`${tapisHost}/v3/oauth2/userinfo`, {
      headers: {
        'X-Tapis-Token': token,
      },
    });

    if (!response.ok) {
      console.warn('Token validation failed:', response.status);

      // Clear any stale sessionStorage
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('expires_at');
      return {
        token: '',
        tapisHost: fallbackHost,
        isValid: false,
      };
    }

    return {
      token,
      tapisHost,
      isValid: true,
    };
  } catch (error) {
    console.error('Token missing or validation error:', error);
    return {
      token: '',
      tapisHost: fallbackHost,
      isValid: false,
    };
  }
};

const getToken = async (fallbackHost: string): Promise<TokenInfo> => {
  // First, try to get token from parent portal (if in iframe)
  const tokenFromCorePortal = await fetchTokenFromPortalUsingCookie();

  if (tokenFromCorePortal) {
    // Validate the portal token
    return validateTokenAndGetHost(tokenFromCorePortal, fallbackHost);
  }

  // Use sessionStorage (direct access, not in iframe scenario)
  const token = sessionStorage.getItem('access_token');
  const expiresAt = sessionStorage.getItem('expires_at');

  if (!token || !expiresAt || Date.now() > parseInt(expiresAt)) {
    return {
      token: '',
      tapisHost: fallbackHost,
      isValid: false,
    };
  }

  return validateTokenAndGetHost(token, fallbackHost);
};

/**
 * Manages the user's Tapis auth token via React Query.
 *
 * staleTime (5 min) ensures the backend middleware gets regular
 * opportunities to refresh tokens before expiry (backend has 10
 * min threshold).
 *
 * Retry disabled since auth failures require login, not retries.
 */
export const useToken = () => {
  const config = useConfig();

  return useQuery({
    queryKey: ['token'],
    queryFn: () => getToken(config.host),
    retry: false,
    refetchOnWindowFocus: true,
    staleTime: 5 * 60 * 1000 /* 5min */,
  });
};
