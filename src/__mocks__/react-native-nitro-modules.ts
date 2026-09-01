export const NitroModules = {
  createHybridObject: jest.fn(() => ({
    getAgeRange: jest.fn(),
    isSupported: jest.fn(),
    requestAgeSignalsAccess: jest.fn(),
    setFakeResult: jest.fn(),
    setFakeError: jest.fn(),
    setFakeAccessStatus: jest.fn(),
    setFakeAccessError: jest.fn(),
    clearFake: jest.fn(),
  })),
};
