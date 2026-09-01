import { useCallback, useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  getAgeRange,
  isSupported,
  requestAgeSignalsAccess,
  AgeSignalResult,
} from 'react-native-age-signals';
import {
  AgeSignalsErrorCode,
  AgeSignalsStatus,
  clearFake,
  setFakeAccessError,
  setFakeAccessStatus,
  setFakeError,
  setFakeResult,
} from 'react-native-age-signals/testing';

type Scenario = {
  label: string;
  apply: () => void;
};

/**
 * Read scenarios. These stage what `checkAgeSignals` returns, which is only
 * reached once access reports `shared` — so pair them with an access scenario
 * when exercising the opt-in read.
 */
const READ_SCENARIOS: Scenario[] = [
  { label: 'Child (0–12)', apply: () => setFakeResult({ ageLower: 0, ageUpper: 12 }) },
  { label: 'Teen (13–17)', apply: () => setFakeResult({ ageLower: 13, ageUpper: 17 }) },
  { label: 'Adult (18+)', apply: () => setFakeResult({ ageLower: 18 }) },
  { label: 'No bounds', apply: () => setFakeResult({}) },
  {
    label: 'Read error: Play Store missing',
    apply: () => setFakeError(AgeSignalsErrorCode.PLAY_STORE_NOT_FOUND),
  },
  {
    label: 'Read error: API unavailable',
    apply: () => setFakeError(AgeSignalsErrorCode.API_NOT_AVAILABLE),
  },
];

/** Access scenarios. These stage what `requestAgeSignalsAccess` resolves with. */
const ACCESS_SCENARIOS: Scenario[] = [
  { label: 'Access: shared', apply: () => setFakeAccessStatus(AgeSignalsStatus.SHARED) },
  { label: 'Access: not shared', apply: () => setFakeAccessStatus(AgeSignalsStatus.NOT_SHARED) },
  {
    label: 'Access: verification required',
    apply: () => setFakeAccessStatus(AgeSignalsStatus.VERIFICATION_REQUIRED),
  },
  { label: 'Access: unspecified', apply: () => setFakeAccessStatus(AgeSignalsStatus.UNSPECIFIED) },
  {
    label: 'Access error: network',
    apply: () => setFakeAccessError(AgeSignalsErrorCode.NETWORK_ERROR),
  },
  {
    label: 'Access error: app not owned',
    apply: () => setFakeAccessError(AgeSignalsErrorCode.APP_NOT_OWNED),
  },
  { label: 'Use the real Play client', apply: () => clearFake() },
];

export default function App() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [result, setResult] = useState<AgeSignalResult | null>(null);
  const [accessStatus, setAccessStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const read = useCallback((requestAccess: boolean) => {
    setError(null);
    getAgeRange(requestAccess ? { requestAccess: true } : undefined)
      .then(setResult)
      .catch((e: Error) => setError(e.message));
  }, []);

  const requestAccess = useCallback(() => {
    setError(null);
    requestAgeSignalsAccess()
      .then(setAccessStatus)
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    isSupported().then(setSupported);
    read(false);
  }, [read]);

  const runScenario = useCallback((scenario: Scenario) => {
    try {
      scenario.apply();
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>react-native-age-signals</Text>
        <View style={styles.card}>
          <Row label="Supported" value={supported === null ? '…' : String(supported)} />
          <Row label="Age range" value={result?.ageRange ?? '…'} />
          <Row label="Source" value={result?.source ?? '…'} />
          <Row label="Result accessStatus" value={result?.accessStatus ?? '—'} />
          <Row label="Last access request" value={accessStatus ?? '—'} />
          {error != null && <Text style={styles.error}>{error}</Text>}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Calls</Text>
          <Button label="Read (no consent request)" onPress={() => read(false)} />
          <Button label="Read with requestAccess" onPress={() => read(true)} />
          {Platform.OS === 'android' && (
            <Button label="Request access only" onPress={requestAccess} />
          )}
          <Text style={styles.hint}>
            A plain read cannot report bounds on Android unless the user already shares their age
            range. On iOS both reads behave identically — Apple&apos;s sheet is part of the read.
          </Text>
        </View>

        {Platform.OS === 'android' && (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionHeader}>Fake access responses (debug only)</Text>
              {ACCESS_SCENARIOS.map((scenario) => (
                <Button
                  key={scenario.label}
                  label={scenario.label}
                  onPress={() => runScenario(scenario)}
                />
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionHeader}>Fake read responses (debug only)</Text>
              {READ_SCENARIOS.map((scenario) => (
                <Button
                  key={scenario.label}
                  label={scenario.label}
                  onPress={() => runScenario(scenario)}
                />
              ))}
              <Text style={styles.hint}>
                Stage an access status and a read result together, then use “Read with
                requestAccess” — a non-shared status short-circuits before the read.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function Button({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.button} onPress={onPress}>
      <Text style={styles.buttonLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7' },
  content: { padding: 20, gap: 20 },
  header: { fontSize: 24, fontWeight: '700' },
  sectionHeader: { fontSize: 16, fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 16, color: '#555' },
  value: { fontSize: 16, fontWeight: '500' },
  hint: { fontSize: 13, color: '#666', lineHeight: 18 },
  error: { fontSize: 14, color: '#c00' },
  button: { backgroundColor: '#1c1c1e', borderRadius: 10, padding: 12, alignItems: 'center' },
  buttonLabel: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
