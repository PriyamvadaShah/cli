// src/plugins/types.ts
export type PluginHook = (...args: any[]) => Promise<any> | any;

export interface PluginHooks {
  [hookName: string]: PluginHook;
}

export interface AsyncAPIPlugin {
  name: string;
  version: string;
  description?: string;
  author?: string;
  
  // Lifecycle methods
  register(): void;
  initialize?(): Promise<void>;
  cleanup?(): Promise<void>;
  
  // Extension points (hooks)
  hooks?: PluginHooks;
}

// Extension point definitions
export enum ExtensionPoints {
  CLI_START = 'cli:start',
  CLI_EXIT = 'cli:exit',
  VALIDATE_BEFORE = 'validate:before',
  VALIDATE_AFTER = 'validate:after',
  GENERATE_BEFORE = 'generate:before',
  GENERATE_AFTER = 'generate:after',
  // Add more extension points as needed
}

// Plugin configuration from user config
export interface PluginConfig {
  enabled: boolean;
  options?: Record<string, any>;
}

export interface PluginsConfig {
  [pluginName: string]: PluginConfig;
}
