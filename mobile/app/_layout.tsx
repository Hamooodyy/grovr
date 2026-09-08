import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { Slot, useRouter, useSegments } from "expo-router";
import { createContext, useContext, useEffect, useState } from "react";
import { getOnboarding } from "../lib/api";

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
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);

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

    // User is signed in — check onboarding status
    if (!onboardingChecked) {
      getToken().then((token) => {
        if (!token) return;
        getOnboarding(token)
          .then((data) => {
            setOnboardingDone(data.profile.onboardingDone);
            setOnboardingChecked(true);
          })
          .catch(() => {
            setOnboardingDone(false);
            setOnboardingChecked(true);
          });
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
  }, [isLoaded, isSignedIn, onboardingChecked, onboardingDone, segments]);

  return (
    <OnboardingContext.Provider value={{ markOnboardingDone }}>
      <Slot />
    </OnboardingContext.Provider>
  );
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <AuthGate />
    </ClerkProvider>
  );
}
