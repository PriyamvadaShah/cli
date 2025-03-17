import {Help, Hook, toConfiguredId} from '@oclif/core';
import {confirm} from '@clack/prompts';
import chalk from 'chalk';
import {default as levenshtein} from 'fast-levenshtein';
import * as fs from 'fs';
import * as path from 'path';

// Hook context for sharing state between hooks
export class HookContext {
  private data: Record<string, any> = {};

  set(key: string, value: any): void {
    this.data[key] = value;
  }

  get<T>(key: string, defaultValue?: T): T {
    return this.data[key] !== undefined ? this.data[key] as T : (defaultValue as T);
  }

  has(key: string): boolean {
    return key in this.data;
  }

  remove(key: string): void {
    delete this.data[key];
  }

  clear(): void {
    this.data = {};
  }

  getAll(): Record<string, any> {
    return { ...this.data };
  }
}

// Extended hook types
export const HookTypes = {
  // Original hooks
  COMMAND_NOT_FOUND: 'command_not_found',
  
  // New extended hooks
  VALIDATE_BEFORE: 'validate:before',
  VALIDATE_AFTER: 'validate:after',
  PARSE_BEFORE: 'parse:before',
  PARSE_AFTER: 'parse:after',
  GENERATE_PREPARE: 'generate:prepare',
  GENERATE_FILE_BEFORE: 'generate:file:before',
  GENERATE_FILE_AFTER: 'generate:file:after',
  GENERATE_COMPLETE: 'generate:complete',
  INIT: 'init',
  COMMAND_BEFORE: 'command:before',
  COMMAND_AFTER: 'command:after'
};

// Hook result interface
export interface HookResult {
  success: boolean;
  value?: any;
  error?: Error;
  duration?: number;
}

// Hook options interface
export interface HookOptions {
  priority?: number;
  timeout?: number;
  description?: string;
  tags?: string[];
}

// Type definitions for hook functions
export type HookFunction = (...args: any[]) => any | Promise<any>;

// Hook manager for registering and executing hooks
export class HookManager {
  private hooks: Map<string, Array<{fn: HookFunction, options: HookOptions}>> = new Map();
  private context: HookContext = new HookContext();
  
  constructor() {
    this.loadHooksFromDirectory();
  }

  /**
   * Register a hook function
   */
  register(name: string, fn: HookFunction, options: HookOptions = {}): void {
    if (!this.hooks.has(name)) {
      this.hooks.set(name, []);
    }

    const defaultOptions: HookOptions = {
      priority: 10,
      timeout: 30000,
    };

    const hookOptions = { ...defaultOptions, ...options };
    const hooks = this.hooks.get(name)!;
    
    hooks.push({ fn, options: hookOptions });
    
    // Sort hooks by priority (higher priority runs first)
    hooks.sort((a, b) => (b.options.priority || 0) - (a.options.priority || 0));
  }

  /**
   * Execute a hook with the given arguments
   */
  async execute(name: string, ...args: any[]): Promise<HookResult[]> {
    if (!this.hooks.has(name)) {
      return [];
    }

    const hooks = this.hooks.get(name)!;
    const results: HookResult[] = [];

    for (const hook of hooks) {
      try {
        const startTime = Date.now();
        
        // Execute hook with timeout - using Function.prototype.bind to create a new function
        // that we can call with spread operator
        const boundFn = hook.fn.bind(null);
        const result = await Promise.race([
          Promise.resolve(boundFn(...args)),
          new Promise((_, reject) => {
            setTimeout(() => {
              reject(new Error(`Hook '${name}' timed out after ${hook.options.timeout}ms`));
            }, hook.options.timeout || 30000);
          })
        ]);
        
        const duration = Date.now() - startTime;
        results.push({
          success: true,
          value: result,
          duration
        });
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error : new Error(String(error))
        });
      }
    }

    return results;
  }

  /**
   * Execute a hook with shared context
   */
  async executeWithContext(name: string, ...args: any[]): Promise<HookResult[]> {
    return this.execute(name, this.context, ...args);
  }

  /**
   * Load hooks from a directory
   */
  private loadHooksFromDirectory(): void {
    const hooksDir = path.join(process.cwd(), 'hooks');
    
    if (!fs.existsSync(hooksDir)) {
      return;
    }

    try {
      const files = fs.readdirSync(hooksDir)
        .filter(file => file.endsWith('.js') || file.endsWith('.ts'));
      
      for (const file of files) {
        try {
          // Use dynamic import for ESM compatibility
          import(path.join(hooksDir, file))
            .then(hookModule => {
              if (typeof hookModule.register === 'function') {
                hookModule.register(this);
              } else if (typeof hookModule.default === 'function') {
                this.register(file.replace(/\.(js|ts)$/, ''), hookModule.default);
              }
            })
            .catch(error => {
              console.warn(`Failed to load hook from file ${file}: ${error.message}`);
            });
        } catch (error) {
          console.warn(`Failed to load hook from file ${file}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    } catch (error) {
      console.warn(`Failed to load hooks from directory: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get the shared context
   */
  getContext(): HookContext {
    return this.context;
  }
}

// Create a singleton instance
export const hookManager = new HookManager();

// Helper functions
export const getOrderedSuggestions = (target: string, possibilities: string[], limit = 3): string[] => {
  return possibilities
    .map((id) => ({distance: levenshtein.get(target, id, {useCollator: true}), id}))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map(item => item.id);
};

export const saveCommandHistory = (config: any, command: string): void => {
  config.commandHistory = config.commandHistory || [];
  config.commandHistory.push({
    command,
    timestamp: new Date().toISOString()
  });
  if (config.commandHistory.length > 100) {
    config.commandHistory = config.commandHistory.slice(-100);
  }
};

export const findRelatedCommands = (target: string, commandIDs: string[], limit = 2): string[] => {
  const parts = target.split(':');
  return commandIDs
    .filter(cmd => parts.some(part => cmd.includes(part)))
    .filter(cmd => cmd !== target)
    .slice(0, limit);
};

export const closest = (target: string, possibilities: string[]): string =>
  possibilities
    .map((id) => ({distance: levenshtein.get(target, id, {useCollator: true}), id}))
    .sort((a, b) => a.distance - b.distance)[0]?.id ?? '';

// Testing utilities for hooks
export const testHook = async (hookName: string, ...args: any[]): Promise<HookResult[]> => {
  return hookManager.execute(hookName, ...args);
};

// Original hook implementation
const commandNotFoundHook: Hook.CommandNotFound = async function (opts) {
  // Create a context for this hook execution
  const context = hookManager.getContext();
  context.set('command', opts.id);
  context.set('argv', opts.argv);
  context.set('config', opts.config);

  // Execute pre-hooks if any are registered
  await hookManager.executeWithContext(HookTypes.COMMAND_BEFORE, opts);

  if (opts.id === '--help') {
    const help = new Help(this.config);
    help.showHelp(['--help']);
    return;
  }
  const hiddenCommandIds = new Set(opts.config.commands.filter((c) => c.hidden).map((c) => c.id));
  const commandIDs = [...opts.config.commandIDs, ...opts.config.commands.flatMap((c) => c.aliases)].filter(
    (c) => !hiddenCommandIds.has(c),
  );

  if (commandIDs.length === 0) {return;}

  // now we we return if the command id are not there.

  let binHelp = `${opts.config.bin} help`;

  const idSplit = opts.id.split(':');
  if (opts.config.findTopic(idSplit[0])) {
    // if valid topic, update binHelp with topic
    binHelp = `${binHelp} ${idSplit[0]}`;
  }

  //if there is a topic in the opts we just upgrade the our commnad like

  // alter the suggestion in the help scenario so that help is the first command
  // otherwise the user will be presented 'did you mean 'help'?' instead of 'did you mean "help <command>"?'
  let suggestion = (/:?help:?/).test(opts.id)
    ? ['help', ...opts.id.split(':').filter((cmd) => cmd !== 'help')].join(':')
    : closest(opts.id, commandIDs);

  let readableSuggestion = toConfiguredId(suggestion, this.config);
  const originalCmd = toConfiguredId(opts.id, this.config);
  this.warn(`${chalk.yellow(originalCmd)} is not a ${opts.config.bin} command.`);

  const alternativeSuggestions = getOrderedSuggestions(opts.id, commandIDs, 3).filter(s => s !== suggestion);
  
  const relatedCommands = findRelatedCommands(opts.id, commandIDs);
  
  saveCommandHistory(this.config, opts.id);
  
  if (alternativeSuggestions.length > 0) {
    this.log('\nOther suggestions:');
    for (const s of alternativeSuggestions) {
      this.log(`  ${chalk.cyan(toConfiguredId(s, this.config))}`);
    }    
  }
  
  if (relatedCommands.length > 0) {
    this.log('\nRelated commands:');
    for (const cmd of relatedCommands) {
      this.log(`  ${chalk.green(toConfiguredId(cmd, this.config))}`);
    }
  }

  let response;
  try {
    if (opts.id === 'help') {readableSuggestion = '--help';}
    response = await confirm({message: `Did you mean ${chalk.blueBright(readableSuggestion)}? [y/n]`});
  } catch (error) {
    this.log('');
    this.debug(error);
  }

  if (response === true) {
    // this will split the original command from the suggested replacement, and gather the remaining args as varargs to help with situations like:
    // confit set foo-bar -> confit:set:foo-bar -> config:set:foo-bar -> config:set foo-bar
    let argv = opts.argv?.length ? opts.argv : opts.id.split(':').slice(suggestion.split(':').length);
    if (suggestion.startsWith('help:')) {
      // the args are the command/partial command you need help for (package:version)
      // we created the suggestion variable to start with "help" so slice the first entry
      argv = suggestion.split(':').slice(1);
      // the command is just the word "help"
      suggestion = 'help';
    }
    if (opts.id === 'help') {
      return this.config.runCommand('--help');
    }
    
    // Store the result in context
    context.set('suggestedCommand', suggestion);
    context.set('suggestedArgv', argv);
    
    // Execute post-hooks if any are registered
    await hookManager.executeWithContext(HookTypes.COMMAND_AFTER, opts, suggestion, argv);
    
    return this.config.runCommand(suggestion, argv);
  } 

  if (alternativeSuggestions.length > 0) {
    try {
      const altResponse = await confirm({
        message: `Would you like to run ${chalk.cyan(toConfiguredId(alternativeSuggestions[0], this.config))} instead? [y/n]`
      });
      if (altResponse === true) {
        // Store the result in context
        context.set('suggestedCommand', alternativeSuggestions[0]);
        context.set('suggestedArgv', opts.argv);
        
        // Execute post-hooks if any are registered
        await hookManager.executeWithContext(HookTypes.COMMAND_AFTER, opts, alternativeSuggestions[0], opts.argv);
        
        return this.config.runCommand(alternativeSuggestions[0], opts.argv);
      }
    } catch (error) {
      this.log('');
      this.debug(error);
    }
  }

  // Execute any error hooks
  context.set('error', new Error(`Command not found: ${opts.id}`));
  await hookManager.executeWithContext('error', opts);

  this.error(`Run ${chalk.bold.cyan(binHelp)} for a list of available commands.`, {exit: 127});
};

// Example of using the hook system with adapter function
export const registerHook = (name: string, fn: HookFunction, options: HookOptions = {}): void => {
  hookManager.register(name, fn, options);
};

// Instead of using apply(), create an adapter that uses the spread operator
const commandNotFoundAdapter: HookFunction = (...args: any[]) => {
  // Use bind to create a proper 'this' context and then call with spread operator
  const boundHook = commandNotFoundHook.bind(args[0]);
  return boundHook(args[1]);
};

// Register the adapter
hookManager.register(HookTypes.COMMAND_NOT_FOUND, commandNotFoundAdapter);

export default commandNotFoundHook;
