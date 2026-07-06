import ReactNativeAgeSignalsModule from '../ReactNativeAgeSignalsModule';
import { getAgeRange, isSupported } from '../index';

const mockModule = ReactNativeAgeSignalsModule as jest.Mocked<typeof ReactNativeAgeSignalsModule>;

describe('getAgeRange', () => {
  it('returns child result', async () => {
    mockModule.getAgeRange.mockResolvedValue({ ageRange: 'child', source: 'apple' });
    const result = await getAgeRange();
    expect(result.ageRange).toBe('child');
    expect(result.source).toBe('apple');
  });

  it('returns teen result', async () => {
    mockModule.getAgeRange.mockResolvedValue({ ageRange: 'teen', source: 'google' });
    const result = await getAgeRange();
    expect(result.ageRange).toBe('teen');
    expect(result.source).toBe('google');
  });

  it('returns adult result', async () => {
    mockModule.getAgeRange.mockResolvedValue({ ageRange: 'adult', source: 'apple' });
    const result = await getAgeRange();
    expect(result.ageRange).toBe('adult');
  });

  it('returns unknown when unavailable', async () => {
    mockModule.getAgeRange.mockResolvedValue({ ageRange: 'unknown', source: 'unavailable' });
    const result = await getAgeRange();
    expect(result.ageRange).toBe('unknown');
    expect(result.source).toBe('unavailable');
  });
});

describe('isSupported', () => {
  it('returns true when supported', async () => {
    mockModule.isSupported.mockResolvedValue(true);
    expect(await isSupported()).toBe(true);
  });

  it('returns false when unsupported', async () => {
    mockModule.isSupported.mockResolvedValue(false);
    expect(await isSupported()).toBe(false);
  });
});
