import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { useProfile, useSession } from "@/hooks/useAuth";

import {
  STATUS_FLOW,
  STATUS_LABEL,
  fetchBookings,
  fetchCentres,
  fetchSlots,
  formatTime,
  formatToken,
  peopleAhead,
  today,
  waitMinutes,
  createBooking,
  markArrived,
  type Booking,
} from "@/lib/queue";

export const Route = createFileRoute("/farmer")({
  head: () => ({
    meta: [
      {
        title: "My Token & Live Queue — AGRONEX",
      },
      {
        name: "description",
        content:
          "Book a procurement slot, get your token and watch the live queue.",
      },
    ],
  }),
  component: FarmerPage,
});

const CROPS = [
  "Wheat",
  "Paddy",
  "Rice",
  "Gram",
  "Sorghum",
  "Others",
];

type Notification = {
  id: number;
  user_id: number;
  booking_id: number | null;
  type: "sms" | "app";
  title: string | null;
  message: string;
  status: "pending" | "sent" | "failed";
  sent_at: string | null;
  created_at: string;
};

function FarmerPage() {
  const { user, loading } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const profile = useProfile(user);

  const [centreId, setCentreId] = useState("");
  const [selectedDate, setSelectedDate] = useState(today());
  const [slotId, setSlotId] = useState("");
  const [crop, setCrop] = useState(CROPS[0]);
  const [quantity, setQuantity] = useState("500");

  // --------------------------------------------------
  // REDIRECT IF NOT LOGGED IN
  // --------------------------------------------------

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth" });
    }
  }, [loading, user, navigate]);

  // --------------------------------------------------
  // FETCH CENTRES
  // --------------------------------------------------

  const centres = useQuery({
    queryKey: ["centres"],
    queryFn: fetchCentres,
    refetchInterval: 5000,
  });

 // Automatically select first centre
  useEffect(() => {
    if (!centreId && centres.data?.length) {
    setCentreId(String(centres.data[0].id));
    }
}, [centres.data, centreId]);

  // --------------------------------------------------
  // FETCH SLOTS
  // --------------------------------------------------

  const slots = useQuery({
    queryKey: ["slots", centreId, selectedDate],
    enabled: !!centreId && !!selectedDate,
    queryFn: () => fetchSlots(centreId, selectedDate),
    refetchInterval: 5000,
  });

  // --------------------------------------------------
  // FETCH BOOKINGS
  // --------------------------------------------------

  const bookings = useQuery({
    queryKey: ["bookings", centreId],
    enabled: !!centreId,
    queryFn: () => fetchBookings(centreId),
    refetchInterval: 4000,
  });

  // --------------------------------------------------
  // FETCH NOTIFICATIONS
  // --------------------------------------------------

  const notifications = useQuery<Notification[]>({
    queryKey: ["notifications", user?.id],
    enabled: !!user?.id,

    queryFn: async () => {
      if (!user?.id) {
        return [];
      }

      const response = await fetch(
        `http://localhost:5000/api/notifications/${user.id}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }

      return response.json();
    },

    refetchInterval: 5000,
  });

  // --------------------------------------------------
  // CURRENT CENTRE
  // --------------------------------------------------

  const centre = centres.data?.find(
    (c) => String(c.id) === String(centreId),
  );

  // --------------------------------------------------
  // FARMER'S ACTIVE BOOKING
  // --------------------------------------------------

  const myBooking = useMemo(() => {
    if (!bookings.data || !user?.id) {
      return null;
    }

    return (
      bookings.data.find(
        (booking) =>
          String(booking.farmer_id) === String(user.id) &&
          booking.status !== "completed" &&
          booking.status !== "cancelled",
      ) ?? null
    );
  }, [bookings.data, user?.id]);

  // --------------------------------------------------
  // WAITING TOKENS
  // --------------------------------------------------

  const waitingTokens = (bookings.data ?? [])
    .filter(
      (booking) =>
        booking.status === "booked" ||
        booking.status === "waiting",
    )
    .map((booking) => booking.token_number);

  // --------------------------------------------------
  // PEOPLE AHEAD
  // --------------------------------------------------

  const ahead =
    myBooking && centre
      ? peopleAhead(
          myBooking.token_number,
          centre.current_token,
          waitingTokens,
        )
      : 0;

  const wait = centre
    ? waitMinutes(ahead, centre.avg_minutes)
    : 0;

  // --------------------------------------------------
  // SLOT COUNTS
  // --------------------------------------------------

  const slotCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    for (const booking of bookings.data ?? []) {
      counts[String(booking.slot_id)] =
        (counts[String(booking.slot_id)] ?? 0) + 1;
    }

    return counts;
  }, [bookings.data]);

  // --------------------------------------------------
  // CREATE BOOKING
  // --------------------------------------------------

  const book = useMutation({
    mutationFn: async () => {
      if (!selectedDate) {
        throw new Error("Please select a date");
      }

      if (!slotId) {
        throw new Error("Please select a time slot");
      }

      if (!user?.id) {
        throw new Error("You must be logged in");
      }

      if (!quantity || Number(quantity) <= 0) {
        throw new Error("Please enter a valid quantity");
      }

      /*
       * Keep this call compatible with your current createBooking()
       * function.
       *
       * If createBooking() supports date/crop/quantity, update the
       * function in @/lib/queue accordingly.
       */
      return createBooking(
        String(user.id),
        String(slotId),
      );
    },

    onSuccess: (booking) => {
      toast.success(
        `Booking successful! Your token is ${formatToken(
          booking.token_number,
        )}`,
      );

      setSlotId("");

      queryClient.invalidateQueries({
        queryKey: ["bookings"],
      });

      queryClient.invalidateQueries({
        queryKey: ["slots"],
      });

      queryClient.invalidateQueries({
        queryKey: ["centres"],
      });

      queryClient.invalidateQueries({
        queryKey: ["notifications", user?.id],
      });
    },

    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Booking failed",
      );
    },
  });

  // --------------------------------------------------
  // MARK ARRIVED
  // --------------------------------------------------

  const arrive = useMutation({
    mutationFn: async (booking: Booking) => {
      return markArrived(String(booking.id));
    },

    onSuccess: () => {
      toast.success("You have been marked as arrived");

      queryClient.invalidateQueries({
        queryKey: ["bookings"],
      });

      queryClient.invalidateQueries({
        queryKey: ["notifications", user?.id],
      });
    },

    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not mark arrival",
      );
    },
  });

  // --------------------------------------------------
  // MARK NOTIFICATION AS READ
  // --------------------------------------------------

  const markNotificationRead = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await fetch(
        `http://localhost:5000/api/notifications/${notificationId}/read`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update notification");
      }

      return response.json();
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["notifications", user?.id],
      });
    },

    onError: () => {
      toast.error("Could not update notification");
    },
  });

  // --------------------------------------------------
  // QUEUE ROWS
  // --------------------------------------------------

  const queueRows = (bookings.data ?? []).filter(
    (booking) =>
      booking.status !== "completed" &&
      booking.status !== "cancelled",
  );

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <p className="text-muted-foreground">
          Loading...
        </p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // --------------------------------------------------
  // PAGE
  // --------------------------------------------------

  return (
    <AppShell>
      {/* =================================================
          TOP SECTION
      ================================================= */}

      <section className="mt-10 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">

        {/* GREETING CARD */}

        <div className="flex flex-col justify-between gap-8 rounded-2xl glass p-8">
          <div className="space-y-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-grain">
              Live at the counter
            </p>

            <h1 className="text-balance font-display text-5xl leading-[0.92] tracking-tight">
              {profile.data?.full_name
                ? `Namaste, ${
                    profile.data.full_name.split(" ")[0]
                  }.`
                : "Your turn,"}

              <br />

              line by line.
            </h1>

            <p className="max-w-[34ch] text-pretty text-muted-foreground">
              {myBooking
                ? `Token ${formatToken(
                    myBooking.token_number,
                  )} · ${
                    STATUS_LABEL[myBooking.status]
                  } at ${
                    centre?.name ?? "procurement centre"
                  }.`
                : "Pick a centre, date and time slot below. Your token is issued when you book."}
            </p>
          </div>

          {myBooking && (
            <div className="flex flex-wrap gap-3">
              {myBooking.status === "booked" && (
                <button
                  onClick={() => arrive.mutate(myBooking)}
                  disabled={arrive.isPending}
                  className="rounded-lg bg-grain px-5 py-3 text-sm font-semibold text-ink disabled:opacity-50"
                >
                  {arrive.isPending
                    ? "Updating..."
                    : "I have arrived"}
                </button>
              )}

              <span className="rounded-lg border border-border bg-secondary px-5 py-3 text-sm font-semibold text-paper">
                {STATUS_LABEL[myBooking.status]}
              </span>
            </div>
          )}
        </div>

        {/* LIVE TOKEN CARD */}

        <div className="flex flex-col rounded-2xl glass p-7">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Now serving
            </p>

            <span className="rounded-full bg-grain/15 px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-grain">
              {centre
                ? formatToken(centre.current_token)
                : "—"}
            </span>
          </div>

          <div className="relative mt-2 overflow-hidden rounded-xl inset-panel px-6 py-9">
            <p className="absolute inset-0 grid place-items-center font-display text-[10rem] leading-none text-grain/10">
              {centre?.current_token ?? 0}
            </p>

            <p className="relative text-center font-mono text-7xl font-bold leading-none tracking-tight text-grain">
              {centre
                ? formatToken(centre.current_token)
                : "—"}
            </p>

            <p className="relative mt-3 text-center font-mono text-xs uppercase tracking-[0.24em] text-muted-foreground">
              {myBooking
                ? `${ahead} farmers ahead of you`
                : "Book a slot to join the queue"}
            </p>
          </div>

          <div className="mt-6 flex gap-3">
            <Stat
              label="Your token"
              value={
                myBooking
                  ? formatToken(myBooking.token_number)
                  : "—"
              }
            />

            <Stat
              label="Est. wait"
              value={
                myBooking
                  ? `${wait}m`
                  : "—"
              }
            />

            <Stat
              label="In queue"
              value={String(queueRows.length)}
            />
          </div>
        </div>
      </section>

      {/* =================================================
          NOTIFICATIONS
      ================================================= */}

      <section className="mt-6 rounded-2xl glass p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl tracking-tight">
              Notifications
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Updates about your bookings and queue.
            </p>
          </div>

          <span className="rounded-full bg-grain/15 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-grain">
            {notifications.data?.filter(
              (notification) =>
                notification.status === "pending",
            ).length ?? 0}{" "}
            new
          </span>
        </div>

        <div className="mt-5 space-y-3">

          {/* Loading */}

          {notifications.isLoading && (
            <div className="rounded-xl glass-soft p-4">
              <p className="text-sm text-muted-foreground">
                Loading notifications...
              </p>
            </div>
          )}

          {/* Error */}

          {notifications.isError && (
            <div className="rounded-xl glass-soft p-4">
              <p className="text-sm text-red-400">
                Unable to load notifications.
              </p>
            </div>
          )}

          {/* Empty */}

          {!notifications.isLoading &&
            !notifications.isError &&
            notifications.data?.length === 0 && (
              <div className="rounded-xl glass-soft p-5">
                <p className="text-sm text-muted-foreground">
                  No notifications yet.
                </p>
              </div>
            )}

          {/* Notification List */}

          {notifications.data?.map((notification) => {
            const isNew =
              notification.status === "pending";

            return (
              <div
                key={notification.id}
                className={`rounded-xl p-4 ${
                  isNew
                    ? "border border-grain/30 bg-grain/10"
                    : "glass-soft"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`size-2 rounded-full ${
                          isNew
                            ? "bg-grain"
                            : "bg-muted-foreground/40"
                        }`}
                      />

                      <p className="font-semibold">
                        {notification.title ??
                          "Notification"}
                      </p>
                    </div>

                    <p className="mt-2 text-sm text-muted-foreground">
                      {notification.message}
                    </p>

                    <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      {new Date(
                        notification.created_at,
                      ).toLocaleString()}
                    </p>
                  </div>

                  {isNew && (
                    <button
                      onClick={() =>
                        markNotificationRead.mutate(
                          notification.id,
                        )
                      }
                      disabled={
                        markNotificationRead.isPending
                      }
                      className="shrink-0 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-paper transition hover:bg-secondary disabled:opacity-50"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =================================================
          QUEUE + BOOKING
      ================================================= */}

      <section className="mt-6 grid gap-6 lg:grid-cols-2">

        {/* QUEUE */}

        <div className="rounded-2xl glass p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl tracking-tight">
              Queue rail
            </h2>

            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              {centre?.name ?? ""}
            </p>
          </div>

          <ol className="mt-5 space-y-2 border-l-2 border-border pl-5">
            {queueRows.length === 0 && (
              <li className="text-sm text-muted-foreground">
                No one in the queue right now.
              </li>
            )}

            {queueRows.slice(0, 8).map((booking) => {
              const mine =
                String(booking.farmer_id) ===
                String(user.id);

              return (
                <li
                  key={booking.id}
                  className={
                    mine
                      ? "relative rounded-lg bg-grain px-4 py-3 text-ink"
                      : "relative rounded-lg glass-soft px-4 py-3"
                  }
                >
                  <span
                    className={`absolute top-1/2 size-3 -translate-y-1/2 rounded-full ${
                      mine
                        ? "-left-[31px] bg-grain"
                        : "-left-[29px] bg-paper/25"
                    }`}
                  />

                  <p className="font-mono text-lg font-bold leading-none">
                    {formatToken(
                      booking.token_number,
                    )}
                  </p>

                  <p
                    className={`mt-1 text-xs ${
                      mine
                        ? "font-semibold"
                        : "text-muted-foreground"
                    }`}
                  >
                    {mine ? "You · " : ""}

                    {
                      STATUS_LABEL[
                        booking.status
                      ]
                    }
                  </p>
                </li>
              );
            })}
          </ol>
        </div>

        {/* BOOK SLOT */}

        <div className="rounded-2xl glass p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl tracking-tight">
              Book a slot
            </h2>

            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Select date
            </p>
          </div>

          {/* CENTRE */}

          <select
            value={centreId}
            onChange={(event) => {
              setCentreId(event.target.value);
              setSlotId("");
            }}
            className="mt-4 w-full rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-paper outline-none focus:border-grain"
          >
            {centres.data?.map((centre) => (
              <option
                key={centre.id}
                value={centre.id}
                className="bg-field-deep"
              >
                {centre.name} — {centre.location}
              </option>
            ))}
          </select>

          {/* DATE */}

          <div className="mt-4">
            <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Procurement date
            </label>

            <input
              type="date"
              value={selectedDate}
              min={today()}
              onChange={(event) => {
                setSelectedDate(event.target.value);
                setSlotId("");
              }}
              className="w-full rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-paper outline-none focus:border-grain"
            />
          </div>

          {/* SLOTS */}

          <div className="mt-4">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Available time slots
            </p>

            <div className="grid grid-cols-2 gap-3">
              {slots.isLoading && (
                <p className="col-span-2 text-sm text-muted-foreground">
                  Loading slots...
                </p>
              )}

              {!slots.isLoading &&
                slots.data?.length === 0 && (
                  <p className="col-span-2 text-sm text-muted-foreground">
                    No slots available for this date.
                  </p>
                )}

              {slots.data?.map((slot) => {
                const used =
                  slot.booked ??
                  slotCounts[String(slot.id)] ??
                  0;

                const full =
                  slot.status === "full" ||
                  used >= slot.capacity;

                const active =
                  String(slot.id) ===
                  String(slotId);

                return (
                  <button
                    key={slot.id}
                    disabled={full}
                    onClick={() =>
                      setSlotId(
                        String(slot.id),
                      )
                    }
                    className={
                      active
                        ? "rounded-xl bg-grain px-4 py-4 text-left text-ink"
                        : "rounded-xl border border-border glass-soft px-4 py-4 text-left disabled:opacity-40"
                    }
                  >
                    <p className="font-mono text-xs font-bold uppercase tracking-wider">
                      {formatTime(
                        slot.start_time,
                      )}{" "}
                      -{" "}
                      {formatTime(
                        slot.end_time,
                      )}
                    </p>

                    <p className="mt-1 text-[11px] opacity-70">
                      {full
                        ? "Full"
                        : `${Math.max(
                            0,
                            slot.capacity - used,
                          )} open`}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CROP + QUANTITY */}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <select
              value={crop}
              onChange={(event) =>
                setCrop(event.target.value)
              }
              className="rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-paper outline-none focus:border-grain"
            >
              {CROPS.map((cropName) => (
                <option
                  key={cropName}
                  value={cropName}
                  className="bg-field-deep"
                >
                  {cropName}
                </option>
              ))}
            </select>

            <input
              value={quantity}
              onChange={(event) =>
                setQuantity(event.target.value)
              }
              inputMode="numeric"
              type="number"
              min="1"
              placeholder="Quantity in kg"
              className="rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-paper outline-none focus:border-grain"
            />
          </div>

          {/* BOOK BUTTON */}

          <button
            onClick={() => book.mutate()}
            disabled={
              book.isPending ||
              !selectedDate ||
              !slotId
            }
            className="mt-4 w-full rounded-lg bg-grain px-4 py-3 text-sm font-semibold text-ink disabled:opacity-50"
          >
            {book.isPending
              ? "Booking..."
              : "Confirm booking"}
          </button>
        </div>
      </section>

      {/* =================================================
          PROCUREMENT STATUS
      ================================================= */}

      {myBooking && (
        <section className="mt-6 rounded-2xl glass-soft p-6">
          <h2 className="font-display text-2xl tracking-tight">
            Procurement status
          </h2>

          <div className="mt-5 grid gap-2 sm:grid-cols-4">
            {STATUS_FLOW.map((status) => {
              const currentIndex =
                STATUS_FLOW.indexOf(
                  myBooking.status,
                );

              const statusIndex =
                STATUS_FLOW.indexOf(status);

              const done =
                statusIndex <= currentIndex;

              return (
                <div
                  key={status}
                  className={
                    done
                      ? "rounded-lg bg-grain px-4 py-3 text-ink"
                      : "rounded-lg glass-soft px-4 py-3 text-muted-foreground"
                  }
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] opacity-70">
                    Step {statusIndex + 1}
                  </p>

                  <p className="mt-1 text-sm font-semibold">
                    {STATUS_LABEL[status]}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </AppShell>
  );
}

// =================================================
// STAT COMPONENT
// =================================================

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex-1 rounded-xl inset-panel px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>

      <p className="mt-1 font-mono text-2xl font-bold">
        {value}
      </p>
    </div>
  );
}
