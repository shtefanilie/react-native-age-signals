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
import { getAgeRange, isSupported, AgeSignalResult } from 'react-native-age-signals';
import {
  AgeSignalsErrorCode,
  clearFake,
  setFakeError,
  setFakeResult,
} from 'react-native-age-signals/testing';

type Scenario = {
  label: string;
  apply: () => void;
};

const SCENARIOS: Scenario[] = [
  { label: 'Child (0–12)', apply: () => setFakeResult({ ageLower: 0, ageUpper: 12 }) },
  { label: 'Teen (13–17)', apply: () => setFakeResult({ ageLower: 13, ageUpper: 17 }) },
  { label: 'Adult (18+)', apply: () => setFakeResult({ ageLower: 18 }) },
  { label: 'No bounds', apply: () => setFakeResult({}) },
  {
    label: 'Error: Play Store missing',
    apply: () => setFakeError(AgeSignalsErrorCode.PLAY_STORE_NOT_FOUND),
  },
  {
    label: 'Error: API unavailable',
    apply: () => setFakeError(AgeSignalsErrorCode.API_NOT_AVAILABLE),
  },
  { label: 'Use the real Play client', apply: () => clearFake() },
];

export default function App() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [result, setResult] = useState<AgeSignalResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setError(null);
    getAgeRange()
      .then(setResult)
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    isSupported().then(setSupported);
    refresh();
  }, [refresh]);

  const runScenario = useCallback(
    (scenario: Scenario) => {
      try {
        scenario.apply();
        refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [refresh]
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>react-native-age-signals</Text>
        <View style={styles.card}>
          <Row label="Supported" value={supported === null ? '…' : String(supported)} />
          <Row label="Age range" value={result?.ageRange ?? '…'} />
          <Row label="Source" value={result?.source ?? '…'} />
          {error != null && <Text style={styles.error}>{error}</Text>}
        </View>

        <Pressable style={styles.button} onPress={refresh}>
          <Text style={styles.buttonLabel}>Read age range again</Text>
        </Pressable>

        {Platform.OS === 'android' && (
          <View style={styles.card}>
            <Text style={styles.sectionHeader}>Fake Play responses (debug only)</Text>
            {SCENARIOS.map((scenario) => (
              <Pressable
                key={scenario.label}
                style={styles.button}
                onPress={() => runScenario(scenario)}>
                <Text style={styles.buttonLabel}>{scenario.label}</Text>
              </Pressable>
            ))}
          </View>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7' },
  content: { padding: 20, gap: 20 },
  header: { fontSize: 24, fontWeight: '700' },
  sectionHeader: { fontSize: 16, fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 16, color: '#555' },
  value: { fontSize: 16, fontWeight: '500' },
  error: { fontSize: 14, color: '#c00' },
  button: { backgroundColor: '#1c1c1e', borderRadius: 10, padding: 12, alignItems: 'center' },
  buttonLabel: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
