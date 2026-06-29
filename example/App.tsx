import { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getAgeRange, isSupported, AgeSignalResult } from 'react-native-age-signals';

export default function App() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [result, setResult] = useState<AgeSignalResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    isSupported().then(setSupported);
    getAgeRange()
      .then(setResult)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.container}>
        <Text style={styles.header}>react-native-age-signals</Text>
        <View style={styles.group}>
          <Row label="Supported" value={supported === null ? '…' : String(supported)} />
          {result && (
            <>
              <Row label="Age range" value={result.ageRange} />
              <Row label="Source" value={result.source} />
            </>
          )}
          {error && <Text style={styles.error}>{error}</Text>}
        </View>
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
  container: { flex: 1, backgroundColor: '#eee' },
  header: { fontSize: 28, fontWeight: '600', margin: 20 },
  group: { margin: 20, backgroundColor: '#fff', borderRadius: 10, padding: 20, gap: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 16, color: '#555' },
  value: { fontSize: 16, fontWeight: '500' },
  error: { fontSize: 14, color: 'red' },
});
