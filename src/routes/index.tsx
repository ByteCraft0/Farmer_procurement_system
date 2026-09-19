import { createFileRoute, Link } from "@tanstack/react-router";

import { useQuery } from "@tanstack/react-query";

import { AppShell } from "@/components/AppShell";

import { useSession } from "@/hooks/useAuth";

import { fetchCentres, formatToken } from "@/lib/queue";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user } = useSession();

  const centres = useQuery({
    queryKey: ["centres"],
    queryFn: fetchCentres,
    enabled: !!user,
    refetchInterval: 5000,
  });

  return (
    <AppShell>
      <section className="mt-10 grid animate-rise gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="flex flex-col justify-between gap-8 rounded-2xl glass p-8">
          <div className="space-y-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-grain">
              Live at the counter
            </p>

            <h1 className="text-balance font-display text-5xl leading-[0.92] tracking-tight">
              Your turn,
              <br />
              line by line.
            </h1>

            <p className="max-w-[34ch] text-pretty text-muted-foreground">
              Book a procurement slot, get a token, and watch the queue move.
              Built for the field, built for the counter.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to={user ? "/farmer" : "/auth"}
              className="rounded-lg bg-grain px-5 py-3 text-sm font-semibold text-ink"
            >
              Get a token
            </Link>

            <Link
              to={user ? "/staff" : "/auth"}
              className="rounded-lg border border-border glass-soft px-5 py-3 text-sm font-semibold text-paper"
            >
              Staff desk
            </Link>
          </div>
        </div>

        <div className="flex flex-col rounded-2xl glass p-7">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Procurement centres
            </p>

            <span className="rounded-full bg-grain/15 px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-grain">
              {user ? "Live" : "Sign in"}
            </span>
          </div>

          <ul className="mt-4 space-y-2">
            {!user && (
              <li className="rounded-xl inset-panel px-5 py-6 text-sm text-muted-foreground">
                Sign in to see the live board for each centre — current token,
                queue length and waiting time.
              </li>
            )}

            {centres.data?.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-xl inset-panel px-5 py-4"
              >
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {c.location}
                  </p>

                  <p className="mt-1 text-sm font-semibold">{c.name}</p>
                </div>

                <div className="text-right">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Now serving
                  </p>

                  <p className="font-display text-3xl leading-none text-grain">
                    {formatToken(c.current_token)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FARMER HELPLINE */}
      <section className="mt-6 animate-rise">
        <div className="relative overflow-hidden rounded-2xl border border-grain/40 bg-grain/10 p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-grain text-2xl text-ink">
                ☎
              </div>

              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-grain">
                  Farmer Helpline
                </p>

                <h2 className="mt-1 font-display text-2xl tracking-tight">
                  Need help booking a slot?
                </h2>

                <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                  Call our support representative for help with registration,
                  checking available slots, or booking a procurement slot on
                  your behalf.
                </p>
              </div>
            </div>

            <a
              href="tel:1800XXXXXXX"
              className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-grain px-6 py-4 font-mono text-sm font-bold tracking-wide text-ink transition-transform hover:scale-[1.02]"
            >
              <span>📞</span>
              1800-XXX-XXXX
            </a>
          </div>

          <p className="mt-4 border-t border-grain/20 pt-3 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
            Prototype helpline number 
            
          </p>
        </div>
      </section>

      <section className="mt-6 grid animate-rise gap-6 md:grid-cols-3">
        <Step
          n="01"
          title="Book a slot"
          body="Choose your centre, date and time. Capacity per slot keeps the counter from flooding."
        />

        <Step
          n="02"
          title="Get a token"
          body="A token number is issued instantly and locked to your booking."
        />

        <Step
          n="03"
          title="Watch the queue"
          body="Current token, farmers ahead, waiting time and procurement status refresh every few seconds."
        />
      </section>
    </AppShell>
  );
}

function Step({
  n,
  title,
  body,
}: {
  n: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl glass-soft p-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-grain">
        {n}
      </p>

      <h2 className="mt-3 font-display text-2xl tracking-tight">{title}</h2>

      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}