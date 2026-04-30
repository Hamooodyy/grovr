"use client";

import { SignUpButton } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

export default function LandingPage() {
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => {
    const container = scrollRef.current;
    const nav = document.getElementById("landing-nav");
    if (!container || !nav) return;
    const onScroll = () =>
      nav.classList.toggle("nav-scrolled", container.scrollTop > 10);
    container.addEventListener("scroll", onScroll);
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const reveals = document.querySelectorAll(".lp-reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const siblings = [
              ...(entry.target.parentElement?.querySelectorAll(
                ".lp-reveal:not(.lp-visible)"
              ) ?? []),
            ];
            const idx = siblings.indexOf(entry.target as Element);
            setTimeout(
              () => entry.target.classList.add("lp-visible"),
              idx * 80
            );
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    reveals.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <style>{`
        .lp-root { scroll-behavior: smooth; }

        /* Nav */
        #landing-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 40px;
          background: rgba(246,253,248,0.85);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border);
          transition: box-shadow 0.2s;
          font-family: var(--font-raleway), sans-serif;
        }
        #landing-nav.nav-scrolled { box-shadow: var(--shadow-lg); }

        /* Scroll reveal */
        .lp-reveal { opacity: 0; transform: translateY(20px); transition: opacity 0.6s ease, transform 0.6s ease; }
        .lp-reveal.lp-visible { opacity: 1; transform: translateY(0); }

        /* Hero bg effects */
        .lp-hero::before {
          content: '';
          position: absolute; top: -10%; left: 50%; transform: translateX(-50%);
          width: 900px; height: 700px; border-radius: 50%;
          background: radial-gradient(ellipse, rgba(22,163,74,0.09) 0%, transparent 70%);
          pointer-events: none;
        }
        .lp-hero::after {
          content: '';
          position: absolute; inset: 0;
          background-image:
            linear-gradient(var(--border) 1px, transparent 1px),
            linear-gradient(90deg, var(--border) 1px, transparent 1px);
          background-size: 40px 40px;
          opacity: 0.45;
          pointer-events: none;
          -webkit-mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, black 0%, transparent 100%);
          mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, black 0%, transparent 100%);
        }

        /* Hero headline animation */
        @keyframes lp-fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .lp-anim-1 { animation: lp-fadeUp 0.6s 0.1s ease both; }
        .lp-anim-2 { animation: lp-fadeUp 0.6s 0.2s ease both; }
        .lp-anim-3 { animation: lp-fadeUp 0.6s 0.3s ease both; }

        /* Step connector */
        .lp-steps-grid::before {
          content: '';
          position: absolute; top: 44px;
          left: calc(50% / 3 + 16.5%); right: calc(50% / 3 + 16.5%);
          height: 1.5px;
          background: linear-gradient(90deg, var(--green) 0%, var(--border) 50%, var(--green) 100%);
          opacity: 0.4;
          pointer-events: none;
        }

        @media (max-width: 700px) {
          #landing-nav { padding: 14px 20px; }
          .lp-steps-grid { grid-template-columns: 1fr !important; }
          .lp-steps-grid::before { display: none; }
          .lp-savings-card { padding: 36px 24px !important; }
          .lp-features-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 480px) {
          .lp-features-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div
        ref={scrollRef}
        className="lp-root"
        style={{
          overflowY: "auto",
          height: "100vh",
          fontFamily: "var(--font-raleway), sans-serif",
          background: "var(--bg)",
          color: "var(--text)",
        }}
      >
        {/* ── Nav ── */}
        <nav id="landing-nav">
          <a
            href="#"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "var(--green)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <CartIcon size={20} color="white" />
            </div>
            <span
              style={{
                fontWeight: 800,
                fontSize: 20,
                color: "var(--text)",
                letterSpacing: "-0.02em",
              }}
            >
              Grovr
            </span>
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => scrollTo("how-it-works")}
              style={{
                background: "none",
                border: "none",
                padding: "10px 18px",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                color: "var(--muted)",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              How it works
            </button>
            <SignUpButton mode="redirect">
              <button
                style={{
                  background: "var(--green)",
                  color: "white",
                  border: "none",
                  padding: "11px 22px",
                  borderRadius: 11,
                  fontFamily: "inherit",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                Get started
                <ChevronIcon />
              </button>
            </SignUpButton>
          </div>
        </nav>

        {/* ── Hero ── */}
        <section
          className="lp-hero"
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "120px 24px 80px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <h1
            className="lp-anim-1"
            style={{
              fontWeight: 800,
              fontSize: "clamp(38px, 6vw, 72px)",
              lineHeight: 1.08,
              letterSpacing: "-0.03em",
              color: "var(--text)",
              maxWidth: 820,
              marginBottom: 24,
              position: "relative",
              zIndex: 1,
            }}
          >
            Stop overpaying for groceries. Meet{" "}
            <em
              style={{
                fontStyle: "normal",
                color: "var(--green)",
                position: "relative",
              }}
            >
              Grovr
            </em>
            .
          </h1>

          <p
            className="lp-anim-2"
            style={{
              fontSize: "clamp(16px, 2vw, 20px)",
              color: "var(--muted)",
              maxWidth: 640,
              lineHeight: 1.6,
              marginBottom: 40,
              position: "relative",
              zIndex: 1,
              fontWeight: 400,
            }}
          >
            Grovr finds the best price for your cart so you don&apos;t have to.
          </p>

          <div
            className="lp-anim-3"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              justifyContent: "center",
              position: "relative",
              zIndex: 1,
            }}
          >
            <SignUpButton mode="redirect">
              <button
                style={{
                  background: "var(--green)",
                  color: "white",
                  border: "none",
                  padding: "16px 32px",
                  borderRadius: 14,
                  fontFamily: "inherit",
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 4px 20px rgba(22,163,74,0.3)",
                }}
              >
                <CartIcon size={16} color="rgba(255,255,255,0.85)" />
                Start saving today
              </button>
            </SignUpButton>
            <button
              onClick={() => scrollTo("how-it-works")}
              style={{
                background: "white",
                color: "var(--text)",
                border: "1.5px solid var(--border)",
                padding: "15px 28px",
                borderRadius: 14,
                fontFamily: "inherit",
                fontSize: 16,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                boxShadow: "var(--shadow)",
              }}
            >
              See how it works
            </button>
          </div>
        </section>

        {/* ── How it works ── */}
        <section
          id="how-it-works"
          style={{ padding: "100px 24px", maxWidth: 1100, margin: "0 auto" }}
        >
          <p
            className="lp-reveal"
            style={{
              textAlign: "center",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--green)",
              marginBottom: 14,
            }}
          >
            How it works
          </p>
          <h2
            className="lp-reveal"
            style={{
              fontWeight: 800,
              fontSize: "clamp(28px, 4vw, 44px)",
              letterSpacing: "-0.02em",
              textAlign: "center",
              color: "var(--text)",
              marginBottom: 16,
              lineHeight: 1.15,
            }}
          >
            Three steps to a cheaper cart
          </h2>
          <p
            className="lp-reveal"
            style={{
              textAlign: "center",
              color: "var(--muted)",
              fontSize: 17,
              maxWidth: 480,
              margin: "0 auto 64px",
              lineHeight: 1.6,
            }}
          >
            No app downloads, no switching tabs, no math. Just add your items
            and we handle the rest.
          </p>

          <div
            className="lp-steps-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 2,
              position: "relative",
            }}
          >
            <StepCard
              index="01"
              title="Build your list"
              desc="Search for any item and add it to your list. Have a brand you love? Just note it — we'll prioritize it when matching products."
            />
            <StepCard
              index="02"
              title="We find the best deal"
              desc="Grovr scans every grocery store within your radius, matches each item to the closest product, and tallies the total — instantly."
            />
            <StepCard
              index="03"
              title="Order with one tap"
              desc="We hand you off to the winning store's online storefront. Fill your cart, place your order, and rest easy knowing you got the best price."
            />
          </div>
        </section>

        {/* ── Features strip ── */}
        <div style={{ background: "#0e1f14", padding: "80px 24px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <h2
              className="lp-reveal"
              style={{
                fontWeight: 800,
                fontSize: "clamp(26px, 3.5vw, 40px)",
                color: "white",
                letterSpacing: "-0.02em",
                marginBottom: 12,
              }}
            >
              Everything you need.
              <br />
              Nothing you don&apos;t.
            </h2>
            <p
              className="lp-reveal"
              style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: 16,
                marginBottom: 48,
                maxWidth: 440,
                lineHeight: 1.6,
              }}
            >
              Grovr is designed to be fast, simple, and genuinely useful — no
              bloat, no subscriptions.
            </p>
            <div
              className="lp-features-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 16,
              }}
            >
              <FeatureItem
                icon={<PinIcon color="rgba(255,255,255,0.7)" />}
                title="Radius search"
                desc="Adjust how far you're willing to shop. See every store on a live map."
              />
              <FeatureItem
                icon={<BarChartIcon color="rgba(255,255,255,0.7)" />}
                title="Price comparison"
                desc="Full basket totals across all stores, not just individual item prices."
              />
              <FeatureItem
                icon={<HeartIcon color="rgba(255,255,255,0.7)" />}
                title="Brand preferences"
                desc="Tell us what you like and we'll match to the closest available product."
              />
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <footer
          style={{
            background: "#0e1f14",
            padding: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "var(--green)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CartIcon size={18} color="white" />
            </div>
            <div>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: 18,
                  color: "white",
                  letterSpacing: "-0.02em",
                }}
              >
                Grovr
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>
                Saving you money on groceries, with none of the hassle.
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            {["Privacy", "Terms", "Help"].map((link) => (
              <a
                key={link}
                href="#"
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.4)",
                  textDecoration: "none",
                }}
              >
                {link}
              </a>
            ))}
          </div>
        </footer>
      </div>
    </>
  );
}

/* ── Sub-components ── */

function StepCard({
  index,
  title,
  desc,
}: {
  index: string;
  title: string;
  desc: string;
}) {
  return (
    <div
      className="lp-reveal"
      style={{
        background: "white",
        borderRadius: 20,
        padding: "32px 28px",
        border: "1.5px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          background: "var(--green-light)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <span style={{ fontWeight: 800, fontSize: 13, color: "var(--green)" }}>
          {index}
        </span>
      </div>
      <div>
        <h3
          style={{
            fontWeight: 700,
            fontSize: 20,
            color: "var(--text)",
            lineHeight: 1.2,
            marginBottom: 8,
          }}
        >
          {title}
        </h3>
        <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.65 }}>
          {desc}
        </p>
      </div>
    </div>
  );
}

function FeatureItem({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div
      className="lp-reveal"
      style={{
        background: "rgba(255,255,255,0.05)",
        borderRadius: 14,
        padding: 20,
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: "rgba(255,255,255,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
        }}
      >
        {icon}
      </div>
      <div
        style={{ fontWeight: 700, fontSize: 14, color: "white", marginBottom: 6 }}
      >
        {title}
      </div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.55 }}>
        {desc}
      </div>
    </div>
  );
}

/* ── Icons ── */
function CartIcon({
  size = 24,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"
        fill="rgba(255,255,255,0.25)"
        stroke={color}
        strokeWidth="1.8"
      />
      <path d="M3 6h18" stroke={color} strokeWidth="1.8" />
      <path
        d="M16 10a4 4 0 01-8 0"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="m9 18 6-6-6-6"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HeartIcon({ color = "var(--green)" }: { color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
        stroke={color}
        strokeWidth="1.8"
      />
    </svg>
  );
}

function BarChartIcon({ color = "var(--green)" }: { color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M18 20V10M12 20V4M6 20v-6"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PinIcon({ color = "var(--green)" }: { color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="10" r="3" stroke={color} strokeWidth="2" />
      <path
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z"
        stroke={color}
        strokeWidth="2"
      />
    </svg>
  );
}

