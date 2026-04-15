import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";

export default async function Dashboard() {
  const { userId } = await auth();

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-zinc-900">Grovr</h1>
        <UserButton />
      </header>
      <main className="flex flex-col items-center justify-center py-24 px-6 text-center">
        <p className="text-zinc-500 text-sm">User: {userId}</p>
        <h2 className="mt-4 text-2xl font-semibold text-zinc-900">
          Your shopping list
        </h2>
        <p className="mt-2 text-zinc-500">Coming soon — Phase 6</p>
      </main>
    </div>
  );
}
