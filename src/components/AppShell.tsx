import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useSession, logoutUser } from "@/hooks/useAuth";

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const navigate = useNavigate();

  function handleLogout() {
    logoutUser();
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-5 py-8">

        <header className="flex animate-rise items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-md bg-grain font-display text-ink">
              A
            </span>

            <span className="leading-none">
              <span className="block font-display text-xl tracking-wide">
                AGRONEX
              </span>

              <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Grain procurement queue
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-2">
            {user ? (
              <>
                <Link
                  to="/farmer"
                  className="rounded-lg px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-paper/70 hover:text-paper"
                  activeProps={{ className: "text-grain" }}
                >
                  Farmer
                </Link>

                <Link
                  to="/staff"
                  className="rounded-lg px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-paper/70 hover:text-paper"
                  activeProps={{ className: "text-grain" }}
                >
                  Staff desk
                </Link>

                <button
                  onClick={handleLogout}
                  className="rounded-lg border border-border bg-secondary px-4 py-2 text-xs font-semibold text-paper"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                className="rounded-lg bg-grain px-4 py-2 text-xs font-semibold text-ink"
              >
                Sign in
              </Link>
            )}
          </nav>
        </header>

        {/* PROTOTYPE BANNER */}
        <div className="prototype-banner">
          ⚠️{" "}
          <span className="prototype-banner-strong">
            THIS IS A PROTOTYPE
          </span>{" "}
          — Some features are simulated for demonstration purposes.
        </div>

        {children}

      </div>
    </div>
  );
}

