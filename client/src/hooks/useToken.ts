import { useQuery } from '@tanstack/react-query';
import { useConfig } from './useConfig';
import { jwtDecode } from 'jwt-decode';

interface TokenInfo {
  token: string;
  tapisHost: string;
  isValid: boolean;
}

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

const isInIframe = (): boolean => {
  return window.self !== window.top;
};

const fetchTokenFromPortal = async (): Promise<string | null> => {
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
    console.error('Token validation error:', error);
    return {
      token: '',
      tapisHost: fallbackHost,
      isValid: false,
    };
  }
};

const getToken = async (fallbackHost: string): Promise<TokenInfo> => {
  // First, try to get token from parent portal (if in iframe)
  const tokenFromCorePortal = await fetchTokenFromPortal();
  
  if (tokenFromCorePortal) {
    // Validate the portal token
    const result = await validateTokenAndGetHost(tokenFromCorePortal, fallbackHost);
    if (result.isValid) {
      // Store in sessionStorage for subsequent requests
      sessionStorage.setItem('access_token', tokenFromCorePortal);

      // Extract expiry from JWT
      try {
        const decoded = jwtDecode<TapisJwtPayload>(tokenFromCorePortal);
        sessionStorage.setItem('expires_at', (decoded.exp * 1000).toString());
      } catch {
        console.warn('Failed to decode JWT for expiry');
        // Fallback to 1 hour
        sessionStorage.setItem('expires_at', (Date.now() + 3600000).toString());
      }

      return result;
    }
  }

  // Fall back to sessionStorage (for direct access or cached token)
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

export const useToken = () => {
  const config = useConfig();

  return useQuery({
    queryKey: ['token'],
    queryFn: () => getToken(config.host),
    retry: false,
    refetchOnWindowFocus: false,
  });
};