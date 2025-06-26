import configs, { Environment } from '../config';

const getEnv = (): Environment => {
  const hostname = window.location.hostname;
  if (hostname === 'localhost') return 'local';
  if (hostname === 'pprd.imageinf-service.tacc.utexas.edu') return 'pprd';
  if (hostname === 'prod.imageinf-service.tacc.utexas.edu') return 'prod';
  return 'prod';
};

export const useConfig = () => {
  const env = getEnv();
  return configs[env];
};
