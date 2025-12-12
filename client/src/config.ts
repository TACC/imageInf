export const ImageInfEnvironment = {
  Local: 'local',
  Prod: 'prod',
  Pprd: 'pprd',
  Unknown: 'unknown',
};

export type ImageInfEnvironment = (typeof ImageInfEnvironment)[keyof typeof ImageInfEnvironment];

interface Config {
  clientId: string;
  host: string;
}

const LocalConfig: Config = {
  clientId: 'imageinf.localdev.ui',
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

const UnknownConfig: Config = {
  clientId: 'imageinf.pprd',
  host: 'https://pprd.imageinf-service.tacc.utexas.edu',
};

const configs = {
  [ImageInfEnvironment.Local]: LocalConfig,
  [ImageInfEnvironment.Prod]: ProdConfig,
  [ImageInfEnvironment.Pprd]: PprdConfig,
  [ImageInfEnvironment.Unknown]: UnknownConfig,
};

export default configs;
