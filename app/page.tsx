import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <div
      style={{ background: "#0e1f14", minHeight: "100vh" }}
      className="flex flex-col items-center justify-center px-6"
    >
      <main className="flex flex-col items-center gap-10 text-center max-w-md w-full">
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: "var(--green)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"
                fill="rgba(255,255,255,0.25)"
                stroke="white"
                strokeWidth="1.8"
              />
              <path d="M3 6h18" stroke="white" strokeWidth="1.8" />
              <path
                d="M16 10a4 4 0 01-8 0"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h1
            style={{
              fontFamily: "Arial, sans-serif",
              fontWeight: 800,
              fontSize: 48,
              letterSpacing: "-0.02em",
              color: "white",
              lineHeight: 1,
            }}
          >
            Grovr
          </h1>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 16, lineHeight: 1.6 }}>
            Build your grocery list and find the cheapest store near you — automatically.
          </p>
        </div>

        {/* Auth buttons */}
        <div className="flex flex-col gap-3 w-full">
          <SignUpButton mode="redirect">
            <button
              style={{
                width: "100%",
                background: "var(--green)",
                color: "white",
                border: "none",
                borderRadius: 14,
                padding: "15px 24px",
                fontFamily: "inherit",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Get started
            </button>
          </SignUpButton>
          <SignInButton mode="redirect">
            <button
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.85)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 14,
                padding: "15px 24px",
                fontFamily: "inherit",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Sign in
            </button>
          </SignInButton>
        </div>

        <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 12 }}>
          Saving you money on groceries, with none of the hassle.
        </p>
      </main>
    </div>
  );
}
