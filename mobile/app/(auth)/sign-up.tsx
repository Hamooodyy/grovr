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
          <Text style={styles.logo}>Verify your email</Text>
          <Text style={styles.subtitle}>We sent a code to {email}</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TextInput
            style={styles.input}
            placeholder="Verification code"
            placeholderTextColor="#6a7c71"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
          />

          <Pressable style={styles.button} onPress={handleVerify}>
            <Text style={styles.buttonText}>Verify</Text>
          </Pressable>
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

        <Pressable style={styles.button} onPress={handleSignUp}>
          <Text style={styles.buttonText}>Sign up</Text>
        </Pressable>

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
    textAlign: "left",
    writingDirection: "ltr",
  },
  button: {
    backgroundColor: "#16a34a",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
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
