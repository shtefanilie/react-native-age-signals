const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const root = path.resolve(__dirname, '..');

const config = {
  watchFolders: [root],
  resolver: {
    extraNodeModules: new Proxy(
      {},
      {
        get: (_, name) =>
          path.join(__dirname, 'node_modules', name),
      }
    ),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
