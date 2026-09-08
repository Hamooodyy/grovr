import { useRouter } from "expo-router";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
} from "react-native";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🥬</Text>
        <Text style={styles.title}>Welcome to Grovr</Text>
        <Text style={styles.subtitle}>
          Know what you have.{"\n"}Know what to cook.
        </Text>
        <Text style={styles.body}>
          We'll ask a few quick questions to personalize your experience — what
          you like to eat, how you cook, and what's in your kitchen.
        </Text>
      </View>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.button, pressed && { opacity: 0.7 }]}
          onPress={() => router.push("/(onboarding)/household")}
        >
          <Text style={styles.buttonText}>Get started</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6fdf8",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0e1f14",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#16a34a",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 26,
  },
  body: {
    fontSize: 16,
    color: "#6a7c71",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  button: {
    backgroundColor: "#16a34a",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
