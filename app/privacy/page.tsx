import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy · Grovr",
};

const CONTACT_EMAIL = "ahmadnayfeh092@gmail.com";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 text-neutral-800">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-neutral-500 mb-8">Effective October 13, 2026</p>

      <section className="space-y-4 mb-8">
        <p>
          Grovr helps you keep track of what&apos;s in your kitchen and suggests recipes based on
          it. This policy explains what information the Grovr app collects, how it&apos;s used, and
          the choices you have.
        </p>
      </section>

      <h2 className="text-xl font-semibold mb-3">Information we collect</h2>
      <ul className="list-disc pl-6 space-y-2 mb-8">
        <li>
          <strong>Account information:</strong> your name and email address, used to create and
          sign in to your account.
        </li>
        <li>
          <strong>Preferences:</strong> answers you give during onboarding, such as household size,
          how often you cook, preferred cooking time, favorite cuisines, foods you dislike, and
          dietary restrictions.
        </li>
        <li>
          <strong>Kitchen and list data:</strong> items you add to your kitchen, your shopping list,
          recipes you save, and feedback you give on recipes (including any reasons you provide).
        </li>
      </ul>
      <p className="mb-8">
        We do not collect your location, contacts, photos, or payment information, and we do not
        use advertising or third-party analytics tracking.
      </p>

      <h2 className="text-xl font-semibold mb-3">How we use your information</h2>
      <ul className="list-disc pl-6 space-y-2 mb-8">
        <li>To run the app: storing your kitchen, lists, and saved recipes.</li>
        <li>To generate recipe suggestions tailored to your kitchen and preferences.</li>
        <li>To estimate ingredient freshness. These are estimates, not food-safety dates.</li>
      </ul>
      <p className="mb-8">We do not sell your personal information.</p>

      <h2 className="text-xl font-semibold mb-3">Service providers</h2>
      <p className="mb-3">We rely on a small number of providers to operate Grovr:</p>
      <ul className="list-disc pl-6 space-y-2 mb-8">
        <li>
          <strong>Clerk</strong> for account sign-in and authentication.
        </li>
        <li>
          <strong>OpenAI</strong> to generate recipe suggestions. Your kitchen items, preferences,
          and recipe feedback are sent to OpenAI when recipes are generated. Your email address is
          not.
        </li>
        <li>
          <strong>Neon</strong> to store app data in a database.
        </li>
        <li>
          <strong>Vercel</strong> to host our servers.
        </li>
      </ul>

      <h2 className="text-xl font-semibold mb-3">Deleting your data</h2>
      <p className="mb-8">
        You can delete your account at any time from the Profile tab in the app (Delete account).
        This permanently deletes your account and all associated data, including your kitchen,
        lists, saved recipes, preferences, and feedback.
      </p>

      <h2 className="text-xl font-semibold mb-3">Children</h2>
      <p className="mb-8">Grovr is not directed to children under 13.</p>

      <h2 className="text-xl font-semibold mb-3">Changes</h2>
      <p className="mb-8">
        If we change this policy, we&apos;ll update the effective date above.
      </p>

      <h2 className="text-xl font-semibold mb-3">Contact</h2>
      <p>
        Questions? Email{" "}
        <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </main>
  );
}
