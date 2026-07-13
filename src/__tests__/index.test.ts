import ReactNativeAgeSignalsModule from '../ReactNativeAgeSignalsModule';
import { getAgeRange, isSupported } from '../index';

const mockModule = ReactNativeAgeSignalsModule as jest.Mocked<typeof ReactNativeAgeSignalsModule>;

beforeEach(() => {
  jest.resetAllMocks();
});

describe('getAgeRange', () => {
  it('returns child result from Apple', async () => {
    mockModule.getAgeRange.mockResolvedValue({ ageRange: 'child', source: 'apple' });
    const result = await getAgeRange();
    expect(result.ageRange).toBe('child');
    expect(result.source).toBe('apple');
  });

  it('returns teen result from Google', async () => {
    mockModule.getAgeRange.mockResolvedValue({ ageRange: 'teen', source: 'google' });
    const result = await getAgeRange();
    expect(result.ageRange).toBe('teen');
    expect(result.source).toBe('google');
  });

  it('returns adult result', async () => {
    mockModule.getAgeRange.mockResolvedValue({ ageRange: 'adult', source: 'apple' });
    const result = await getAgeRange();
    expect(result.ageRange).toBe('adult');
    expect(result.source).toBe('apple');
  });

  it('returns unknown with unavailable source when API not supported', async () => {
    mockModule.getAgeRange.mockResolvedValue({ ageRange: 'unknown', source: 'unavailable' });
    const result = await getAgeRange();
    expect(result.ageRange).toBe('unknown');
    expect(result.source).toBe('unavailable');
  });

  it('propagates rejection', async () => {
    mockModule.getAgeRange.mockRejectedValue(new Error('native error'));
    await expect(getAgeRange()).rejects.toThrow('native error');
  });
});

describe('isSupported', () => {
  it('returns true on supported device', async () => {
    mockModule.isSupported.mockResolvedValue(true);
    expect(await isSupported()).toBe(true);
  });

  it('returns false on unsupported device', async () => {
    mockModule.isSupported.mockResolvedValue(false);
    expect(await isSupported()).toBe(false);
  });

  it('propagates rejection', async () => {
    mockModule.isSupported.mockRejectedValue(new Error('native error'));
    await expect(isSupported()).rejects.toThrow('native error');
  });
});
