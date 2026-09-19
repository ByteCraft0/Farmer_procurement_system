import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import {
  useSession,
  loginUser,
  registerUser,
} from "@/hooks/useAuth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — AGRONEX" },
      {
        name: "description",
        content:
          "Sign in as a farmer or centre staff to book slots and manage the grain queue.",
      },
      {
        property: "og:title",
        content: "Sign in — AGRONEX",
      },
      {
        property: "og:description",
        content:
          "Sign in as a farmer or centre staff to book slots and manage the grain queue.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useSession();

  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [role, setRole] = useState<"farmer" | "staff">("farmer");

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [fullName, setFullName] = useState("");
  const [village, setVillage] = useState("");

  const [busy, setBusy] = useState(false);

  // If already logged in, redirect to the correct dashboard
  useEffect(() => {
    if (user) {
      navigate({
        to: user.role === "staff" ? "/staff" : "/farmer",
      });
    }
  }, [user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    setBusy(true);

    try {
      // =========================
      // SIGN UP
      // =========================

      if (mode === "signup") {
        await registerUser(
          fullName,
          phone,
          password,
          role,
          village
        );

        toast.success("Account created successfully");

        // Switch to sign-in after registration
        setMode("signin");

        // Clear password
        setPassword("");

      } else {
        // =========================
        // SIGN IN
        // =========================

        const data = await loginUser(phone, password);

        toast.success("Welcome back");

        // Redirect according to role
        navigate({
          to: data.user.role === "staff" ? "/staff" : "/farmer",
        });
      }

    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto mt-12 max-w-md animate-rise rounded-2xl glass p-8">

        {/* Heading */}
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-grain">
          {mode === "signup" ? "New here" : "Welcome back"}
        </p>

        <h1 className="mt-4 font-display text-4xl leading-[0.95] tracking-tight">
          {mode === "signup"
            ? "Create your account."
            : "Sign in to your queue."}
        </h1>

        {/* Role Selection */}
        {mode === "signup" && (
          <div className="mt-6 grid grid-cols-2 gap-3">

            {(["farmer", "staff"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={
                  r === role
                    ? "rounded-xl bg-grain px-4 py-3 text-sm font-semibold text-ink"
                    : "rounded-xl border border-border bg-secondary px-4 py-3 text-sm font-semibold text-paper/70"
                }
              >
                {r === "farmer"
                  ? "I am a farmer"
                  : "I am centre staff"}
              </button>
            ))}

          </div>
        )}

        {/* Form */}
        <form onSubmit={submit} className="mt-5 space-y-3">

          {/* Signup-only fields */}
          {mode === "signup" && (
            <>
              <Field
                label="Full name"
                value={fullName}
                onChange={setFullName}
                required
              />

              <Field
                label="Village / town"
                value={village}
                onChange={setVillage}
              />
            </>
          )}

          {/* Phone */}
          <Field
            label="Phone number"
            type="tel"
            value={phone}
            onChange={setPhone}
            required
          />

          {/* Password */}
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            required
          />

          {/* Submit */}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-grain px-5 py-3 text-sm font-semibold text-ink disabled:opacity-60"
          >
            {busy
              ? "Please wait…"
              : mode === "signup"
                ? "Create account"
                : "Sign in"}
          </button>

        </form>

        {/* Switch Sign Up / Sign In */}
        <button
          type="button"
          onClick={() =>
            setMode(mode === "signup" ? "signin" : "signup")
          }
          className="mt-5 w-full font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-paper"
        >
          {mode === "signup"
            ? "Already have an account? Sign in"
            : "Need an account? Sign up"}
        </button>

      </div>
    </AppShell>
  );
}


// =========================
// INPUT FIELD COMPONENT
// =========================

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">

      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>

      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-paper outline-none focus:border-grain"
      />

    </label>
  );
}