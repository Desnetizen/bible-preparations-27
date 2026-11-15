import { StyleSheet, Text, View } from 'react-native';

import { Brand } from '@/constants/brand';
import { Spacing } from '@/constants/theme';
import { STRENGTH_LABELS, type PasswordReport } from '@/lib/password-policy';

const SEGMENT_COLORS = [Brand.danger, Brand.danger, Brand.accent, Brand.info, Brand.info];

/** A four-segment strength bar with the first problem, if any, written underneath. */
export function PasswordStrength({ report }: { report: PasswordReport }) {
  const filled = report.score;
  const label = STRENGTH_LABELS[report.score];

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityLabel={`Password strength: ${label}`}
      accessibilityLiveRegion="polite">
      <View style={styles.bar}>
        {[1, 2, 3, 4].map((segment) => (
          <View
            key={segment}
            style={[
              styles.segment,
              segment <= filled && { backgroundColor: SEGMENT_COLORS[filled] },
            ]}
          />
        ))}
      </View>
      <Text style={styles.label}>{label}</Text>
      {report.issues[0] ? <Text style={styles.issue}>{report.issues[0]}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.one,
  },
  bar: {
    flexDirection: 'row',
    gap: 6,
  },
  segment: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: Brand.border,
  },
  label: {
    color: Brand.textSecondary,
    fontSize: 13,
  },
  issue: {
    color: Brand.danger,
    fontSize: 13,
    lineHeight: 18,
  },
});
