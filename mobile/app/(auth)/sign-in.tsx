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
import { colors, fonts, type as typ, radii, layout } from "../../lib/theme";
import { Button } from "../../components/Button";

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
        <Text style={styles.subtitle}>Your kitchen companion</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.neutral[500]}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.neutral[500]}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Button
          title={loading ? "Signing in..." : "Sign in"}
          onPress={handleSignIn}
          disabled={loading}
        />

        <Link href="/(auth)/forgot-password" asChild>
          <Pressable style={styles.forgotRow}>
            <Text style={styles.link}>Forgot password?</Text>
          </Pressable>
        </Link>

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
    backgroundColor: colors.bg,
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: layout.screenGutter,
  },
  logo: {
    fontFamily: fonts.heading,
    fontSize: 40,
    color: colors.text,
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: colors.neutral[600],
    textAlign: "center",
    marginBottom: 40,
  },
  input: {
    minHeight: 52,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radii.pill,
    paddingHorizontal: 18,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.text,
    marginBottom: 14,
  },
  error: {
    fontFamily: fonts.body,
    color: "#b91c1c",
    textAlign: "center",
    marginBottom: 16,
    fontSize: 14,
  },
  forgotRow: {
    alignItems: "center",
    marginTop: 16,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  footerText: {
    fontFamily: fonts.body,
    color: colors.neutral[600],
    fontSize: 14,
  },
  link: {
    fontFamily: fonts.bodySemiBold,
    color: colors.cta.DEFAULT,
    fontSize: 14,
  },
});
