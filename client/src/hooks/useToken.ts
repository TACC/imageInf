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
  return window.location !== window.parent.location;
};

const getParentUrl = (): string | null => {
  if (!isInIframe()) {
    return null;
  }

  // Try to get parent URL from referrer
  if (document.referrer) {
    try {
      return new URL(document.referrer).origin;
    } catch {
      return null;
    }
  }
  
  return null;
};

const fetchTokenFromPortal = async (): Promise<string | null> => {
  const parentUrl = getParentUrl();
  debugger;
  // TODO DROP
  return "eyJhbGciOiJSUzI1NiIsImtpZCI6Imd5YU5uVXJJZGxsYkhkWU5vWEpoRE85NTZDa0pkbWdybURPSDJNZHNnclkiLCJ0eXAiOiJKV1QifQ.eyJqdGkiOiI3OTQwNDQ3ZS02ZDZkLTQ5Y2UtODdkYS0zODkzNzY2ZjQxYWEiLCJpc3MiOiJodHRwczovL3BvcnRhbHMudGFwaXMuaW8vdjMvdG9rZW5zIiwic3ViIjoibmF0aGFuZkBwb3J0YWxzIiwidGFwaXMvdGVuYW50X2lkIjoicG9ydGFscyIsInRhcGlzL3Rva2VuX3R5cGUiOiJhY2Nlc3MiLCJ0YXBpcy9kZWxlZ2F0aW9uIjpmYWxzZSwidGFwaXMvZGVsZWdhdGlvbl9zdWIiOm51bGwsInRhcGlzL3VzZXJuYW1lIjoibmF0aGFuZiIsInRhcGlzL2FjY291bnRfdHlwZSI6InVzZXIiLCJleHAiOjE3NjEzMzI4ODksInRhcGlzL2NsaWVudF9pZCI6IlBST0QuRlJPTlRFUkEiLCJ0YXBpcy9ncmFudF90eXBlIjoiYXV0aG9yaXphdGlvbl9jb2RlIiwidGFwaXMvcmVkaXJlY3RfdXJpIjoiaHR0cHM6Ly9mcm9udGVyYS1wb3J0YWwudGFjYy51dGV4YXMuZWR1L2F1dGgvdGFwaXMvY2FsbGJhY2svIiwidGFwaXMvcmVmcmVzaF9jb3VudCI6MH0.tYZK6lhKikO1iuOD6rIgcJO9okP93gAd0qSgxUNjcNZTeRcGNw4s64HEUNEvdga6z4nYoGwxBq6AU8lAbjk91CWsvXrCLAEZQXvbSROW_yBqVPpdlrPK4Nmww1YTZB2wkLbUJB-cYQBywvMHO29vPqrRoT0WyAm9Yygmd2c6KUS1Y4Wl3KHSJ4jWDVpOQpwcmh3TZSKBDr1x1nYWtnuppNr2AWkQ7ZKIPpU_fQ3NmRBs4_MuDuWVpRFaKNm2s1V-mSrK4Fd9yDQMjSKH0PRiDnJBdgasfi0R2Q29cJBsUAT0UJC1Y4XDvgsUSfL7KK2q6JCcn0dxGt48Q1to85ohtA";

  if (!parentUrl) {
    return null;
  }

  try {
    const response = await fetch(`${parentUrl}/auth/tapis/`, {
      credentials: 'include',
    });

    if (!response.ok) {
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

    // Check user info to confirm valid token
    const response = await fetch(`${tapisHost}/v3/oauth2/userinfo`, {
      headers: {
        'X-Tapis-Token': token,
      },
    });

    if (!response.ok) {
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
  } catch {
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
      sessionStorage.setItem('access_token', tokenFromCorePortal);
      // TODO 1 hr from now. but should be derived from JWT
      sessionStorage.setItem('expires_at', (Date.now() + 3600000).toString());
      return result;
    }
  }

  // Fall back to sessionStorage (in case already logged)
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