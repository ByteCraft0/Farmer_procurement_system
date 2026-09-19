export type BookingStatus =
  | "booked"
  | "waiting"
  | "serving"
  | "completed"
  | "cancelled";

export const STATUS_FLOW: BookingStatus[] = [
  "booked",
  "waiting",
  "serving",
  "completed",
];

export const STATUS_LABEL: Record<BookingStatus, string> = {
  booked: "Slot booked",
  waiting: "Waiting at centre",
  serving: "Being served",
  completed: "Completed",
  cancelled: "Cancelled",
};

export type Centre = {
  id: string;
  name: string;
  location: string;
  capacity: number;
  contact: string | null;
  avg_minutes: number;
  current_token: number;
  last_token: number;
};

export type Slot = {
  id: string;
  centre_id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  booked: number;
  status: "available" | "full" | "closed";
};

export type Booking = {
  id: string;
  farmer_id: string;
  centre_id: string;
  slot_id: string;
  token_number: string;
  booking_time: string;
  status: BookingStatus;
};

export const today = () => {
  const d = new Date();

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export function formatToken(token: string | number) {
  const value = String(token);

  if (value.startsWith("A-")) {
    return value;
  }

  return `A-${value.padStart(3, "0")}`;
}

export function formatTime(time: string) {
  return time.slice(0, 5);
}

const API = "http://localhost:5000";

export async function fetchCentres(): Promise<Centre[]> {
  const response = await fetch(`${API}/api/centres`);

  if (!response.ok) {
    throw new Error("Failed to fetch centres");
  }

  return response.json();
}

export async function fetchSlots(
  centreId: string,
  date: string
): Promise<Slot[]> {
  const response = await fetch(
    `${API}/api/slots?centre_id=${centreId}&date=${date}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch slots");
  }

  return response.json();
}

export async function fetchBookings(
  centreId?: string,
  slotId?: string
): Promise<Booking[]> {
  const params = new URLSearchParams();

  if (centreId) {
    params.set("centre_id", centreId);
  }

  if (slotId) {
    params.set("slot_id", slotId);
  }

  const query = params.toString();

  const url = query
    ? `${API}/api/bookings?${query}`
    : `${API}/api/bookings`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed to fetch bookings");
  }

  return response.json();
}

export async function fetchMyBookings(
  userId: string
): Promise<Booking[]> {
  const response = await fetch(
    `${API}/api/bookings/farmer/${userId}`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch your bookings");
  }

  return response.json();
}

export async function createBooking(
  farmerId: string,
  slotId: string
): Promise<Booking> {
  const response = await fetch(`${API}/api/bookings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      farmer_id: Number(farmerId),
      slot_id: Number(slotId),
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Booking failed");
  }

  return data.booking;
}

export async function markArrived(
  bookingId: string
): Promise<Booking> {
  const response = await fetch(
    `${API}/api/bookings/${bookingId}/arrive`,
    {
      method: "PATCH",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to mark arrival");
  }

  return data.booking;
}

export function peopleAhead(
  myToken: string | number,
  currentToken: number,
  waiting: Array<string | number>
) {
  const myNumber = parseInt(
    String(myToken).replace("A-", ""),
    10
  );

  const ahead = waiting.filter((token) => {
    const number = parseInt(
      String(token).replace("A-", ""),
      10
    );

    return number > currentToken && number < myNumber;
  }).length;

  return Math.max(0, ahead);
}

export function waitMinutes(
  ahead: number,
  avgMinutes: number
) {
  return ahead * avgMinutes;
}