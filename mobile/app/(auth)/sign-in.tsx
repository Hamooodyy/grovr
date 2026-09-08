import { useSignIn, useAuth } from "@clerk/expo";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

export default function SignInScreen() {
  const { signIn } = useSignIn();
  const { isLoaded } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    if (!isLoaded || !signIn) return;
    setError("");
    setLoading(true);

    try {
      const { error: signInError } = await signIn.password({
        emailAddress: email,
        password,
      });

      if (signInError) {
        setError(signInError.message ?? "Sign in failed");
        setLoading(false);
        return;
      }

      const { error: finalizeError } = await signIn.finalize();
      if (finalizeError) {
        setError(finalizeError.message ?? "Could not complete sign in");
        setLoading(false);
        return;
      }

      router.replace("/(tabs)");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>Grovr</Text>
        <Text style={styles.subtitle}>Your grocery companion</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#6a7c71"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#6a7c71"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Pressable
          style={({ pressed }) => [
            styles.button,
            loading && styles.buttonDisabled,
            pressed && { opacity: 0.7 },
          ]}
          onPress={handleSignIn}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Signing in..." : "Sign in"}
          </Text>
        </Pressable>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Link href="/(auth)/sign-up" asChild>
            <Pressable>
              <Text style={styles.link}>Sign up</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6fdf8",
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  logo: {
    fontSize: 36,
    fontWeight: "800",
    color: "#0e1f14",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#6a7c71",
    textAlign: "center",
    marginBottom: 40,
  },
  input: {
    backgroundColor: "white",
    borderWidth: 1.5,
    borderColor: "#ddeee4",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#0e1f14",
    marginBottom: 14,
  },
  button: {
    backgroundColor: "#16a34a",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  error: {
    color: "#dc2626",
    textAlign: "center",
    marginBottom: 16,
    fontSize: 14,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  footerText: {
    color: "#6a7c71",
    fontSize: 14,
  },
  link: {
    color: "#16a34a",
    fontSize: 14,
    fontWeight: "600",
  },
});
