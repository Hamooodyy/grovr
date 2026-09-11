import { useSignUp, useAuth } from "@clerk/expo";
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

export default function SignUpScreen() {
  const { signUp } = useSignUp();
  const { isLoaded } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [error, setError] = useState("");

  async function handleSignUp() {
    if (!isLoaded || !signUp) return;
    setError("");

    try {
      const { error: createError } = await signUp.password({
        emailAddress: email,
        password,
      });

      if (createError) {
        setError(createError.message ?? "Sign up failed");
        return;
      }

      const { error: sendError } = await signUp.verifications.sendEmailCode();
      if (sendError) {
        setError(sendError.message ?? "Could not send verification code");
        return;
      }

      setPendingVerification(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      setError(msg);
    }
  }

  async function handleVerify() {
    if (!isLoaded || !signUp) return;
    setError("");

    try {
      const { error: verifyError } = await signUp.verifications.verifyEmailCode({ code });

      if (verifyError) {
        setError(verifyError.message ?? "Verification failed");
        return;
      }

      const { error: finalizeError } = await signUp.finalize();
      if (finalizeError) {
        setError(finalizeError.message ?? "Could not complete sign up");
        return;
      }

      router.replace("/(tabs)");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      setError(msg);
    }
  }

  if (pendingVerification) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.inner}>
          <Text style={styles.heading}>Verify your email</Text>
          <Text style={styles.subtitle}>We sent a code to {email}</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TextInput
            style={styles.input}
            placeholder="Verification code"
            placeholderTextColor={colors.neutral[500]}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
          />

          <Button title="Verify" onPress={handleVerify} />
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>Grovr</Text>
        <Text style={styles.subtitle}>Create your account</Text>

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

        <Button title="Sign up" onPress={handleSignUp} />

        <View nativeID="clerk-captcha" />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/sign-in" asChild>
            <Pressable>
              <Text style={styles.link}>Sign in</Text>
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
  heading: {
    fontFamily: fonts.heading,
    fontSize: 28,
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
