import { useMemo } from 'react';
import configs, { Environment } from '../config';

const getEnvironment = (): Environment => {
  const hostname = window.location.hostname;

  switch (hostname) {
    case 'localhost':
      return Environment.Local;
    case 'pprd.imageinf-service.tacc.utexas.edu':
      return Environment.Pprd;
    case 'prod.imageinf-service.tacc.utexas.edu':
      return Environment.Prod;
    default:
      return Environment.Prod;
  }
};

export const useConfig = () => {
  return useMemo(() => {
    const env = getEnvironment();
    return configs[env];
  }, []);
};
