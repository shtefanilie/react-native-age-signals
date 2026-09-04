/**
 * Each test loads `../index` through a fresh module registry, because the module
 * memoizes the native object. The mock's `createHybridObject` is re-created by
 * the same reset, so arming it here applies to exactly one test.
 */
function loadModule(os: 'ios' | 'android' = 'android') {
  require('react-native').Platform.OS = os;

  const { NitroModules } = require('react-native-nitro-modules');

  const nativeModule = {
    getAgeRange: jest.fn(),
    isSupported: jest.fn(),
  };
  const accessModule = {
    requestAgeSignalsAccess: jest.fn(),
  };

  // Both HybridObjects are reached through the same factory, so the mock has to
  // answer per name rather than returning one shared object.
  (NitroModules.createHybridObject as jest.Mock).mockImplementation((name: string) =>
    name === 'AgeSignalsAccess' ? accessModule : nativeModule
  );

  const index = require('../index') as typeof import('../index');

  return {
    index,
    nativeModule,
    accessModule,
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

  it('does not request access by default', async () => {
    const { index, nativeModule } = loadModule();
    nativeModule.getAgeRange.mockResolvedValue({ ageRange: 'adult', source: 'google' });

    await index.getAgeRange();

    // The whole point of the default: upgrading must not introduce a system
    // prompt into a call site that never had one.
    expect(nativeModule.getAgeRange).toHaveBeenCalledWith(undefined);
  });

  it('forwards an explicit access request', async () => {
    const { index, nativeModule } = loadModule();
    nativeModule.getAgeRange.mockResolvedValue({
      ageRange: 'teen',
      source: 'google',
      accessStatus: 'shared',
    });

    await index.getAgeRange({ requestAccess: true });

    expect(nativeModule.getAgeRange).toHaveBeenCalledWith(true);
  });

  it('forwards requestAccess: false without inventing a default', async () => {
    const { index, nativeModule } = loadModule();
    nativeModule.getAgeRange.mockResolvedValue({ ageRange: 'unknown', source: 'google' });

    await index.getAgeRange({ requestAccess: false });

    expect(nativeModule.getAgeRange).toHaveBeenCalledWith(false);
  });

  it('passes accessStatus through untouched', async () => {
    const { index, nativeModule } = loadModule();
    nativeModule.getAgeRange.mockResolvedValue({
      ageRange: 'unknown',
      source: 'error',
      accessStatus: 'verificationRequired',
    });

    const result = await index.getAgeRange({ requestAccess: true });

    expect(result.accessStatus).toBe('verificationRequired');
    expect(result.source).toBe('error');
  });
});

describe('requestAgeSignalsAccess', () => {
  it('returns the status the native side reports', async () => {
    const { index, accessModule } = loadModule('android');
    accessModule.requestAgeSignalsAccess.mockResolvedValue('shared');

    expect(await index.requestAgeSignalsAccess()).toBe('shared');
  });

  it.each(['notShared', 'verificationRequired', 'unavailable', 'error'] as const)(
    'passes through the %s status',
    async (status) => {
      const { index, accessModule } = loadModule('android');
      accessModule.requestAgeSignalsAccess.mockResolvedValue(status);

      expect(await index.requestAgeSignalsAccess()).toBe(status);
    }
  );

  it('resolves unavailable on iOS without touching native', async () => {
    const { index, createHybridObject } = loadModule('ios');

    // Apple has no separate consent step, so this resolves rather than throwing
    // — a caller should not need a Platform.OS guard around it.
    expect(await index.requestAgeSignalsAccess()).toBe('unavailable');
    expect(createHybridObject).not.toHaveBeenCalled();
  });

  it('creates the access object once across multiple calls', async () => {
    const { index, accessModule, createHybridObject } = loadModule('android');
    accessModule.requestAgeSignalsAccess.mockResolvedValue('shared');

    await index.requestAgeSignalsAccess();
    await index.requestAgeSignalsAccess();

    expect(
      createHybridObject.mock.calls.filter(([name]) => name === 'AgeSignalsAccess')
    ).toHaveLength(1);
  });

  it('propagates rejection', async () => {
    const { index, accessModule } = loadModule('android');
    accessModule.requestAgeSignalsAccess.mockRejectedValue(new Error('native error'));

    await expect(index.requestAgeSignalsAccess()).rejects.toThrow('native error');
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
