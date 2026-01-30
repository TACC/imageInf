export const ImageInfEnvironment = {
  Local: 'local',
  Prod: 'prod',
  Pprd: 'pprd',
  ProdTmp: 'prodTmp',
  PprdTmp: 'pprdTmp',
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
  clientId: 'imageinf.prod.ui',
  host: 'https://prod.imageinf-service.tacc.utexas.edu',
};

const PprdConfig: Config = {
  clientId: 'imageinf.pprd.ui',
  host: 'https://pprd.imageinf-service.tacc.utexas.edu',
};

const ProdTmpConfig: Config = {
  clientId: 'imageinf.tmp.prod.ui',
  host: 'https://prod.imageinf-service-tmp.tacc.utexas.edu',
};

const PprdTmpConfig: Config = {
  clientId: 'imageinf.tmp.pprd.ui',
  host: 'https://pprd.imageinf-service-tmp.tacc.utexas.edu',
};

const UnknownConfig: Config = {
  clientId: 'imageinf.tmp.pprd.ui',
  host: 'https://pprd.imageinf-service.tacc.utexas.edu',
};

const configs = {
  [ImageInfEnvironment.Local]: LocalConfig,
  [ImageInfEnvironment.Prod]: ProdConfig,
  [ImageInfEnvironment.Pprd]: PprdConfig,
  [ImageInfEnvironment.ProdTmp]: ProdTmpConfig,
  [ImageInfEnvironment.PprdTmp]: PprdTmpConfig,
  [ImageInfEnvironment.Unknown]: UnknownConfig,
};

export default configs;
