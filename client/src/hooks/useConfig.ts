import configs, { ImageInfEnvironment } from '../config';

/**
 * Auto-detect API base URL based on current location
 *
 * Examples:
 * - Direct: /imageinf/ui/ -> /imageinf/api
 * - Portal: /imageinf/ -> /imageinf/api
 * - Multi-env portal: /prod/imageinf/ -> /prod/imageinf/api
 */
export const getApiBaseUrl = () => {
  const pathname = window.location.pathname;
  // Find everything up to and including 'imageinf'
  const match = pathname.match(/^(.*?\/imageinf)/);

  if (match) {
    return `${match[1]}/api`;
  }

  console.error("Did not find /imageinf/ in pathname:", pathname);
  return '/api';  // fallback
};

export const API_BASE_URL = getApiBaseUrl();

const isInIframe = (): boolean => {
  return window.self !== window.top;
};

const getEnv = (): ImageInfEnvironment => {
  const hostname = window.location.hostname;

  if (hostname === 'localhost') return ImageInfEnvironment.Local;
  if (hostname === 'pprd.imageinf-service.tacc.utexas.edu') return ImageInfEnvironment.Pprd;
  if (hostname === 'prod.imageinf-service.tacc.utexas.edu') return ImageInfEnvironment.Prod;

  return ImageInfEnvironment.Unknown;
};

export const useConfig = () => {
  const env = getEnv();
  const config = configs[env];
  
  return {
    ...config,
    apiBasePath: API_BASE_URL,
    isInIframe: isInIframe(),
  };
};