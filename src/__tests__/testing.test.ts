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
  });
});
