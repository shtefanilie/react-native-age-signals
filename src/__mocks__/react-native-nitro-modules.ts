export const NitroModules = {
  createHybridObject: jest.fn(() => ({
    getAgeRange: jest.fn(),
    isSupported: jest.fn(),
  })),
};
