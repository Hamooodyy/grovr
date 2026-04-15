import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-screen bg-zinc-50">
      <main className="flex flex-col items-center gap-8 px-6 text-center">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900">
            Grovr
          </h1>
          <p className="text-lg text-zinc-500 max-w-sm">
            Build your grocery list and find the cheapest store near you —
            automatically.
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <SignUpButton mode="redirect">
            <button className="w-full rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-700">
              Get started
            </button>
          </SignUpButton>
          <SignInButton mode="redirect">
            <button className="w-full rounded-full border border-zinc-300 px-6 py-3 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-100">
              Sign in
            </button>
          </SignInButton>
        </div>
      </main>
    </div>
  );
}
