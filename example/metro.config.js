const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const root = path.resolve(__dirname, '..');

/**
 * Packages that must resolve to exactly one copy.
 *
 * The library keeps its own devDependency copies of these, and Metro resolves
 * from the importing file upwards, so a file inside the library would otherwise
 * load the library's react-native rather than the example's. The two are not
 * interchangeable: the library develops against a newer react-native whose
 * source uses syntax the example's Babel version cannot parse.
 */
const sharedModules = ['react', 'react-native', 'react-native-nitro-modules'];

function escapeForRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const config = {
  watchFolders: [root],
  resolver: {
    blockList: sharedModules.map(
      (name) => new RegExp(`^${escapeForRegExp(path.join(root, 'node_modules', name))}\\/.*$`)
    ),
    extraNodeModules: sharedModules.reduce((accumulator, name) => {
      accumulator[name] = path.join(__dirname, 'node_modules', name);
      return accumulator;
    }, {}),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
