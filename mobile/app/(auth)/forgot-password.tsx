import { useSignIn } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { colors, fonts, type as typ, radii, layout } from "../../lib/theme";
import { Button } from "../../components/Button";

export default function ForgotPasswordScreen() {
  const { signIn } = useSignIn();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"email" | "code" | "password">("email");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSendCode() {
    if (!signIn || !email.trim()) return;
    setError("");
    setLoading(true);

    try {
      const { error: createError } = await signIn.create({
        identifier: email,
      });
      if (createError) {
        setError(createError.message ?? "Could not find that account");
        setLoading(false);
        return;
      }

      const { error: sendError } = await signIn.resetPasswordEmailCode.sendCode();
      if (sendError) {
        setError(sendError.message ?? "Failed to send reset code");
        setLoading(false);
        return;
      }

      setStep("code");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send reset code";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode() {
    if (!signIn || !code.trim()) return;
    setError("");
    setLoading(true);

    try {
      const { error: verifyError } = await signIn.resetPasswordEmailCode.verifyCode({
        code,
      });
      if (verifyError) {
        setError(verifyError.message ?? "Invalid code");
        setLoading(false);
        return;
      }

      setStep("password");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verification failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!signIn || !password.trim()) return;
    setError("");
    setLoading(true);

    try {
      const { error: resetError } = await signIn.resetPasswordEmailCode.submitPassword({
        password,
      });
      if (resetError) {
        setError(resetError.message ?? "Could not reset password");
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
      const msg = err instanceof Error ? err.message : "Reset failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const headings = {
    email: "Reset your password",
    code: "Check your email",
    password: "Set a new password",
  };

  const subs = {
    email: "Enter your email and we'll send a verification code.",
    code: `We sent a code to ${email}. Enter it below.`,
    password: "Choose a new password for your account.",
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.inner}>
        <Text style={styles.heading}>{headings[step]}</Text>
        <Text style={styles.sub}>{subs[step]}</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {step === "email" && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.neutral[500]}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Button
              title={loading ? "Sending..." : "Send reset code"}
              onPress={handleSendCode}
              disabled={loading || !email.trim()}
            />
          </>
        )}

        {step === "code" && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Verification code"
              placeholderTextColor={colors.neutral[500]}
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
            />
            <Button
              title={loading ? "Verifying..." : "Verify code"}
              onPress={handleVerifyCode}
              disabled={loading || !code.trim()}
            />
          </>
        )}

        {step === "password" && (
          <>
            <TextInput
              style={styles.input}
              placeholder="New password"
              placeholderTextColor={colors.neutral[500]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <Button
              title={loading ? "Resetting..." : "Reset password"}
              onPress={handleResetPassword}
              disabled={loading || !password.trim()}
            />
          </>
        )}

        <Button
          title="Back to sign in"
          variant="ghost"
          onPress={() => router.back()}
          style={{ marginTop: 12 }}
        />
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
  heading: {
    ...typ.h2,
    color: colors.text,
    textAlign: "center",
    marginBottom: 8,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.neutral[600],
    textAlign: "center",
    marginBottom: 32,
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
});
