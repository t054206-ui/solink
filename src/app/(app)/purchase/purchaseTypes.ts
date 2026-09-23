/**
 * Panel Purchase & Installation workflow types (client + server action inputs).
 *
 * "Order" here means a quote request to an installer, which is what the
 * `orders` table has always held: no payment provider, no totals owed to
 * anyone, no sale. Solink does not sell equipment; the panels themselves are
 * bought from the supplier listed on the product page.
 */

export type PurchaseStep = 0 | 1 | 2 | 3 | 4 | 5;
export const STEP_LABELS = ["Choose System", "Review", "Request a Quote", "Select Installation", "Schedule"] as const;

/**
 * A catalog product reduced to what an order line needs — prices are never
 * invented. The Purchase wizard only ever fills this from its own four
 * system-building categories; the basket (marketplace-wide) can fill it from
 * any category the marketplace lists, so the union covers all of them.
 */
export interface CatalogItem {
  id: string; category: "solar_panel" | "inverter" | "battery" | "installation_package" | "maintenance_package" | "cleaning_service" | "other_service";
  name: string; manufacturer: string; model: string;
  price: number | null; price_text: string; currency: string;
  rated_power_w: number | null; length_m: number | null; width_m: number | null;
  is_demo: boolean; provider_id: string | null;
}

export interface OrderItem {
  product_id: string; name: string; category: CatalogItem["category"]; qty: number;
  unit_price: number | null; currency: string; is_demo: boolean;
}

export interface SystemChoice {
  source: "design" | "quick";
  design_id: string | null;
  panel_id: string;
  panel_count: number;
  inverter_id: string | null;
  battery_id: string | null;
  install_package_id: string | null;
}

export interface ScheduleChoice { date: string; window: "morning" | "afternoon" | "evening"; notes: string }

export interface LocalOrder { id: string; status: "requested" | "installation_scheduled"; items: OrderItem[]; totals: { value: number | null; currency: string }; installer_id: string | null; system_id: string | null; created_at: string }
export interface LocalAppointment { id: string; kind: "installation"; system_id: string; provider_id: string; scheduled_at: string; status: "requested"; notes: string | null }
export interface LocalSystem { id: string; name: string; status: "installation_scheduled"; capacity_kwp: number | null; panel_count: number | null; panel_product_id: string | null; inverter_product_id: string | null; battery_product_id: string | null; installer_id: string; design_id: string | null; created_at: string }

export interface PurchaseStore {
  step: PurchaseStep;
  system: SystemChoice | null;
  request_kind: "quote" | null;
  order_id: string | null;
  installer_id: string | null;
  schedule: ScheduleChoice;
  system_id: string | null;
  appointment_id: string | null;
  /** Demo-mode records (would be `orders` / `appointments` / `solar_systems` rows in Supabase). */
  orders: LocalOrder[];
  appointments: LocalAppointment[];
  systems: LocalSystem[];
}

export const EMPTY_PURCHASE_STORE: PurchaseStore = {
  step: 0, system: null, request_kind: null, order_id: null, installer_id: null,
  schedule: { date: "", window: "morning", notes: "" }, system_id: null, appointment_id: null,
  orders: [], appointments: [], systems: [],
};

export const TIME_WINDOWS: Record<ScheduleChoice["window"], { label: string; startHour: number }> = {
  morning: { label: "Morning (08:00 – 12:00)", startHour: 8 },
  afternoon: { label: "Afternoon (12:00 – 16:00)", startHour: 12 },
  evening: { label: "Late afternoon (16:00 – 19:00)", startHour: 16 },
};
