import type { ProductionRecord } from "@/lib/types";
import type { ProductionChartData } from "./components/ProductionCharts";
import { lastDays, monthlyTotals, productionCls, weeklyTotals, yearlyTotals } from "./production";

/** Serialisable chart payload for the client ProductionCharts component. */
export function buildProductionChartData(records: ProductionRecord[]): ProductionChartData {
  return {
    cls: productionCls(records),
    source: records[0]?.source ?? null,
    days14: lastDays(records, 14),
    weeks12: weeklyTotals(records, 12),
    months12: monthlyTotals(records, 12),
    years: yearlyTotals(records),
  };
}
