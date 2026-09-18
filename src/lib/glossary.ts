/**
 * Layer 2 help: homeowner-friendly definitions for technical terms.
 * Rendered by <InfoTip term="..."/>.
 */
export interface GlossaryEntry { term: string; short: string; long?: string; }

export const GLOSSARY: Record<string, GlossaryEntry> = {
  kwh: { term: "kWh (kilowatt-hour)", short: "A unit of energy. One kWh runs a 1,000-watt appliance for one hour. Your electricity bill is measured in kWh." },
  kw: { term: "kW (kilowatt)", short: "A unit of power — how fast energy is produced or used at a moment. 1 kW = 1,000 watts." },
  kwp: { term: "kWp (kilowatt-peak)", short: "The rated size of a solar system under standard test conditions. Real output is usually lower and varies with weather." },
  efficiency: { term: "Panel efficiency", short: "The share of sunlight a panel turns into electricity. Higher efficiency means more power from the same roof area." },
  system_capacity: { term: "System capacity", short: "The total rated power of all panels combined, usually in kWp. A bigger system produces more energy but needs more roof space and budget." },
  payback_period: { term: "Payback period", short: "How many years until the money you save on electricity equals what you paid for the system. Depends heavily on the electricity tariff." },
  irradiance: { term: "Solar irradiance", short: "How much sunlight energy lands on a surface, often given as kWh per square metre per day. Kuwait receives a lot, but the exact figure must come from a real data source." },
  peak_sun_hours: { term: "Peak sun hours", short: "The equivalent number of hours per day at full sunlight strength. Used to estimate daily production from system size." },
  co2_reduction: { term: "CO₂ reduction", short: "The estimated greenhouse gas avoided because solar electricity replaces grid electricity. Depends on the grid's emission factor." },
  energy_production: { term: "Energy production", short: "The electricity your system generates over a period (day, month, year), measured in kWh." },
  degradation: { term: "Degradation", short: "Solar panels slowly produce a little less each year. Manufacturers state an expected rate in their performance warranty." },
  peak_power: { term: "Peak power (Pmax)", short: "The maximum power a panel can produce under standard test conditions, in watts (W)." },
  inverter: { term: "Inverter", short: "The device that converts the DC electricity from panels into the AC electricity your home uses. It also usually provides monitoring data." },
  battery: { term: "Battery storage", short: "Stores solar electricity for use at night or during outages. Optional; adds cost." },
  voc: { term: "Voc (open-circuit voltage)", short: "The panel's voltage when nothing is connected. Installers use it to design safe string sizes." },
  isc: { term: "Isc (short-circuit current)", short: "The panel's maximum current. Used for wiring and protection sizing." },
  vmp: { term: "Vmp (voltage at max power)", short: "The voltage at which the panel produces its rated power." },
  imp: { term: "Imp (current at max power)", short: "The current at which the panel produces its rated power." },
  temperature_coefficient: { term: "Temperature coefficient", short: "How much power a panel loses for every degree above 25 °C. Important in hot climates like Kuwait — a smaller loss is better." },
  performance_ratio: { term: "Performance ratio", short: "The share of theoretically possible production a real system delivers after losses from heat, dust, wiring and the inverter." },
  performance_warranty: { term: "Performance warranty", short: "The manufacturer's promise of how much of the original power the panel will still produce after a number of years." },
  product_warranty: { term: "Product warranty", short: "Covers defects in the panel itself (materials and workmanship) for a stated number of years." },
  tco: { term: "Total cost of ownership", short: "Everything a system costs over its life: purchase, installation, cleaning, maintenance, repairs and replacements." },
  energy_offset: { term: "Energy offset", short: "The share of your electricity use that solar covers. 100% means your system produces as much as you consume over the year." },
  pm25: { term: "PM2.5", short: "Very fine airborne particles (under 2.5 micrometres). An air-quality indicator — it hints at dusty conditions but is not a measurement of dust on your panels." },
  pm10: { term: "PM10", short: "Coarser airborne particles (under 10 micrometres), such as dust and sand. An environmental indicator, not a direct panel-soiling measurement." },
  soiling: { term: "Soiling", short: "Dust, sand or dirt on panels that blocks sunlight and reduces output. Cleaning restores it." },
  orientation: { term: "Roof orientation", short: "The compass direction your roof faces. In Kuwait, south-facing roofs generally receive the most sun over a year." },
  tilt: { term: "Tilt angle", short: "The angle of the panels from horizontal. Affects how much sunlight they capture across the seasons." },
  shading: { term: "Shading", short: "Anything that casts shadows on panels (buildings, tanks, trees) reduces production, sometimes disproportionately." },
  passport: { term: "Solar System Digital Passport", short: "Solink's permanent record of your installed system: equipment, installer, warranties and full maintenance history." },
  rls: { term: "Row Level Security", short: "A database rule that makes sure you can only see your own data." },
  string: { term: "String", short: "A group of panels wired together in series and connected to the inverter." },
  specific_yield: { term: "Specific yield", short: "Annual production per kWp installed (kWh/kWp). Useful for comparing systems of different sizes." },
};

export function glossary(key: string): GlossaryEntry | undefined {
  return GLOSSARY[key];
}
