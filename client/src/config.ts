export const Environment = {
  Local: 'local',
  Prod: 'prod',
  Pprd: 'pprd',
};

export type Environment = 'local' | 'prod' | 'pprd';

interface Config {
  clientId: string;
  host: string;
}

const LocalConfig: Config = {
  clientId: 'imageinf.localdev',
  host: 'http://localhost:8080',
};

const ProdConfig: Config = {
  clientId: 'imageinf.prod',
  host: 'https://prod.imageinf-service.tacc.utexas.edu',
};

const PprdConfig: Config = {
  clientId: 'imageinf.pprd',
  host: 'https://pprd.imageinf-service.tacc.utexas.edu',
};

const configs = {
  [Environment.Local]: LocalConfig,
  [Environment.Prod]: ProdConfig,
  [Environment.Pprd]: PprdConfig,
};

export default configs;
