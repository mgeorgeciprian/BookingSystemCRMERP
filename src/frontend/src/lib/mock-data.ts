/**
 * Mock data for BookingCRM demo/presentation.
 * Realistic Romanian salon data with full CRM history.
 */

// ============================================================
// BUSINESS
// ============================================================
export const MOCK_BUSINESS = {
  id: 1,
  name: "Salon Elegance",
  slug: "salon-elegance",
  vertical: "salon",
  description: "Salon de frumusete premium in centrul Bucurestiului. Coafura, manichiura, cosmetica.",
  logo_url: null,
  cover_url: null,
  cui: "RO45678901",
  reg_com: "J40/1234/2023",
  address: "Str. Victoriei 42, Sector 1",
  city: "Bucuresti",
  county: "Bucuresti",
  postal_code: "010061",
  phone: "+40721234567",
  email: "contact@salonelegance.ro",
  website: "https://salonelegance.ro",
  latitude: 44.4396,
  longitude: 26.0963,
  timezone: "Europe/Bucharest",
  currency: "RON",
  booking_buffer_minutes: 10,
  cancellation_policy_hours: 24,
  auto_confirm_bookings: true,
  allow_online_payments: true,
  subscription_plan: "professional",
  is_active: true,
  notification_channels: { viber: true, whatsapp: true, sms: true, email: true },
  efactura_enabled: true,
  created_at: "2024-03-15T10:00:00Z",
};

// ============================================================
// EMPLOYEES
// ============================================================
export const MOCK_EMPLOYEES = [
  {
    id: 1,
    business_id: 1,
    full_name: "Ana Popescu",
    display_name: "Ana P.",
    phone: "+40722111222",
    email: "ana@salonelegance.ro",
    avatar_url: null,
    role: "specialist",
    color: "#8b5cf6",
    commission_type: "percent",
    commission_value: 30,
    is_active: true,
    sort_order: 0,
    weekly_schedule: {
      mon: [{ start: "09:00", end: "18:00" }],
      tue: [{ start: "09:00", end: "18:00" }],
      wed: [{ start: "09:00", end: "18:00" }],
      thu: [{ start: "09:00", end: "20:00" }],
      fri: [{ start: "09:00", end: "18:00" }],
      sat: [{ start: "10:00", end: "15:00" }],
      sun: [],
    },
  },
  {
    id: 2,
    business_id: 1,
    full_name: "Maria Ionescu",
    display_name: "Maria I.",
    phone: "+40722333444",
    email: "maria@salonelegance.ro",
    avatar_url: null,
    role: "specialist",
    color: "#ec4899",
    commission_type: "percent",
    commission_value: 25,
    is_active: true,
    sort_order: 1,
    weekly_schedule: {
      mon: [{ start: "10:00", end: "19:00" }],
      tue: [{ start: "10:00", end: "19:00" }],
      wed: [],
      thu: [{ start: "10:00", end: "19:00" }],
      fri: [{ start: "10:00", end: "19:00" }],
      sat: [{ start: "09:00", end: "14:00" }],
      sun: [],
    },
  },
  {
    id: 3,
    business_id: 1,
    full_name: "Elena Dumitru",
    display_name: "Elena D.",
    phone: "+40722555666",
    email: "elena@salonelegance.ro",
    avatar_url: null,
    role: "specialist",
    color: "#f59e0b",
    commission_type: "percent",
    commission_value: 25,
    is_active: true,
    sort_order: 2,
    weekly_schedule: {
      mon: [{ start: "09:00", end: "17:00" }],
      tue: [{ start: "09:00", end: "17:00" }],
      wed: [{ start: "09:00", end: "17:00" }],
      thu: [{ start: "09:00", end: "17:00" }],
      fri: [{ start: "09:00", end: "17:00" }],
      sat: [],
      sun: [],
    },
  },
  {
    id: 4,
    business_id: 1,
    full_name: "Andreea Stanescu",
    display_name: "Andreea S.",
    phone: "+40722777888",
    email: "andreea@salonelegance.ro",
    avatar_url: null,
    role: "manager",
    color: "#06b6d4",
    commission_type: "fixed",
    commission_value: 5000,
    is_active: true,
    sort_order: 3,
    weekly_schedule: {
      mon: [{ start: "08:00", end: "16:00" }],
      tue: [{ start: "08:00", end: "16:00" }],
      wed: [{ start: "08:00", end: "16:00" }],
      thu: [{ start: "08:00", end: "16:00" }],
      fri: [{ start: "08:00", end: "16:00" }],
      sat: [],
      sun: [],
    },
  },
];

// ============================================================
// SERVICE CATEGORIES & SERVICES
// ============================================================
export const MOCK_CATEGORIES = [
  { id: 1, name: "Coafura", sort_order: 0 },
  { id: 2, name: "Manichiura & Pedichiura", sort_order: 1 },
  { id: 3, name: "Cosmetica", sort_order: 2 },
  { id: 4, name: "Barbering", sort_order: 3 },
];

export const MOCK_SERVICES = [
  // Coafura
  { id: 1, business_id: 1, category_id: 1, name: "Tuns dama", description: "Tuns + spalat + coafat", duration_minutes: 45, buffer_after_minutes: 10, price: 80, price_max: null, currency: "RON", vat_rate: 19, color: "#8b5cf6", is_active: true, is_public: true, sort_order: 0 },
  { id: 2, business_id: 1, category_id: 1, name: "Vopsit radacini", description: "Vopsit radacini + spalat + coafat", duration_minutes: 90, buffer_after_minutes: 10, price: 150, price_max: 200, currency: "RON", vat_rate: 19, color: "#8b5cf6", is_active: true, is_public: true, sort_order: 1 },
  { id: 3, business_id: 1, category_id: 1, name: "Balayage", description: "Tehnica balayage premium", duration_minutes: 180, buffer_after_minutes: 15, price: 350, price_max: 500, currency: "RON", vat_rate: 19, color: "#8b5cf6", is_active: true, is_public: true, sort_order: 2 },
  { id: 4, business_id: 1, category_id: 1, name: "Coafat ocazie", description: "Coafat pentru evenimente speciale", duration_minutes: 60, buffer_after_minutes: 10, price: 120, price_max: 200, currency: "RON", vat_rate: 19, color: "#8b5cf6", is_active: true, is_public: true, sort_order: 3 },
  { id: 5, business_id: 1, category_id: 1, name: "Tratament Olaplex", description: "Tratament reparator Olaplex Nr. 3", duration_minutes: 45, buffer_after_minutes: 5, price: 100, price_max: null, currency: "RON", vat_rate: 19, color: "#8b5cf6", is_active: true, is_public: true, sort_order: 4 },
  // Manichiura
  { id: 6, business_id: 1, category_id: 2, name: "Manichiura semipermanenta", description: "Oja semipermanenta + ingrijire cuticule", duration_minutes: 60, buffer_after_minutes: 5, price: 100, price_max: null, currency: "RON", vat_rate: 19, color: "#ec4899", is_active: true, is_public: true, sort_order: 0 },
  { id: 7, business_id: 1, category_id: 2, name: "Manichiura cu gel", description: "Constructie gel + design", duration_minutes: 90, buffer_after_minutes: 5, price: 150, price_max: null, currency: "RON", vat_rate: 19, color: "#ec4899", is_active: true, is_public: true, sort_order: 1 },
  { id: 8, business_id: 1, category_id: 2, name: "Pedichiura spa", description: "Pedichiura completa cu masaj", duration_minutes: 75, buffer_after_minutes: 10, price: 120, price_max: null, currency: "RON", vat_rate: 19, color: "#ec4899", is_active: true, is_public: true, sort_order: 2 },
  // Cosmetica
  { id: 9, business_id: 1, category_id: 3, name: "Tratament facial hidratare", description: "Curatare + hidratare profunda", duration_minutes: 60, buffer_after_minutes: 10, price: 180, price_max: null, currency: "RON", vat_rate: 19, color: "#f59e0b", is_active: true, is_public: true, sort_order: 0 },
  { id: 10, business_id: 1, category_id: 3, name: "Microdermabraziue", description: "Exfoliere mecanica profesionala", duration_minutes: 45, buffer_after_minutes: 10, price: 200, price_max: null, currency: "RON", vat_rate: 19, color: "#f59e0b", is_active: true, is_public: true, sort_order: 1 },
  { id: 11, business_id: 1, category_id: 3, name: "Epilare cu ceara", description: "Epilare zona la alegere", duration_minutes: 30, buffer_after_minutes: 5, price: 50, price_max: 120, currency: "RON", vat_rate: 19, color: "#f59e0b", is_active: true, is_public: true, sort_order: 2 },
  // Barbering
  { id: 12, business_id: 1, category_id: 4, name: "Tuns barbati", description: "Tuns + spalat + styling", duration_minutes: 30, buffer_after_minutes: 5, price: 50, price_max: null, currency: "RON", vat_rate: 19, color: "#06b6d4", is_active: true, is_public: true, sort_order: 0 },
  { id: 13, business_id: 1, category_id: 4, name: "Barba + contur", description: "Aranjare barba cu brici", duration_minutes: 30, buffer_after_minutes: 5, price: 40, price_max: null, currency: "RON", vat_rate: 19, color: "#06b6d4", is_active: true, is_public: true, sort_order: 1 },
];

// ============================================================
// CLIENTS (CRM)
// ============================================================
export const MOCK_CLIENTS = [
  { id: 1, business_id: 1, full_name: "Ioana Marinescu", phone: "+40723111222", email: "ioana.m@gmail.com", source: "online_booking", tags: ["VIP", "fidela"], notes: "Prefera vopsit cu L'Oreal. Alergica la amoniac.", preferred_employee_id: 1, preferred_channel: "viber", notifications_enabled: true, gdpr_consent: true, gdpr_consent_date: "2024-04-10T09:00:00Z", gdpr_article9_consent: false, total_appointments: 28, total_revenue: 4620, no_show_count: 0, last_visit_at: "2026-02-17T11:00:00Z", is_blocked: false, created_at: "2024-04-10T09:00:00Z" },
  { id: 2, business_id: 1, full_name: "Cristina Popa", phone: "+40724222333", email: "cristina.p@yahoo.com", source: "referral", tags: ["VIP"], notes: "Vine cu sotul (Mihai). Mereu programeaza impreuna.", preferred_employee_id: 2, preferred_channel: "whatsapp", notifications_enabled: true, gdpr_consent: true, gdpr_consent_date: "2024-05-22T10:00:00Z", gdpr_article9_consent: false, total_appointments: 22, total_revenue: 3850, no_show_count: 1, last_visit_at: "2026-02-15T14:00:00Z", is_blocked: false, created_at: "2024-05-22T10:00:00Z" },
  { id: 3, business_id: 1, full_name: "Mihai Popa", phone: "+40724222334", email: "mihai.p@yahoo.com", source: "referral", tags: ["cuplu"], notes: "Vine cu sotia (Cristina).", preferred_employee_id: 4, preferred_channel: "sms", notifications_enabled: true, gdpr_consent: true, gdpr_consent_date: "2024-05-22T10:30:00Z", gdpr_article9_consent: false, total_appointments: 18, total_revenue: 900, no_show_count: 0, last_visit_at: "2026-02-15T14:00:00Z", is_blocked: false, created_at: "2024-05-22T10:30:00Z" },
  { id: 4, business_id: 1, full_name: "Alexandra Dumitrescu", phone: "+40725333444", email: "alex.d@gmail.com", source: "online_booking", tags: ["noua"], notes: "", preferred_employee_id: null, preferred_channel: "viber", notifications_enabled: true, gdpr_consent: true, gdpr_consent_date: "2026-01-08T15:00:00Z", gdpr_article9_consent: false, total_appointments: 3, total_revenue: 330, no_show_count: 0, last_visit_at: "2026-02-10T10:00:00Z", is_blocked: false, created_at: "2026-01-08T15:00:00Z" },
  { id: 5, business_id: 1, full_name: "Diana Vasilescu", phone: "+40726444555", email: "diana.v@outlook.com", source: "manual", tags: ["fidela"], notes: "Manichiura bilunar, mereu vinerea.", preferred_employee_id: 3, preferred_channel: "viber", notifications_enabled: true, gdpr_consent: true, gdpr_consent_date: "2024-06-15T11:00:00Z", gdpr_article9_consent: false, total_appointments: 35, total_revenue: 3500, no_show_count: 0, last_visit_at: "2026-02-14T15:00:00Z", is_blocked: false, created_at: "2024-06-15T11:00:00Z" },
  { id: 6, business_id: 1, full_name: "Raluca Gheorghe", phone: "+40727555666", email: "raluca.g@gmail.com", source: "online_booking", tags: [], notes: "", preferred_employee_id: 1, preferred_channel: "sms", notifications_enabled: true, gdpr_consent: true, gdpr_consent_date: "2025-08-20T14:00:00Z", gdpr_article9_consent: false, total_appointments: 8, total_revenue: 1280, no_show_count: 2, last_visit_at: "2026-01-20T16:00:00Z", is_blocked: false, created_at: "2025-08-20T14:00:00Z" },
  { id: 7, business_id: 1, full_name: "Andreea Munteanu", phone: "+40728666777", email: "andreea.m@gmail.com", source: "online_booking", tags: ["VIP", "evenimente"], notes: "Organizatoare de evenimente. Recomanda clienti.", preferred_employee_id: 1, preferred_channel: "whatsapp", notifications_enabled: true, gdpr_consent: true, gdpr_consent_date: "2024-09-10T09:00:00Z", gdpr_article9_consent: false, total_appointments: 15, total_revenue: 3750, no_show_count: 0, last_visit_at: "2026-02-12T10:00:00Z", is_blocked: false, created_at: "2024-09-10T09:00:00Z" },
  { id: 8, business_id: 1, full_name: "Bogdan Stanciu", phone: "+40729777888", email: "bogdan.s@gmail.com", source: "manual", tags: [], notes: "Tuns clasic, fara vorbarie.", preferred_employee_id: 4, preferred_channel: "sms", notifications_enabled: false, gdpr_consent: true, gdpr_consent_date: "2025-02-14T11:00:00Z", gdpr_article9_consent: false, total_appointments: 12, total_revenue: 600, no_show_count: 1, last_visit_at: "2026-02-08T12:00:00Z", is_blocked: false, created_at: "2025-02-14T11:00:00Z" },
  { id: 9, business_id: 1, full_name: "Laura Radu", phone: "+40730888999", email: null, source: "manual", tags: ["problematic"], notes: "3 no-show-uri consecutive. Blocat.", preferred_employee_id: null, preferred_channel: "sms", notifications_enabled: true, gdpr_consent: true, gdpr_consent_date: "2025-06-01T10:00:00Z", gdpr_article9_consent: false, total_appointments: 5, total_revenue: 250, no_show_count: 3, last_visit_at: "2025-10-05T14:00:00Z", is_blocked: true, blocked_reason: "3 neprezentari consecutive fara anulare", created_at: "2025-06-01T10:00:00Z" },
  { id: 10, business_id: 1, full_name: "Simona Toma", phone: "+40731999000", email: "simona.t@gmail.com", source: "online_booking", tags: ["fidela", "mireasa"], notes: "Mireasa in iunie 2026. Pachet complet coafura + machiaj.", preferred_employee_id: 1, preferred_channel: "viber", notifications_enabled: true, gdpr_consent: true, gdpr_consent_date: "2025-11-15T09:00:00Z", gdpr_article9_consent: false, total_appointments: 6, total_revenue: 1800, no_show_count: 0, last_visit_at: "2026-02-18T09:30:00Z", is_blocked: false, created_at: "2025-11-15T09:00:00Z" },
];

// ============================================================
// TODAY'S APPOINTMENTS (19 Feb 2026)
// ============================================================

function todayAt(h: number, m: number): string {
  const d = new Date(2026, 1, 19, h, m, 0);
  return d.toISOString();
}

function todayAtEnd(h: number, m: number, durationMin: number): string {
  const d = new Date(2026, 1, 19, h, m + durationMin, 0);
  return d.toISOString();
}

export const MOCK_APPOINTMENTS_TODAY = [
  { id: 101, business_id: 1, employee_id: 1, service_id: 2, client_id: 10, start_time: todayAt(9, 0), end_time: todayAtEnd(9, 0, 90), duration_minutes: 90, status: "completed", price: 180, currency: "RON", vat_rate: 19, discount_percent: 0, final_price: 180, payment_status: "paid", payment_method: "card", walk_in_name: null, walk_in_phone: null, internal_notes: "Pachet mireasa - sedinta 4/6", client_notes: null, source: "manual", employee_name: "Ana P.", service_name: "Vopsit radacini", client_name: "Simona Toma" },
  { id: 102, business_id: 1, employee_id: 2, service_id: 6, client_id: 5, start_time: todayAt(10, 0), end_time: todayAtEnd(10, 0, 60), duration_minutes: 60, status: "completed", price: 100, currency: "RON", vat_rate: 19, discount_percent: 0, final_price: 100, payment_status: "paid", payment_method: "cash", walk_in_name: null, walk_in_phone: null, internal_notes: null, client_notes: null, source: "online", employee_name: "Maria I.", service_name: "Manichiura semi", client_name: "Diana Vasilescu" },
  { id: 103, business_id: 1, employee_id: 3, service_id: 9, client_id: 1, start_time: todayAt(10, 0), end_time: todayAtEnd(10, 0, 60), duration_minutes: 60, status: "completed", price: 180, currency: "RON", vat_rate: 19, discount_percent: 10, final_price: 162, payment_status: "paid", payment_method: "card", walk_in_name: null, walk_in_phone: null, internal_notes: "Clienta VIP - discount 10%", client_notes: null, source: "manual", employee_name: "Elena D.", service_name: "Tratament facial", client_name: "Ioana Marinescu" },
  { id: 104, business_id: 1, employee_id: 4, service_id: 12, client_id: 8, start_time: todayAt(10, 30), end_time: todayAtEnd(10, 30, 30), duration_minutes: 30, status: "completed", price: 50, currency: "RON", vat_rate: 19, discount_percent: 0, final_price: 50, payment_status: "paid", payment_method: "cash", walk_in_name: null, walk_in_phone: null, internal_notes: null, client_notes: null, source: "online", employee_name: "Andreea S.", service_name: "Tuns barbati", client_name: "Bogdan Stanciu" },
  { id: 105, business_id: 1, employee_id: 1, service_id: 1, client_id: 7, start_time: todayAt(11, 0), end_time: todayAtEnd(11, 0, 45), duration_minutes: 45, status: "in_progress", price: 80, currency: "RON", vat_rate: 19, discount_percent: 0, final_price: 80, payment_status: "unpaid", payment_method: null, walk_in_name: null, walk_in_phone: null, internal_notes: null, client_notes: "Vreau sa pastrez lungimea", source: "online", employee_name: "Ana P.", service_name: "Tuns dama", client_name: "Andreea Munteanu" },
  { id: 106, business_id: 1, employee_id: 2, service_id: 7, client_id: 4, start_time: todayAt(11, 30), end_time: todayAtEnd(11, 30, 90), duration_minutes: 90, status: "confirmed", price: 150, currency: "RON", vat_rate: 19, discount_percent: 0, final_price: 150, payment_status: "unpaid", payment_method: null, walk_in_name: null, walk_in_phone: null, internal_notes: null, client_notes: "Design french", source: "online", employee_name: "Maria I.", service_name: "Manichiura gel", client_name: "Alexandra Dumitrescu" },
  { id: 107, business_id: 1, employee_id: 3, service_id: 11, client_id: null, start_time: todayAt(11, 30), end_time: todayAtEnd(11, 30, 30), duration_minutes: 30, status: "confirmed", price: 70, currency: "RON", vat_rate: 19, discount_percent: 0, final_price: 70, payment_status: "unpaid", payment_method: null, walk_in_name: "Gabriela V.", walk_in_phone: "+40733111222", internal_notes: "Walk-in", client_notes: null, source: "manual", employee_name: "Elena D.", service_name: "Epilare ceara", client_name: "Gabriela V." },
  { id: 108, business_id: 1, employee_id: 1, service_id: 3, client_id: 2, start_time: todayAt(13, 0), end_time: todayAtEnd(13, 0, 180), duration_minutes: 180, status: "confirmed", price: 450, currency: "RON", vat_rate: 19, discount_percent: 0, final_price: 450, payment_status: "unpaid", payment_method: null, walk_in_name: null, walk_in_phone: null, internal_notes: "Balayage blond cenusiu", client_notes: "Vreau tonul de pe Instagram", source: "online", employee_name: "Ana P.", service_name: "Balayage", client_name: "Cristina Popa" },
  { id: 109, business_id: 1, employee_id: 4, service_id: 12, client_id: 3, start_time: todayAt(13, 0), end_time: todayAtEnd(13, 0, 30), duration_minutes: 30, status: "confirmed", price: 50, currency: "RON", vat_rate: 19, discount_percent: 0, final_price: 50, payment_status: "unpaid", payment_method: null, walk_in_name: null, walk_in_phone: null, internal_notes: null, client_notes: null, source: "online", employee_name: "Andreea S.", service_name: "Tuns barbati", client_name: "Mihai Popa" },
  { id: 110, business_id: 1, employee_id: 2, service_id: 8, client_id: 6, start_time: todayAt(14, 0), end_time: todayAtEnd(14, 0, 75), duration_minutes: 75, status: "pending", price: 120, currency: "RON", vat_rate: 19, discount_percent: 0, final_price: 120, payment_status: "unpaid", payment_method: null, walk_in_name: null, walk_in_phone: null, internal_notes: null, client_notes: null, source: "online", employee_name: "Maria I.", service_name: "Pedichiura spa", client_name: "Raluca Gheorghe" },
  { id: 111, business_id: 1, employee_id: 3, service_id: 10, client_id: 7, start_time: todayAt(14, 0), end_time: todayAtEnd(14, 0, 45), duration_minutes: 45, status: "pending", price: 200, currency: "RON", vat_rate: 19, discount_percent: 0, final_price: 200, payment_status: "unpaid", payment_method: null, walk_in_name: null, walk_in_phone: null, internal_notes: null, client_notes: null, source: "manual", employee_name: "Elena D.", service_name: "Microderm.", client_name: "Andreea Munteanu" },
  { id: 112, business_id: 1, employee_id: 1, service_id: 4, client_id: 10, start_time: todayAt(17, 0), end_time: todayAtEnd(17, 0, 60), duration_minutes: 60, status: "pending", price: 200, currency: "RON", vat_rate: 19, discount_percent: 0, final_price: 200, payment_status: "unpaid", payment_method: null, walk_in_name: null, walk_in_phone: null, internal_notes: "Proba coafat nunta", client_notes: "Vreau bucle lejere", source: "manual", employee_name: "Ana P.", service_name: "Coafat ocazie", client_name: "Simona Toma" },
];

// ============================================================
// WEEK APPOINTMENTS (for calendar view, 17-23 Feb 2026)
// ============================================================
function dayAt(dayOffset: number, h: number, m: number): string {
  const d = new Date(2026, 1, 17 + dayOffset, h, m, 0);
  return d.toISOString();
}

export const MOCK_APPOINTMENTS_WEEK = [
  // Monday 17 Feb
  { id: 201, employee_id: 1, service_id: 1, start_time: dayAt(0, 9, 0), end_time: dayAt(0, 9, 45), status: "completed", employee_name: "Ana P.", service_name: "Tuns dama", client_name: "Ioana Marinescu", color: "#8b5cf6" },
  { id: 202, employee_id: 2, service_id: 6, start_time: dayAt(0, 10, 0), end_time: dayAt(0, 11, 0), status: "completed", employee_name: "Maria I.", service_name: "Manichiura semi", client_name: "Diana Vasilescu", color: "#ec4899" },
  { id: 203, employee_id: 1, service_id: 3, start_time: dayAt(0, 11, 0), end_time: dayAt(0, 14, 0), status: "completed", employee_name: "Ana P.", service_name: "Balayage", client_name: "Andreea Munteanu", color: "#8b5cf6" },
  { id: 204, employee_id: 3, service_id: 9, start_time: dayAt(0, 14, 0), end_time: dayAt(0, 15, 0), status: "completed", employee_name: "Elena D.", service_name: "Tratament facial", client_name: "Cristina Popa", color: "#f59e0b" },
  // Tuesday 18 Feb
  { id: 205, employee_id: 1, service_id: 2, start_time: dayAt(1, 9, 0), end_time: dayAt(1, 10, 30), status: "completed", employee_name: "Ana P.", service_name: "Vopsit radacini", client_name: "Raluca Gheorghe", color: "#8b5cf6" },
  { id: 206, employee_id: 2, service_id: 7, start_time: dayAt(1, 11, 0), end_time: dayAt(1, 12, 30), status: "completed", employee_name: "Maria I.", service_name: "Manichiura gel", client_name: "Simona Toma", color: "#ec4899" },
  { id: 207, employee_id: 4, service_id: 12, start_time: dayAt(1, 10, 0), end_time: dayAt(1, 10, 30), status: "completed", employee_name: "Andreea S.", service_name: "Tuns barbati", client_name: "Bogdan Stanciu", color: "#06b6d4" },
  // Wednesday 19 Feb (today) - use MOCK_APPOINTMENTS_TODAY
  // Thursday 20 Feb
  { id: 301, employee_id: 1, service_id: 5, start_time: dayAt(3, 9, 0), end_time: dayAt(3, 9, 45), status: "confirmed", employee_name: "Ana P.", service_name: "Olaplex", client_name: "Ioana Marinescu", color: "#8b5cf6" },
  { id: 302, employee_id: 2, service_id: 6, start_time: dayAt(3, 10, 0), end_time: dayAt(3, 11, 0), status: "confirmed", employee_name: "Maria I.", service_name: "Manichiura semi", client_name: "Alexandra Dumitrescu", color: "#ec4899" },
  { id: 303, employee_id: 1, service_id: 1, start_time: dayAt(3, 11, 0), end_time: dayAt(3, 11, 45), status: "confirmed", employee_name: "Ana P.", service_name: "Tuns dama", client_name: "Cristina Popa", color: "#8b5cf6" },
  { id: 304, employee_id: 3, service_id: 11, start_time: dayAt(3, 14, 0), end_time: dayAt(3, 14, 30), status: "confirmed", employee_name: "Elena D.", service_name: "Epilare ceara", client_name: "Diana Vasilescu", color: "#f59e0b" },
  // Friday 21 Feb
  { id: 305, employee_id: 1, service_id: 3, start_time: dayAt(4, 10, 0), end_time: dayAt(4, 13, 0), status: "confirmed", employee_name: "Ana P.", service_name: "Balayage", client_name: "Simona Toma", color: "#8b5cf6" },
  { id: 306, employee_id: 2, service_id: 8, start_time: dayAt(4, 11, 0), end_time: dayAt(4, 12, 15), status: "confirmed", employee_name: "Maria I.", service_name: "Pedichiura spa", client_name: "Andreea Munteanu", color: "#ec4899" },
  { id: 307, employee_id: 4, service_id: 13, start_time: dayAt(4, 9, 0), end_time: dayAt(4, 9, 30), status: "confirmed", employee_name: "Andreea S.", service_name: "Barba + contur", client_name: "Mihai Popa", color: "#06b6d4" },
  // Saturday 22 Feb
  { id: 308, employee_id: 1, service_id: 4, start_time: dayAt(5, 10, 0), end_time: dayAt(5, 11, 0), status: "confirmed", employee_name: "Ana P.", service_name: "Coafat ocazie", client_name: "Andreea Munteanu", color: "#8b5cf6" },
  { id: 309, employee_id: 2, service_id: 6, start_time: dayAt(5, 10, 0), end_time: dayAt(5, 11, 0), status: "confirmed", employee_name: "Maria I.", service_name: "Manichiura semi", client_name: "Ioana Marinescu", color: "#ec4899" },
];

// ============================================================
// INVOICES
// ============================================================
export const MOCK_INVOICES = [
  { id: 1, business_id: 1, client_id: 2, series: "BCR", number: 1, invoice_date: "2026-02-15T14:30:00Z", due_date: "2026-03-15T14:30:00Z", buyer_name: "Cristina Popa", buyer_cui: null, buyer_address: null, buyer_is_company: false, subtotal: 352.94, vat_amount: 67.06, total: 420, currency: "RON", line_items: [{ description: "Balayage premium", quantity: 1, unit_price: 352.94, vat_rate: 19, total: 420 }], status: "paid", payment_status: "paid", paid_amount: 420, efactura_status: "uploaded", pdf_url: null, created_at: "2026-02-15T14:30:00Z" },
  { id: 2, business_id: 1, client_id: 1, series: "BCR", number: 2, invoice_date: "2026-02-17T12:00:00Z", due_date: "2026-03-17T12:00:00Z", buyer_name: "Ioana Marinescu", buyer_cui: null, buyer_address: null, buyer_is_company: false, subtotal: 235.29, vat_amount: 44.71, total: 280, currency: "RON", line_items: [{ description: "Tuns dama + Tratament Olaplex", quantity: 1, unit_price: 235.29, vat_rate: 19, total: 280 }], status: "issued", payment_status: "unpaid", paid_amount: 0, efactura_status: "uploaded", pdf_url: null, created_at: "2026-02-17T12:00:00Z" },
  { id: 3, business_id: 1, client_id: 10, series: "BCR", number: 3, invoice_date: "2026-02-18T10:00:00Z", due_date: null, buyer_name: "Simona Toma", buyer_cui: null, buyer_address: null, buyer_is_company: false, subtotal: 151.26, vat_amount: 28.74, total: 180, currency: "RON", line_items: [{ description: "Vopsit radacini - pachet mireasa sedinta 4/6", quantity: 1, unit_price: 151.26, vat_rate: 19, total: 180 }], status: "paid", payment_status: "paid", paid_amount: 180, efactura_status: "accepted", pdf_url: null, created_at: "2026-02-18T10:00:00Z" },
  { id: 4, business_id: 1, client_id: 7, series: "BCR", number: 4, invoice_date: "2026-02-19T11:45:00Z", due_date: null, buyer_name: "SC Event Magic SRL", buyer_cui: "RO12345678", buyer_address: "Bd. Unirii 20, Bucuresti", buyer_reg_com: "J40/5678/2020", buyer_is_company: true, subtotal: 378.15, vat_amount: 71.85, total: 450, currency: "RON", line_items: [{ description: "Balayage - Andreea Munteanu", quantity: 1, unit_price: 378.15, vat_rate: 19, total: 450 }], status: "draft", payment_status: "unpaid", paid_amount: 0, efactura_status: null, pdf_url: null, created_at: "2026-02-19T11:00:00Z" },
];

// ============================================================
// NOTIFICATION LOG
// ============================================================
export const MOCK_NOTIFICATIONS = [
  { id: 1, business_id: 1, appointment_id: 108, channel: "viber", message_type: "booking_confirm", recipient: "+40724222333", content: "Programare confirmata la Salon Elegance!\n\nServiciu: Balayage\nSpecialist: Ana P.\nData: 19.02.2026 la 13:00\n\nPentru anulare, contacteaza-ne cu cel putin 24h inainte.", status: "delivered", cost: 0.02, cost_currency: "EUR", created_at: "2026-02-18T13:05:00Z", delivered_at: "2026-02-18T13:05:02Z" },
  { id: 2, business_id: 1, appointment_id: 108, channel: "viber", message_type: "reminder_24h", recipient: "+40724222333", content: "Reminder: Ai o programare la Salon Elegance maine!\n\nServiciu: Balayage\nData: 19.02.2026 la 13:00\n\nTe asteptam!", status: "delivered", cost: 0.02, cost_currency: "EUR", created_at: "2026-02-18T13:00:00Z", delivered_at: "2026-02-18T13:00:01Z" },
  { id: 3, business_id: 1, appointment_id: 106, channel: "whatsapp", message_type: "booking_confirm", recipient: "+40725333444", content: "Programare confirmata la Salon Elegance!\n\nServiciu: Manichiura gel\nSpecialist: Maria I.\nData: 19.02.2026 la 11:30", status: "delivered", cost: 0.014, cost_currency: "EUR", created_at: "2026-02-17T15:20:00Z", delivered_at: "2026-02-17T15:20:03Z" },
  { id: 4, business_id: 1, appointment_id: 110, channel: "sms", message_type: "booking_confirm", recipient: "+40727555666", content: "Salon Elegance: Programare confirmata - Pedichiura spa cu Maria I., 19.02.2026 14:00", status: "delivered", cost: 0.06, cost_currency: "EUR", created_at: "2026-02-17T10:30:00Z", delivered_at: "2026-02-17T10:30:05Z" },
  { id: 5, business_id: 1, appointment_id: 112, channel: "viber", message_type: "reminder_24h", recipient: "+40731999000", content: "Reminder: Ai o programare la Salon Elegance maine!\n\nServiciu: Coafat ocazie\nData: 19.02.2026 la 17:00\n\nTe asteptam!", status: "read", cost: 0.02, cost_currency: "EUR", created_at: "2026-02-18T17:00:00Z", delivered_at: "2026-02-18T17:00:01Z" },
  { id: 6, business_id: 1, appointment_id: null, channel: "viber", message_type: "custom", recipient: "+40723111222", content: "Draga Ioana, avem o promotie speciala luna aceasta: -20% la tratamente faciale! Programeaza-te acum.", status: "read", cost: 0.02, cost_currency: "EUR", created_at: "2026-02-15T09:00:00Z", delivered_at: "2026-02-15T09:00:02Z" },
  { id: 7, business_id: 1, appointment_id: 205, channel: "sms", message_type: "reminder_1h", recipient: "+40727555666", content: "Salon Elegance: Reminder - Vopsit radacini cu Ana P. azi la 09:00. Te asteptam!", status: "delivered", cost: 0.06, cost_currency: "EUR", created_at: "2026-02-18T08:00:00Z", delivered_at: "2026-02-18T08:00:04Z" },
  { id: 8, business_id: 1, appointment_id: null, channel: "viber", message_type: "review_request", recipient: "+40724222334", content: "Multumim pentru vizita la Salon Elegance, Mihai! Ai cateva secunde sa ne lasi o recenzie?", status: "sent", cost: 0.02, cost_currency: "EUR", created_at: "2026-02-15T15:00:00Z", delivered_at: null },
];

// ============================================================
// DASHBOARD STATS
// ============================================================
export const MOCK_STATS = {
  today: {
    appointments: 12,
    completed: 4,
    in_progress: 1,
    confirmed: 4,
    pending: 3,
    revenue_today: 492, // completed
    revenue_expected: 1812, // all today
  },
  week: {
    appointments: 28,
    revenue: 4850,
    new_clients: 3,
    no_shows: 0,
  },
  month: {
    appointments: 112,
    revenue: 18750,
    new_clients: 8,
    no_shows: 1,
    avg_ticket: 167.41,
    occupancy_rate: 72,
  },
  total: {
    clients: 10,
    revenue: 21830,
    appointments: 152,
    no_shows: 4,
  },
  revenue_chart: [
    { month: "Sep", revenue: 12400 },
    { month: "Oct", revenue: 14200 },
    { month: "Nov", revenue: 15800 },
    { month: "Dec", revenue: 18100 },
    { month: "Ian", revenue: 16500 },
    { month: "Feb", revenue: 18750 },
  ],
  top_services: [
    { name: "Manichiura semi", count: 35, revenue: 3500 },
    { name: "Tuns dama", count: 28, revenue: 2240 },
    { name: "Balayage", count: 12, revenue: 5400 },
    { name: "Tratament facial", count: 15, revenue: 2700 },
    { name: "Tuns barbati", count: 20, revenue: 1000 },
  ],
  channel_breakdown: [
    { channel: "Viber", count: 145, cost: 2.90 },
    { channel: "WhatsApp", count: 52, cost: 0.73 },
    { channel: "SMS", count: 38, cost: 2.28 },
  ],
};
