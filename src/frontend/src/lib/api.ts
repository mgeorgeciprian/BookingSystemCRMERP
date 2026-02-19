/**
 * API client for BookingCRM backend.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5025";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("bcr_token") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(error.detail || `API Error ${res.status}`, res.status);
  }

  if (res.status === 204) return {} as T;
  return res.json();
}

// --- Auth ---
export const auth = {
  register: (data: { email: string; password: string; full_name: string; phone?: string }) =>
    apiFetch<{ access_token: string; refresh_token: string }>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  login: (data: { email: string; password: string }) =>
    apiFetch<{ access_token: string; refresh_token: string }>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  me: () => apiFetch<any>("/api/v1/auth/me"),
};

// --- Businesses ---
export const businesses = {
  list: () => apiFetch<any[]>("/api/v1/businesses/"),
  create: (data: any) =>
    apiFetch<any>("/api/v1/businesses/", { method: "POST", body: JSON.stringify(data) }),
  get: (id: number) => apiFetch<any>(`/api/v1/businesses/${id}`),
  update: (id: number, data: any) =>
    apiFetch<any>(`/api/v1/businesses/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
};

// --- Services ---
export const services = {
  list: (bizId: number) =>
    apiFetch<any[]>(`/api/v1/businesses/${bizId}/services/`),
  create: (bizId: number, data: any) =>
    apiFetch<any>(`/api/v1/businesses/${bizId}/services/`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (bizId: number, serviceId: number, data: any) =>
    apiFetch<any>(`/api/v1/businesses/${bizId}/services/${serviceId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (bizId: number, serviceId: number) =>
    apiFetch<any>(`/api/v1/businesses/${bizId}/services/${serviceId}`, {
      method: "DELETE",
    }),
};

// --- Service Categories ---
export const serviceCategories = {
  list: (bizId: number) =>
    apiFetch<any[]>(`/api/v1/businesses/${bizId}/services/categories`),
  create: (bizId: number, data: any) =>
    apiFetch<any>(`/api/v1/businesses/${bizId}/services/categories`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// --- Employees ---
export const employees = {
  list: (bizId: number) =>
    apiFetch<any[]>(`/api/v1/businesses/${bizId}/employees/`),
  create: (bizId: number, data: any) =>
    apiFetch<any>(`/api/v1/businesses/${bizId}/employees/`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (bizId: number, employeeId: number, data: any) =>
    apiFetch<any>(`/api/v1/businesses/${bizId}/employees/${employeeId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (bizId: number, employeeId: number) =>
    apiFetch<any>(`/api/v1/businesses/${bizId}/employees/${employeeId}`, {
      method: "DELETE",
    }),
  assignService: (bizId: number, employeeId: number, data: any) =>
    apiFetch<any>(`/api/v1/businesses/${bizId}/employees/${employeeId}/services`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// --- Clients ---
export const clients = {
  list: (bizId: number, params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch<any[]>(`/api/v1/businesses/${bizId}/clients/${qs}`);
  },
  create: (bizId: number, data: any) =>
    apiFetch<any>(`/api/v1/businesses/${bizId}/clients/`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  get: (bizId: number, clientId: number) =>
    apiFetch<any>(`/api/v1/businesses/${bizId}/clients/${clientId}`),
  update: (bizId: number, clientId: number, data: any) =>
    apiFetch<any>(`/api/v1/businesses/${bizId}/clients/${clientId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  stats: (bizId: number) =>
    apiFetch<any>(`/api/v1/businesses/${bizId}/clients/stats/summary`),
};

// --- Appointments ---
export const appointments = {
  list: (bizId: number, params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch<any[]>(`/api/v1/businesses/${bizId}/appointments/${qs}`);
  },
  create: (bizId: number, data: any) =>
    apiFetch<any>(`/api/v1/businesses/${bizId}/appointments/`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (bizId: number, aptId: number, data: any) =>
    apiFetch<any>(`/api/v1/businesses/${bizId}/appointments/${aptId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  cancel: (bizId: number, aptId: number, data: any) =>
    apiFetch<any>(`/api/v1/businesses/${bizId}/appointments/${aptId}/cancel`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  availability: (bizId: number, params: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch<any>(`/api/v1/businesses/${bizId}/appointments/availability?${qs}`);
  },
  changeStatus: (bizId: number, aptId: number, newStatus: string, paymentMethod?: string) => {
    const statusParams = new URLSearchParams({ new_status: newStatus });
    if (paymentMethod) statusParams.append("payment_method", paymentMethod);
    return apiFetch<any>(`/api/v1/businesses/${bizId}/appointments/${aptId}/status?${statusParams}`, {
      method: "POST",
    });
  },
};

// --- Public Booking (no auth) ---
export const publicBooking = {
  profile: (slug: string) => apiFetch<any>(`/api/v1/book/${slug}`),
  services: (slug: string) => apiFetch<any[]>(`/api/v1/book/${slug}/services`),
  employees: (slug: string, serviceId?: number) => {
    const qs = serviceId ? `?service_id=${serviceId}` : "";
    return apiFetch<any[]>(`/api/v1/book/${slug}/employees${qs}`);
  },
  availability: (slug: string, params: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch<any>(`/api/v1/book/${slug}/availability?${qs}`);
  },
  book: (slug: string, data: any) =>
    apiFetch<any>(`/api/v1/book/${slug}/book`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// --- Invoices ---
export const invoices = {
  list: (bizId: number) =>
    apiFetch<any[]>(`/api/v1/businesses/${bizId}/invoices/`),
  create: (bizId: number, data: any) =>
    apiFetch<any>(`/api/v1/businesses/${bizId}/invoices/`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  markPaid: (bizId: number, invoiceId: number, data?: any) =>
    apiFetch<any>(`/api/v1/businesses/${bizId}/invoices/${invoiceId}/mark-paid`, {
      method: "POST",
      body: data ? JSON.stringify(data) : JSON.stringify({}),
    }),
  fromAppointment: (bizId: number, data: { appointment_id: number; buyer_name?: string; buyer_cui?: string; buyer_address?: string; buyer_reg_com?: string; buyer_is_company?: boolean; notes?: string }) =>
    apiFetch<any>(`/api/v1/businesses/${bizId}/invoices/from-appointment`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// --- Notifications ---
export const notifications = {
  log: (bizId: number, params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch<any[]>(`/api/v1/businesses/${bizId}/notifications/log${qs}`);
  },
  send: (bizId: number, data: any) =>
    apiFetch<any>(`/api/v1/businesses/${bizId}/notifications/send`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// --- Dashboard ---
export const dashboard = {
  stats: (bizId: number) =>
    apiFetch<any>(`/api/v1/businesses/${bizId}/dashboard/`),
};

// --- iCal Sources ---
export const icalSources = {
  list: (bizId: number) =>
    apiFetch<any[]>(`/api/v1/businesses/${bizId}/ical/`),
  create: (bizId: number, data: any) =>
    apiFetch<any>(`/api/v1/businesses/${bizId}/ical/`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  sync: (bizId: number, sourceId: number) =>
    apiFetch<any>(`/api/v1/businesses/${bizId}/ical/${sourceId}/sync`, {
      method: "POST",
    }),
};
