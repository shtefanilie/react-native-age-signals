export class NativeModule {}

export function requireNativeModule(name: string) {
  return { getAgeRange: jest.fn(), isSupported: jest.fn() };
}
