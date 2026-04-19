import type { Connection, ConnectionInput, ConnectionTestResult, Workspace } from '@core/types';

export interface OsdApi {
  connection: {
    add: (input: ConnectionInput) => Promise<Connection>;
    update: (id: string, input: ConnectionInput) => Promise<Connection>;
    delete: (id: string) => Promise<void>;
    list: () => Promise<Connection[]>;
    test: (input: ConnectionInput) => Promise<ConnectionTestResult>;
  };
  workspace: {
    list: () => Promise<Workspace[]>;
    create: (name: string) => Promise<Workspace>;
  };
  settings: {
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string) => Promise<void>;
  };
  credentials: {
    save: (key: string, value: string) => Promise<boolean>;
    load: (key: string) => Promise<string | null>;
  };
}

declare global {
  interface Window {
    osd: OsdApi;
  }
}
