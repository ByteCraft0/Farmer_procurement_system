import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { useRole, useSession } from "@/hooks/useAuth";

import {
  STATUS_FLOW,
  STATUS_LABEL,
  fetchBookings,
  fetchSlots,
  fetchCentres,
  formatToken,
  type Booking,
  type BookingStatus,
} from "@/lib/queue";

export const Route = createFileRoute("/staff")({
  head: () => ({
    meta: [
      { title: "Staff queue control — AGRONEX" },
      {
        name: "description",
        content:
          "Centre staff dashboard: call the next token and move each farmer from arrival to payment.",
      },
      { property: "og:title", content: "Staff queue control — AGRONEX" },
      {
        property: "og:description",
        content:
          "Centre staff dashboard: call the next token and move each farmer from arrival to payment.",
      },
    ],
  }),
  component: StaffPage,
});

function StaffPage() {
  const { user, loading } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const role = useRole(user);
  const [centreId, setCentreId] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const centres = useQuery({ queryKey: ["centres"], queryFn: fetchCentres, refetchInterval: 5000 });

  useEffect(() => {
    if (!centreId && centres.data?.length) setCentreId(centres.data[0]!.id);
  }, [centres.data, centreId]);

 const bookings = useQuery({
  queryKey: ["bookings", centreId],
  queryFn: () => fetchBookings(centreId),
  enabled: !!centreId,
});
const slots = useQuery({
  queryKey: ["slots", centreId],
  queryFn: () => fetchSlots(centreId, new Date().toISOString().split("T")[0]),
  enabled: !!centreId,
});

  const centre = centres.data?.find((c) => c.id === centreId);
  const waiting = (bookings.data ?? []).filter(
    (b) => b.status === "booked" || b.status === "waiting",
  );
  const inProgress = (bookings.data ?? []).filter(
    (b) => b.status === "serving",
  );
  const done = (bookings.data ?? []).filter((b) => b.status === "completed");

  const serveNext = useMutation({
  mutationFn: async () => {
    const next = waiting[0];

    if (!next || !centre) {
      throw new Error("No one is waiting");
    }

    // Convert token like "A-001" to number 1
    const tokenNumber = Number(
      String(next.token_number).replace("A-", "")
    );

    // Update current token in MySQL
    const centreResponse = await fetch(
      `http://localhost:5000/api/centres/${centre.id}/current-token`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          current_token: tokenNumber,
        }),
      }
    );

    const centreData = await centreResponse.json();

    if (!centreResponse.ok) {
      throw new Error(
        centreData.error || "Failed to update current token"
      );
    }

    // Change booking status: waiting → serving
    const bookingResponse = await fetch(
      `http://localhost:5000/api/bookings/${next.id}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "serving",
        }),
      }
    );

    const bookingData = await bookingResponse.json();

    if (!bookingResponse.ok) {
      throw new Error(
        bookingData.error || "Failed to update booking"
      );
    }

    return next;
  },

  onSuccess: (next) => {
    toast.success(
      `Now serving ${formatToken(next.token_number)}`
    );

    queryClient.invalidateQueries({
      queryKey: ["bookings"],
    });

    queryClient.invalidateQueries({
      queryKey: ["centres"],
    });
  },

  onError: (error) => {
    toast.error(
      error instanceof Error
        ? error.message
        : "Could not call next token"
    );
  },
});

  const advance = useMutation({
  mutationFn: async (booking: Booking) => {
    const idx = STATUS_FLOW.indexOf(booking.status);

    const next = STATUS_FLOW[
      Math.min(idx + 1, STATUS_FLOW.length - 1)
    ] as BookingStatus;

    const response = await fetch(
      `http://localhost:5000/api/bookings/${booking.id}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: next,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to update booking");
    }

    return next;
  },

  onSuccess: (next) => {
    toast.success(STATUS_LABEL[next]);

    queryClient.invalidateQueries({
      queryKey: ["bookings"],
    });
  },

  onError: (e) =>
    toast.error(
      e instanceof Error ? e.message : "Update failed"
    ),
});
  if (!user) return null;

  if (role.data && role.data !== "staff") {
    return (
      <AppShell>
        <div className="mx-auto mt-16 max-w-md rounded-2xl glass p-8 text-center">
          <h1 className="font-display text-3xl tracking-tight">Staff desk only</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This account is registered as a farmer. Create a staff account to run the counter.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="mt-10 animate-rise rounded-2xl glass-soft p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-8 place-items-center rounded-md bg-grain/15 font-mono text-sm font-bold text-grain">
              S
            </span>
            <h1 className="font-display text-2xl tracking-tight">Staff queue control</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={centreId}
              onChange={(e) => setCentreId(e.target.value)}
              className="rounded-lg border border-border bg-secondary px-4 py-2 text-xs text-paper outline-none focus:border-grain"
            >
              {centres.data?.map((c) => (
                <option key={c.id} value={c.id} className="bg-field-deep">
                  {c.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => serveNext.mutate()}
              disabled={serveNext.isPending || waiting.length === 0}
              className="rounded-lg bg-grain px-4 py-2 text-xs font-semibold text-ink disabled:opacity-50"
            >
              Serve next
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Stat label="Now serving" value={centre ? formatToken(centre.current_token) : "—"} />
          <Stat label="Waiting" value={String(waiting.length)} />
          <Stat label="At counter" value={String(inProgress.length)} />
          <Stat label="Completed" value={String(done.length)} />
        </div>

        <div className="mt-5 grid gap-6 md:grid-cols-2">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Waiting
            </p>
            <ul className="mt-3 space-y-2">
              {waiting.length === 0 && (
                <li className="text-sm text-muted-foreground">Nobody waiting.</li>
              )}
              {waiting.map((b, i) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between rounded-lg glass-soft px-4 py-3"
                >
                  <div>
                    <p className="font-mono text-sm font-bold">{formatToken(b.token_number)}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.crop} · {b.quantity_kg} kg · {STATUS_LABEL[b.status]}
                    </p>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-grain">
                    {i === 0 ? "Next" : `#${i + 1}`}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              At the counter
            </p>
            <ul className="mt-3 space-y-2">
              {inProgress.length === 0 && (
                <li className="text-sm text-muted-foreground">Counter is idle.</li>
              )}
              {inProgress.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between rounded-lg glass-soft px-4 py-3"
                >
                  <div>
                    <p className="font-mono text-sm font-bold">{formatToken(b.token_number)}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.crop} · {STATUS_LABEL[b.status]}
                    </p>
                  </div>
                  <button
                    onClick={() => advance.mutate(b)}
                    className="rounded-lg bg-grain px-3 py-2 text-xs font-semibold text-ink"
                  >
                    {"Mark completed"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-32 flex-1 rounded-xl inset-panel px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-mono text-2xl font-bold">{value}</p>
    </div>
  );
}
