import type { ManufacturerRequestKind, ManufacturerRequestStatus, ProductEventKind } from "@/lib/types";

export const REQUEST_KIND_LABEL: Record<ManufacturerRequestKind, string> = {
  product_inquiry: "Product question",
  availability: "Availability in Kuwait / GCC",
  business: "Business inquiry",
  purchase: "Purchase",
  distributor: "Distributor",
  partnership: "Partnership",
};

export const REQUEST_STATUS_LABEL: Record<ManufacturerRequestStatus, string> = {
  new: "New", reviewing: "Reviewing", responded: "Responded", in_progress: "In progress", completed: "Completed", closed: "Closed",
};
export const REQUEST_STATUSES = Object.keys(REQUEST_STATUS_LABEL) as ManufacturerRequestStatus[];

export const REQUEST_STATUS_TONE: Record<ManufacturerRequestStatus, "warn" | "brand" | "good" | "neutral"> = {
  new: "warn", reviewing: "brand", responded: "good", in_progress: "brand", completed: "good", closed: "neutral",
};

export const EVENT_KIND_LABEL: Record<ProductEventKind, string> = {
  view: "Product page views", compare: "Added to a comparison", design_use: "Used in a design", purchase_request: "Purchase requests",
};
export const EVENT_KINDS = Object.keys(EVENT_KIND_LABEL) as ProductEventKind[];
