import { useRouter, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from "react-native";

const POPULAR_STORES = [
  "Aldi",
  "Costco",
  "Kroger",
  "Publix",
  "Safeway",
  "Target",
  "Trader Joe's",
  "Walmart",
  "Wegmans",
  "Whole Foods",
] as const;

export default function PreferredStoreScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [selected, setSelected] = useState<string | null>(null);
  const [customStore, setCustomStore] = useState("");

  const store = selected === "__custom" ? customStore.trim() : selected;
  const canContinue = !!store;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        <Text style={styles.step}>Step 4 of 5</Text>
        <Text style={styles.title}>Where do you shop?</Text>
        <Text style={styles.subtitle}>
          Pick your go-to grocery store. You can change this later.
        </Text>

        <View style={styles.list}>
          {POPULAR_STORES.map((name) => (
            <Pressable
              key={name}
              style={[
                styles.listItem,
                selected === name && styles.listItemSelected,
              ]}
              onPress={() => {
                setSelected(name);
                setCustomStore("");
              }}
            >
              <Text
                style={[
                  styles.listLabel,
                  selected === name && styles.listLabelSelected,
                ]}
              >
                {name}
              </Text>
            </Pressable>
          ))}

          <Pressable
            style={[
              styles.listItem,
              selected === "__custom" && styles.listItemSelected,
            ]}
            onPress={() => setSelected("__custom")}
          >
            <Text
              style={[
                styles.listLabel,
                selected === "__custom" && styles.listLabelSelected,
              ]}
            >
              Other...
            </Text>
          </Pressable>
        </View>

        {selected === "__custom" && (
          <TextInput
            style={styles.input}
            placeholder="Type your store name"
            placeholderTextColor="#6a7c71"
            value={customStore}
            onChangeText={setCustomStore}
            autoFocus
          />
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            !canContinue && styles.buttonDisabled,
            pressed && canContinue && { opacity: 0.7 },
          ]}
          onPress={() => {
            if (!canContinue) return;
            router.push({
              pathname: "/(onboarding)/pantry-setup",
              params: { ...params, preferredStore: store },
            });
          }}
          disabled={!canContinue}
        >
          <Text style={styles.buttonText}>Continue</Text>
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
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backButton: {
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  backText: {
    fontSize: 16,
    color: "#16a34a",
    fontWeight: "500",
  },
  step: {
    fontSize: 14,
    color: "#16a34a",
    fontWeight: "600",
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0e1f14",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: "#6a7c71",
    marginBottom: 20,
  },
  list: {
    gap: 10,
  },
  listItem: {
    backgroundColor: "white",
    borderWidth: 1.5,
    borderColor: "#ddeee4",
    borderRadius: 12,
    padding: 16,
  },
  listItemSelected: {
    borderColor: "#16a34a",
    backgroundColor: "#f0fdf4",
  },
  listLabel: {
    fontSize: 16,
    color: "#0e1f14",
  },
  listLabelSelected: {
    color: "#16a34a",
    fontWeight: "600",
  },
  input: {
    backgroundColor: "white",
    borderWidth: 1.5,
    borderColor: "#ddeee4",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#0e1f14",
    marginTop: 12,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  button: {
    backgroundColor: "#16a34a",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
