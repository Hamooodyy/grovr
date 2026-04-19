import { UserButton } from "@clerk/nextjs";
import ShoppingList from "@/components/ShoppingList";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4 sticky top-0 z-10">
        <h1 className="text-lg font-semibold text-zinc-900">Grovr</h1>
        <UserButton />
      </header>
      <main>
        <ShoppingList />
      </main>
    </div>
  );
}
