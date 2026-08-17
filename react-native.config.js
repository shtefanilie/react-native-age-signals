module.exports = {
  dependency: {
    platforms: {
      ios: {},
      android: {
        sourceDir: './android',
        // Registers the package that loads the C++ part of this library. Without
        // it nothing calls System.loadLibrary, so no HybridObject is ever
        // registered with Nitro and createHybridObject fails at runtime.
        packageImportPath:
          'import com.margelo.nitro.agesignals.ReactNativeAgeSignalsPackage;',
        packageInstance: 'new ReactNativeAgeSignalsPackage()',
      },
    },
  },
};
