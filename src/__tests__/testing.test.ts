/**
 * Each test loads `../testing` through a fresh module registry, because the
 * module memoizes both the resolved platform and the native object. Everything
 * the test touches has to be required from that same fresh registry, otherwise
 * the assertions would run against a different copy of the mock.
 */
function loadTestingModule(os: 'ios' | 'android') {
  const reactNative = require('react-native');
  reactNative.Platform.OS = os;

  const { NitroModules } = require('react-native-nitro-modules');
  const testing = require('../testing') as typeof import('../testing');

  return {
    testing,
    createHybridObject: NitroModules.createHybridObject as jest.Mock,
  };
}

beforeEach(() => {
  jest.resetModules();
});

describe('on Android', () => {
  it('forwards age bounds to the native testing module', () => {
    const { testing, createHybridObject } = loadTestingModule('android');

    testing.setFakeResult({ ageLower: 13, ageUpper: 17 });

    expect(createHybridObject.mock.results[0].value.setFakeResult).toHaveBeenCalledWith(13, 17);
  });

  it('forwards partially specified bounds', () => {
    const { testing, createHybridObject } = loadTestingModule('android');

    testing.setFakeResult({ ageUpper: 12 });

    expect(createHybridObject.mock.results[0].value.setFakeResult).toHaveBeenCalledWith(
      undefined,
      12
    );
  });

  it('forwards an error code to the native testing module', () => {
    const { testing, createHybridObject } = loadTestingModule('android');

    testing.setFakeError(testing.AgeSignalsErrorCode.PLAY_STORE_NOT_FOUND);

    expect(createHybridObject.mock.results[0].value.setFakeError).toHaveBeenCalledWith(-2);
  });

  it('clears a previously installed fake', () => {
    const { testing, createHybridObject } = loadTestingModule('android');

    testing.clearFake();

    expect(createHybridObject.mock.results[0].value.clearFake).toHaveBeenCalled();
  });

  it('creates the native object once across multiple calls', () => {
    const { testing, createHybridObject } = loadTestingModule('android');

    testing.clearFake();
    testing.clearFake();

    expect(createHybridObject).toHaveBeenCalledTimes(1);
  });

  it('does not create the native object until a method is called', () => {
    const { createHybridObject } = loadTestingModule('android');

    expect(createHybridObject).not.toHaveBeenCalled();
  });

  it('forwards an access status to the native testing module', () => {
    const { testing, createHybridObject } = loadTestingModule('android');

    testing.setFakeAccessStatus(testing.AgeSignalsStatus.SHARED);

    expect(createHybridObject.mock.results[0].value.setFakeAccessStatus).toHaveBeenCalledWith(1);
  });

  it('forwards each access status value Play defines', () => {
    const { testing, createHybridObject } = loadTestingModule('android');
    const native = createHybridObject.mock.results[0]?.value;

    testing.setFakeAccessStatus(testing.AgeSignalsStatus.NOT_SHARED);
    testing.setFakeAccessStatus(testing.AgeSignalsStatus.VERIFICATION_REQUIRED);
    testing.setFakeAccessStatus(testing.AgeSignalsStatus.UNSPECIFIED);

    const forwarded = (
      native ?? createHybridObject.mock.results[0].value
    ).setFakeAccessStatus.mock.calls.flat();
    expect(forwarded).toEqual([2, 3, 0]);
  });

  it('forwards an access error code to the native testing module', () => {
    const { testing, createHybridObject } = loadTestingModule('android');

    testing.setFakeAccessError(testing.AgeSignalsErrorCode.NETWORK_ERROR);

    expect(createHybridObject.mock.results[0].value.setFakeAccessError).toHaveBeenCalledWith(-3);
  });

  it('keeps the read and access fakes on separate native entry points', () => {
    const { testing, createHybridObject } = loadTestingModule('android');
    const native = createHybridObject.mock.results[0]?.value;

    testing.setFakeAccessStatus(testing.AgeSignalsStatus.SHARED);
    testing.setFakeResult({ ageLower: 13, ageUpper: 17 });

    const resolved = native ?? createHybridObject.mock.results[0].value;
    // Staging one must not go through the other's setter — Play needs both to
    // reach a bounds-bearing result, so they cannot share a slot.
    expect(resolved.setFakeAccessStatus).toHaveBeenCalledWith(1);
    expect(resolved.setFakeResult).toHaveBeenCalledWith(13, 17);
  });
});

describe('AgeSignalsStatus', () => {
  it('matches the values Play defines', () => {
    const { testing } = loadTestingModule('android');

    // Read from the 0.0.4 AAR, not guessed: these cross the JSI boundary as
    // plain ints, so a wrong value silently mis-stages a scenario.
    expect(testing.AgeSignalsStatus).toEqual({
      UNSPECIFIED: 0,
      SHARED: 1,
      NOT_SHARED: 2,
      VERIFICATION_REQUIRED: 3,
    });
  });
});

describe('on iOS', () => {
  it('throws a descriptive error instead of creating a native object', () => {
    const { testing, createHybridObject } = loadTestingModule('ios');

    expect(() => testing.setFakeResult({ ageUpper: 12 })).toThrow(/only available on Android/);
    expect(createHybridObject).not.toHaveBeenCalled();
  });

  it('throws from every entry point', () => {
    const { testing } = loadTestingModule('ios');

    expect(() => testing.setFakeError(-1)).toThrow(/only available on Android/);
    expect(() => testing.clearFake()).toThrow(/only available on Android/);
    expect(() => testing.setFakeAccessStatus(1)).toThrow(/only available on Android/);
    expect(() => testing.setFakeAccessError(-3)).toThrow(/only available on Android/);
  });
});
