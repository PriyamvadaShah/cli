---'@asyncapi/cli': minor---
Add plugin system to allow extending CLI with custom functionality

- Create PluginManager for discovering and loading plugins
- Implement extension points with hook system for core CLI operations
- Add plugin lifecycle management (initialize, register hooks, cleanup)
- Create plugin configuration system for managing plugin settings
- Add plugin management commands (install, list, enable/disable)
- Implement standard plugin loading from ~/.asyncapi/plugins and node_modules
- Add example plugin and documentation for plugin development