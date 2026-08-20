/**
 * Each test loads `../index` through a fresh module registry, because the module
 * memoizes the native object. The mock's `createHybridObject` is re-created by
 * the same reset, so arming it here applies to exactly one test.
 */
function loadModule() {
  const { NitroModules } = require('react-native-nitro-modules');

  const nativeModule = {
    getAgeRange: jest.fn(),
    isSupported: jest.fn(),
  };

  (NitroModules.createHybridObject as jest.Mock).mockReturnValue(nativeModule);

  const index = require('../index') as typeof import('../index');

  return {
    index,
    nativeModule,
    createHybridObject: NitroModules.createHybridObject as jest.Mock,
  };
}

beforeEach(() => {
  jest.resetModules();
});

afterEach(() => {
  // `console.warn` is spied on in the construction-failure tests. Without this
  // the spy outlives the test that installed it and its call history bleeds
  // into the next one, since resetting the module registry does not touch spies
  // installed on globals.
  jest.restoreAllMocks();
});

describe('getAgeRange', () => {
  it('returns child result from Apple', async () => {
    const { index, nativeModule } = loadModule();
    nativeModule.getAgeRange.mockResolvedValue({ ageRange: 'child', source: 'apple' });

    const result = await index.getAgeRange();

    expect(result.ageRange).toBe('child');
    expect(result.source).toBe('apple');
  });

  it('returns teen result from Google', async () => {
    const { index, nativeModule } = loadModule();
    nativeModule.getAgeRange.mockResolvedValue({ ageRange: 'teen', source: 'google' });

    const result = await index.getAgeRange();

    expect(result.ageRange).toBe('teen');
    expect(result.source).toBe('google');
  });

  it('returns adult result', async () => {
    const { index, nativeModule } = loadModule();
    nativeModule.getAgeRange.mockResolvedValue({ ageRange: 'adult', source: 'apple' });

    const result = await index.getAgeRange();

    expect(result.ageRange).toBe('adult');
    expect(result.source).toBe('apple');
  });

  it('returns unknown with unavailable source when API not supported', async () => {
    const { index, nativeModule } = loadModule();
    nativeModule.getAgeRange.mockResolvedValue({ ageRange: 'unknown', source: 'unavailable' });

    const result = await index.getAgeRange();

    expect(result.ageRange).toBe('unknown');
    expect(result.source).toBe('unavailable');
  });

  it('propagates rejection', async () => {
    const { index, nativeModule } = loadModule();
    nativeModule.getAgeRange.mockRejectedValue(new Error('native error'));

    await expect(index.getAgeRange()).rejects.toThrow('native error');
  });
});

describe('isSupported', () => {
  it('returns true on supported device', async () => {
    const { index, nativeModule } = loadModule();
    nativeModule.isSupported.mockResolvedValue(true);

    expect(await index.isSupported()).toBe(true);
  });

  it('returns false on unsupported device', async () => {
    const { index, nativeModule } = loadModule();
    nativeModule.isSupported.mockResolvedValue(false);

    expect(await index.isSupported()).toBe(false);
  });

  it('propagates rejection', async () => {
    const { index, nativeModule } = loadModule();
    nativeModule.isSupported.mockRejectedValue(new Error('native error'));

    await expect(index.isSupported()).rejects.toThrow('native error');
  });
});

describe('native object construction', () => {
  it('does not create the native object at import', () => {
    const { createHybridObject } = loadModule();

    expect(createHybridObject).not.toHaveBeenCalled();
  });

  it('creates the native object once across multiple calls', async () => {
    const { index, nativeModule, createHybridObject } = loadModule();
    nativeModule.getAgeRange.mockResolvedValue({ ageRange: 'adult', source: 'apple' });
    nativeModule.isSupported.mockResolvedValue(true);

    await index.isSupported();
    await index.getAgeRange();
    await index.isSupported();

    expect(createHybridObject).toHaveBeenCalledTimes(1);
  });

  it('surfaces a registration failure to the caller instead of at import', async () => {
    const { NitroModules } = require('react-native-nitro-modules');
    (NitroModules.createHybridObject as jest.Mock).mockImplementation(() => {
      throw new Error('HybridObject "AgeSignals" has not yet been registered');
    });
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Importing must not throw, even though construction will.
    const index = require('../index') as typeof import('../index');

    expect(() => index.isSupported()).toThrow('has not yet been registered');
  });

  it('warns once about a registration failure, however many calls are made', () => {
    const { NitroModules } = require('react-native-nitro-modules');
    (NitroModules.createHybridObject as jest.Mock).mockImplementation(() => {
      throw new Error('HybridObject "AgeSignals" has not yet been registered');
    });
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const index = require('../index') as typeof import('../index');

    expect(() => index.isSupported()).toThrow();
    expect(() => index.getAgeRange()).toThrow();
    expect(() => index.isSupported()).toThrow();

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain(
      'Could not create the native "AgeSignals" HybridObject'
    );
  });

  it('does not warn when construction succeeds', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { index, nativeModule } = loadModule();
    nativeModule.isSupported.mockResolvedValue(true);

    await index.isSupported();

    expect(warn).not.toHaveBeenCalled();
  });
});
