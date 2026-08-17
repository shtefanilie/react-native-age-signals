export const NitroModules = {
  createHybridObject: jest.fn(() => ({
    getAgeRange: jest.fn(),
    isSupported: jest.fn(),
    setFakeResult: jest.fn(),
    setFakeError: jest.fn(),
    clearFake: jest.fn(),
  })),
};
