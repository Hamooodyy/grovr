import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { colors, fonts, radii, layout } from "../lib/theme";

interface StepHeaderProps {
  step: number;
  total?: number;
}

export function StepHeader({ step, total = 5 }: StepHeaderProps) {
  const router = useRouter();
  const progress = step / total;

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={8}
        >
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.stepLabel}>
          STEP {step} OF {total}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingTop: 62,
    paddingHorizontal: layout.onboardingGutter,
    gap: 14,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backButton: {
    minHeight: 44,
    justifyContent: "center",
  },
  backText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.accent.DEFAULT,
  },
  stepLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    lineHeight: 14,
    letterSpacing: 0.96,
    color: colors.neutral[600],
    textTransform: "uppercase",
  },
  track: {
    height: 6,
    backgroundColor: colors.neutral[300],
    borderRadius: radii.pill,
    overflow: "hidden",
  },
  fill: {
    height: 6,
    backgroundColor: colors.accent.DEFAULT,
    borderRadius: radii.pill,
  },
});
