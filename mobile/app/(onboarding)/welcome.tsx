import { useRouter } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { Leaf } from "lucide-react-native";
import { colors, fonts, type as typ, radii, layout } from "../../lib/theme";
import { Button } from "../../components/Button";

const BENEFITS = [
  "Cook with what you've got",
  "Buy only what you need",
  "Forget about asking \"what's for dinner?\"",
] as const;

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.mark}>
          <Leaf size={46} strokeWidth={2.75} color={colors.accent2[800]} />
        </View>

        <Text style={styles.title}>Your kitchen, simplified.</Text>

        <Text style={styles.body}>
          Tell us what's in your kitchen and what you like. We'll handle the
          rest.
        </Text>

        <View style={styles.benefits}>
          {BENEFITS.map((text, i) => (
            <View key={text} style={styles.benefitRow}>
              <View style={styles.benefitCircle}>
                <Text style={styles.benefitNum}>{i + 1}</Text>
              </View>
              <Text style={styles.benefitText}>{text}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          title="Let's go"
          onPress={() => router.push("/(onboarding)/household")}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingTop: 74,
    paddingHorizontal: 28,
  },
  mark: {
    width: 96,
    height: 96,
    borderRadius: radii.pill,
    backgroundColor: colors.accent2[200],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    ...typ.h1,
    color: colors.text,
    marginBottom: 16,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 25,
    color: colors.neutral[700],
    marginBottom: 32,
  },
  benefits: {
    gap: 14,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  benefitCircle: {
    width: 30,
    height: 30,
    borderRadius: radii.pill,
    backgroundColor: colors.cta[200],
    alignItems: "center",
    justifyContent: "center",
  },
  benefitNum: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.cta[800],
  },
  benefitText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
  },
  footer: {
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
});
