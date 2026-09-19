import { useEffect, useState } from "react";

export type AppRole = "farmer" | "staff";

export type AppUser = {
  id: number;
  name: string;
  phone: string;
  role: AppRole;
};

const API_URL = "http://localhost:5000";

export function useSession() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem("agronex_user");

    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem("agronex_user");
      }
    }

    setLoading(false);
  }, []);

  return {
    session: user ? { user } : null,
    user,
    loading,
  };
}

export function useRole(user: AppUser | null) {
  return {
    data: user?.role ?? null,
    isLoading: false,
    error: null,
  };
}

export function useProfile(user: AppUser | null) {
  return {
    data: user
      ? {
          id: user.id,
          full_name: user.name,
          phone: user.phone,
          village: null,
        }
      : null,
    isLoading: false,
    error: null,
  };
}

export async function loginUser(phone: string, password: string) {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phone,
      password,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Login failed");
  }

  localStorage.setItem("agronex_token", data.token);
  localStorage.setItem("agronex_user", JSON.stringify(data.user));

  return data;
}

export async function registerUser(
  name: string,
  phone: string,
  password: string,
  role: AppRole,
  village: string
) {
  const response = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      phone,
      password,
      role,
      village,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Registration failed");
  }

  return data;
}

export function logoutUser() {
  localStorage.removeItem("agronex_token");
  localStorage.removeItem("agronex_user");
  window.location.href = "/auth";
}