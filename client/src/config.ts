export enum Environment {
  Local = 'local',
  Prod = 'prod',
  Pprd = 'pprd',
}

interface Config {
  clientId: string;
  host: string;
}

const LocalConfig: Config = {
  clientId: 'imageinf.localdev',
  host: 'localhost:8080',
};

const ProdConfig: Config = {
  clientId: 'imageinf.prod',
  host: 'prod.imageinf-service.tacc.utexas.edu',
};

const PprdConfig: Config = {
  clientId: 'imageinf.pprd',
  host: 'pprd.imageinf-service.tacc.utexas.edu',
};

const configs = {
  [Environment.Local]: LocalConfig,
  [Environment.Prod]: ProdConfig,
  [Environment.Pprd]: PprdConfig,
} as const;

export default configs;
