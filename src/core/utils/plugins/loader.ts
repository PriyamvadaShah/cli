// src/plugins/loader.ts
import { promises as fs } from 'fs';
import path from 'path';
import { cosmiconfig } from 'cosmiconfig';
import { pluginRegistry } from './pluginRegistry';
import { AsyncAPIPlugin, PluginsConfig } from './types';

const MODULE_PREFIX = 'asyncapi-cli-plugin-';

export async function loadPlugins(): Promise<void> {
  try {
    // 1. Load built-in plugins
    await loadBuiltInPlugins();
    
    // 2. Load plugins from node_modules
    await loadNodeModulesPlugins();
    
    // 3. Load plugins from user config
    await loadUserConfigPlugins();
    
    // Initialize all plugins
    await initializePlugins();
    
    console.debug(`Loaded ${pluginRegistry.getAllPlugins().length} plugins`);
  } catch (error) {
    console.error('Error loading plugins:', error);
  }
}

async function loadBuiltInPlugins(): Promise<void> {
  const builtInPluginsDir = path.join(__dirname, '..', 'built-in-plugins');
  await loadPluginsFromDirectory(builtInPluginsDir);
}

async function loadPluginsFromDirectory(dir: string): Promise<void> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        try {
          const pluginPath = path.join(dir, entry.name);
          // Use dynamic import for ESM compatibility
          const pluginModule = await import(pluginPath);
          
          const plugin = pluginModule.default as AsyncAPIPlugin;
          if (plugin && typeof plugin.register === 'function') {
            pluginRegistry.registerPlugin(plugin);
            console.debug(`Registered plugin: ${plugin.name}`);
          } else {
            console.warn(`Invalid plugin format in ${entry.name}`);
          }
        } catch (err) {
          console.error(`Failed to load plugin from ${entry.name}:`, err);
        }
      }
    }
  } catch (err) {
    // Directory might not exist yet
    console.debug(`Plugin directory ${dir} not found or not accessible`);
  }
}

async function loadNodeModulesPlugins(): Promise<void> {
  try {
    // Find all installed node modules that match the plugin naming convention
    const nodeModulesPath = path.resolve('node_modules');
    const entries = await fs.readdir(nodeModulesPath, { withFileTypes: true });
    
    const pluginModules = entries.filter(entry => 
      entry.isDirectory() && entry.name.startsWith(MODULE_PREFIX)
    );
    
    for (const pluginModule of pluginModules) {
      try {
        const pluginPath = path.join(nodeModulesPath, pluginModule.name);
        const plugin = await import(pluginPath);
        
        if (plugin.default && typeof plugin.default.register === 'function') {
          pluginRegistry.registerPlugin(plugin.default);
          console.debug(`Registered npm plugin: ${plugin.default.name}`);
        }
      } catch (err) {
        console.error(`Failed to load npm plugin ${pluginModule.name}:`, err);
      }
    }
  } catch (err) {
    console.error('Error loading plugins from node_modules:', err);
  }
}

async function loadUserConfigPlugins(): Promise<void> {
  try {
    // Use cosmiconfig to locate user configuration
    const explorer = cosmiconfig('asyncapi');
    const result = await explorer.search();
    
    if (result && result.config && result.config.plugins) {
      const pluginsConfig = result.config.plugins as PluginsConfig;
      
      for (const [pluginName, config] of Object.entries(pluginsConfig)) {
        if (config.enabled) {
          // If it's a path to a local plugin
          if (pluginName.startsWith('./') || pluginName.startsWith('/')) {
            const absolutePath = path.resolve(path.dirname(result.filepath), pluginName);
            try {
              const plugin = await import(absolutePath);
              if (plugin.default && typeof plugin.default.register === 'function') {
                pluginRegistry.registerPlugin(plugin.default);
                console.debug(`Registered user config plugin: ${plugin.default.name}`);
              }
            } catch (err) {
              console.error(`Failed to load user config plugin ${pluginName}:`, err);
            }
          } else if (!pluginRegistry.getPlugin(pluginName)) {
            try {
              const pluginModule = await import(
                pluginName.startsWith(MODULE_PREFIX) ? pluginName : `${MODULE_PREFIX}${pluginName}`
              );
              if (pluginModule.default && typeof pluginModule.default.register === 'function') {
                pluginRegistry.registerPlugin(pluginModule.default);
                console.debug(`Registered user config plugin: ${pluginModule.default.name}`);
              }
            } catch (err) {
              console.error(`Failed to load user config plugin ${pluginName}:`, err);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Error loading plugins from user config:', err);
  }
}

async function initializePlugins(): Promise<void> {
  const plugins = pluginRegistry.getAllPlugins();
  
  for (const plugin of plugins) {
    try {
      if (typeof plugin.initialize === 'function') {
        await plugin.initialize();
        console.debug(`Initialized plugin: ${plugin.name}`);
      }
    } catch (err) {
      console.error(`Failed to initialize plugin ${plugin.name}:`, err);
    }
  }
}
