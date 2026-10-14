import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { Stack, useRouter, useSegments } from "expo-router";
import { createContext, useContext, useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useFonts, Caprasimo_400Regular } from "@expo-google-fonts/caprasimo";
import {
  Figtree_400Regular,
  Figtree_600SemiBold,
  Figtree_700Bold,
} from "@expo-google-fonts/figtree";
import { getOnboarding } from "../lib/api";
import { colors, type as typ } from "../lib/theme";
import { Button } from "../components/Button";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in .env — get it from the Clerk dashboard"
  );
}

// Context so the ready screen can mark onboarding complete without re-fetching
const OnboardingContext = createContext<{
  markOnboardingDone: () => void;
}>({ markOnboardingDone: () => {} });

export function useOnboarding() {
  return useContext(OnboardingContext);
}

function AuthGate() {
  const { isLoaded, isSignedIn, getToken, sessionId } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);
  // Onboarding check failed (network/server) — don't assume a new user and send them to onboarding
  const [onboardingError, setOnboardingError] = useState(false);

  function markOnboardingDone() {
    setOnboardingDone(true);
  }

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setOnboardingChecked(false);
      setOnboardingDone(false);
      const inAuthGroup = segments[0] === "(auth)";
      if (!inAuthGroup) {
        router.replace("/(auth)/sign-in");
      }
      return;
    }

    // Wait for the session to be fully ready before requesting a token
    if (!sessionId) return;

    // User is signed in — check onboarding status
    if (!onboardingChecked) {
      if (onboardingError) return;
      getToken()
        .then((token) => {
          if (!token) return;
          return getOnboarding(token);
        })
        .then((data) => {
          if (!data) return;
          setOnboardingDone(data.profile.onboardingDone);
          setOnboardingChecked(true);
        })
        .catch(() => {
          setOnboardingError(true);
        });
      return;
    }

    // Onboarding status known — route accordingly
    const inAuthGroup = segments[0] === "(auth)";
    const inOnboarding = segments[0] === "(onboarding)";

    if (inAuthGroup) {
      if (onboardingDone) {
        router.replace("/(tabs)");
      } else {
        router.replace("/(onboarding)/welcome");
      }
    } else if (!onboardingDone && !inOnboarding) {
      router.replace("/(onboarding)/welcome");
    } else if (onboardingDone && inOnboarding) {
      router.replace("/(tabs)");
    }
  }, [isLoaded, isSignedIn, sessionId, onboardingChecked, onboardingDone, onboardingError, segments]);

  if (onboardingError) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32, backgroundColor: colors.bg }}>
        <Text style={{ ...typ.h3, color: colors.text, textAlign: "center", marginBottom: 20 }}>
          Couldn't connect
        </Text>
        <Button title="Try again" onPress={() => setOnboardingError(false)} />
      </View>
    );
  }

  return (
    <OnboardingContext.Provider value={{ markOnboardingDone }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen
          name="recipe-detail"
          options={{ presentation: "card" }}
        />
      </Stack>
    </OnboardingContext.Provider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Caprasimo_400Regular,
    Figtree_400Regular,
    Figtree_600SemiBold,
    Figtree_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.cta.DEFAULT} />
      </View>
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <AuthGate />
    </ClerkProvider>
  );
}
