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

const validateToken = async (host: string): Promise<TokenInfo> => {
  const token = sessionStorage.getItem('access_token');
  const expiresAt = sessionStorage.getItem('expires_at');

  if (!token || !expiresAt || Date.now() > parseInt(expiresAt)) {
    return {
      token: '',
      tapisHost: host,
      isValid: false,
    };
  }

  try {
    // Decode JWT to get tenant and host
    const decodedToken = jwtDecode<TapisJwtPayload>(token);
    const tapisHost = `https://${getHostFromIss(decodedToken.iss)}`;

    // check user info to confirm valid token
    const response = await fetch(`${tapisHost}/v3/oauth2/userinfo`, {
      headers: {
        'X-Tapis-Token': token,
      },
    });

    if (!response.ok) {
      return {
        token: '',
        tapisHost,
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
      tapisHost: '',
      isValid: false,
    };
  }
};

export const useToken = () => {
  const config = useConfig();

  return useQuery({
    queryKey: ['token'],
    queryFn: () => validateToken(config.host),
    retry: false,
    refetchOnWindowFocus: false,
  });
};
