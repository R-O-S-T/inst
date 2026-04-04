const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the monorepo root for changes (shared packages)
config.watchFolders = [monorepoRoot];

// Resolve modules from both the project and the monorepo root (hoisted node_modules)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Polyfill Node.js built-ins that the Unlink SDK references
config.resolver.extraNodeModules = {
  module: path.resolve(projectRoot, 'shims/empty.js'),
};

module.exports = config;
