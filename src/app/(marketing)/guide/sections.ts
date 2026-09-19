import type { LucideIcon } from "lucide-react";
import {
  Rocket, Home, Calculator, Store, GitCompare, PencilRuler, ShoppingCart, Bot,
  Activity, Wrench, Coins, FileText, FileBadge,
} from "lucide-react";
import type { PlaceholderKey } from "@/lib/config/placeholders";

export interface GuideLink { href: string; label: string }

/** An honest statement about what is not connected yet, and the placeholders it waits on. */
export interface GuideNote { text: string; keys?: PlaceholderKey[] }

export interface GuideSection {
  id: string;
  title: string;
  icon: LucideIcon;
  /** One sentence answering “what is this part of Solink for?” */
  lead: string;
  /** 1–3 short homeowner-friendly paragraphs. */
  body: string[];
  links: GuideLink[];
  note?: GuideNote;
}

export const SECTIONS: GuideSection[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: Rocket,
    lead: "Solink follows one path: understand your home, size a system, choose it, design it, arrange the purchase, then look after it for years.",
    body: [
      "You do not have to do it all in one sitting. Each step keeps what you entered, and the Dashboard shows which step comes next. Before anything is installed, the Dashboard is a short four-step path: profile, potential, marketplace, designer.",
      "The menu inside Solink follows the same order as this guide, so you can always find your place. If a word is unfamiliar, look for the small information icon beside it.",
    ],
    links: [{ href: "/dashboard", label: "Go to the Dashboard" }],
    note: {
      text: "Solink also runs without a database. In that mode everything you save stays in this browser only, nothing is shared with anyone, and every demonstration figure carries a red DEMO DATA label so it is never mistaken for your own.",
      keys: ["SUPABASE_PROJECT"],
    },
  },
  {
    id: "analyze-your-home",
    title: "Analyze Your Home",
    icon: Home,
    lead: "Everything starts with your Solar Profile: a short description of your home, your roof and how much electricity you use.",
    body: [
      "Enter your address, the roof measurements, how much of the roof panels could actually use, which way it faces, its tilt, and anything that casts a shadow. Add your monthly electricity use, in kilowatt-hours if you have it. A progress meter shows how complete the profile is and unlocks the next page once it has enough to work with.",
      "Solar Potential then turns that into a picture: how many panels fit, what size of system that is, and what it might produce in a year. You can type the assumptions behind it yourself and watch every figure change.",
      "What you typed stays labelled as yours. What Solink worked out is labelled as a calculation. Where something needs information Solink does not have, it names the missing input instead of guessing.",
    ],
    links: [
      { href: "/profile", label: "Go to Solar Profile" },
      { href: "/analysis", label: "Go to Solar Potential" },
    ],
    note: {
      text: "Roof direction, tilt and shading are recorded but not yet used in the maths. Until a site data source is connected, every roof is treated the same, so treat the result as a rough size guide. Sunlight figures for your exact address need a solar resource source, and the map view needs a Google Maps key. Without the map you can still type your coordinates by hand.",
      keys: ["SOLAR_RESOURCE_DATA_SOURCE", "GOOGLE_SOLAR_SITE_DATA_SOURCE", "GOOGLE_MAPS_API_KEY"],
    },
  },
  {
    id: "calculate-your-needs",
    title: "Calculate Your Solar Needs",
    icon: Calculator,
    lead: "The Savings Calculator is where you test a system on paper before spending anything.",
    body: [
      "Put in your electricity use, a system size, and what you expect to pay: equipment, installation, cleaning and maintenance. Out comes production, how much of your use solar would cover, payback, lifetime savings and the total cost of ownership, with two charts.",
      "Nothing is filled in for you. Every assumption is blank until you type it, and each one names the decision it is standing in for. That is slower, but it means no figure on the page is a number somebody invented.",
      "Change one input and everything updates. Your inputs stay in this browser, so you can come back to them.",
    ],
    links: [{ href: "/calculator", label: "Go to the Savings Calculator" }],
    note: {
      text: "Money saved and payback need a price per kilowatt-hour; Solink will not supply one, because an invented tariff produces an invented saving. The same is true of the system loss assumption and the CO₂ figure for grid electricity. Until you provide them, those results stay empty and the charts say exactly what is missing.",
      keys: ["ELECTRICITY_TARIFF", "SYSTEM_LOSS_FACTOR", "GRID_CO2_EMISSION_FACTOR"],
    },
  },
  {
    id: "choose-your-system",
    title: "Choose Your Solar System",
    icon: Store,
    lead: "The Marketplace lists panels and other equipment with their technical specifications.",
    body: [
      "Filter by category, search by name or manufacturer, and sort by rated power or efficiency. Each product shows where its specifications came from and whether they have been checked: verified, pending or unverified. A specification with no source is shown as missing, not filled in with a believable number.",
      "You can add products to a shortlist as you browse and send that shortlist to the comparison table. If you would rather be pointed in a direction first, the AI Recommendation page reads your profile and explains how the options trade off against each other. It is not allowed to name a single best panel.",
    ],
    links: [
      { href: "/marketplace", label: "Go to the Marketplace" },
      { href: "/recommend", label: "Go to AI Recommendation" },
    ],
    note: {
      text: "A verified manufacturer dataset has not been chosen yet, so the catalogue is demonstration data and no real price can be shown. Use it to learn what to look at, not to pick a product. AI Recommendation additionally needs the AI service to be connected.",
      keys: ["REAL_SOLAR_PANEL_DATA_SOURCE", "CLAUDE_API_KEY"],
    },
  },
  {
    id: "compare-products",
    title: "Compare Solar Products",
    icon: GitCompare,
    lead: "Compare puts up to four panels side by side, one specification per row.",
    body: [
      "Because every row uses the same unit, differences are easy to see. The highest and lowest value in a row are marked. But marked is not the same as better, and Solink says so on the page. A cheap panel with a poor temperature coefficient can lose more on a hot Kuwaiti afternoon than it saved at purchase.",
      "Where a product has no value for a row, the cell says so rather than showing a blank you might read as zero. Use the information icons when a specification name is unfamiliar.",
      "Some rows: expected yearly production, total cost of ownership. Only appear once you type the assumptions they need, at the top of the table.",
    ],
    links: [{ href: "/compare", label: "Go to Compare" }],
    note: {
      text: "A comparison is only as good as the data behind it. While the catalogue is demonstration data, the cost rows have no real price to work from and stay unavailable.",
      keys: ["REAL_SOLAR_PANEL_DATA_SOURCE"],
    },
  },
  {
    id: "design-your-system",
    title: "Design Your Solar System",
    icon: PencilRuler,
    lead: "The Solar Designer lets you lay panels out on a scale drawing of your roof.",
    body: [
      "Enter the roof size, then mark the things already up there: a water tank, an air-conditioning unit, a stairwell. Pick a panel and place them by dragging, or let Solink fill the free space with a grid. You can nudge, rotate, undo and clear, with the keyboard as well as the mouse.",
      "As you work it counts the panels, the area used and the resulting system size. That is pure geometry from the panel dimensions, so it is reliable. Save a design and you can carry it straight into the purchase step.",
      "You can also ask the AI to suggest a layout. Whatever it proposes is labelled as AI interpretation: a starting point for a conversation with an installer.",
    ],
    links: [{ href: "/designer", label: "Go to the Solar Designer" }],
    note: {
      text: "A layout made here is not an engineering drawing. Structure, wiring, safety distances and permits are the installer’s job. Yearly production and cost figures for a design stay empty until you supply the assumptions and a real panel price exists. Smart placement needs the AI service connected.",
      keys: ["SOLAR_RESOURCE_DATA_SOURCE", "INSTALLATION_PRICE", "CLAUDE_API_KEY"],
    },
  },
  {
    id: "purchase-and-installation",
    title: "Purchase and Installation",
    icon: ShoppingCart,
    lead: "This is where a choice becomes a request: the equipment, an installer and a date you would like.",
    body: [
      "It runs in order: choose the system (from a saved design or a quick pick), review the itemised list, request a quote, select an installer from the registered companies, then propose a date and time window. You cannot skip ahead, and you can go back.",
      "What you end up with is a saved request you can adjust or show to a company. Once a system is actually installed, it becomes the basis of your Solar Passport.",
    ],
    links: [{ href: "/purchase", label: "Go to Purchase & Install" }],
    note: {
      text: "No payment provider is connected, so nothing here can take money: the payment card is switched off and the button says so. Never type real card details into it. Installation prices are missing until providers enter them, no email or message is sent to anyone, and if no installer company is registered there will be none to choose. Treat this as preparing a request, not buying.",
      keys: ["PAYMENT_PROVIDER", "INSTALLATION_PRICE", "EMAIL_NOTIFICATION_PROVIDER"],
    },
  },
  {
    id: "ai-solar-agent",
    title: "Use the AI Solar Agent",
    icon: Bot,
    lead: "The AI Solar Agent answers questions about your own situation in plain language.",
    body: [
      "Open it from its own page, from the Ask Solink button at the top of any Solink page, or from the round button in the bottom corner on a phone. Ask things like why yesterday looked low, or what a warning means.",
      "Before answering it reads what Solink actually holds about you: your profile, your system, your recent production, your maintenance history. When that is not enough, it says it does not have enough information rather than filling the gap. It is also barred from inventing prices, specifications or measurements, and from calling one product the best.",
      "It can read and explain, but it cannot act. It will not book a visit, place an order or change a setting for you. Everything it writes is labelled AI interpretation, and it can be wrong: check anything that costs money or affects safety with a qualified person.",
    ],
    links: [{ href: "/agent", label: "Go to the AI Solar Agent" }],
    note: {
      text: "The agent runs on a Claude API key held on the server. Without that key it cannot answer at all: it replies with a notice saying it is not connected, rather than a guess. The same applies to AI recommendations, smart placement, photo inspection and AI monitoring.",
      keys: ["CLAUDE_API_KEY"],
    },
  },
  {
    id: "monitor-your-system",
    title: "Monitor Your Solar System",
    icon: Activity,
    lead: "Monitoring is where you watch an installed system: production over time, the weather around it, and the conditions that cut output.",
    body: [
      "The overview charts daily and monthly production and compares the last seven days with the month before. Plain arithmetic, no interpretation. You can then ask the AI for an assessment, which reads production, maintenance and the latest weather and tells you what it used and what it was missing.",
      "The Weather pages show current conditions, a short forecast and air quality. Dust in the air is a hint that panels may need cleaning soon; it is not a measurement of how dirty your panels are. The Cleaning page pairs that with your production trend and the measured effect of the last cleaning.",
      "You can also upload a photo of a panel and ask the AI to describe what it sees, then turn that into an incident report. That is an opinion from a picture, not an inspection, and it will not claim damage.",
    ],
    links: [
      { href: "/monitoring", label: "Go to Monitoring" },
      { href: "/monitoring/weather", label: "Go to Weather" },
      { href: "/monitoring/inspection", label: "Go to Photo Inspection" },
    ],
    note: {
      text: "There is no live monitoring. Real readings have to come from your inverter or monitoring hardware, and panel-by-panel figures need extra equipment; neither is connected, so any production chart you see is a simulated series, clearly banner-labelled. Weather needs a weather service key and your coordinates, past weather is never fetched, and Solink will not judge a system as underperforming until alert thresholds are set.",
      keys: ["SOLAR_MONITORING_HARDWARE_API", "PANEL_LEVEL_MONITORING_DATA_SOURCE", "WEATHER_API_KEY", "PRODUCTION_ALERT_THRESHOLDS"],
    },
  },
  {
    id: "maintenance",
    title: "Maintenance",
    icon: Wrench,
    lead: "Maintenance keeps the record of every cleaning, inspection, repair and replacement your system has had.",
    body: [
      "Booking runs through four short steps: describe the problem and how urgent it feels, pick a provider or leave it open, choose a date and time window, then confirm. That opens a case you can follow.",
      "Anything that goes wrong can also be logged as an incident. Incidents are never deleted, only closed, so the history survives after the problem does. Each job stays attached to the system rather than to you. Which is what makes the record still useful years later, or to whoever owns the house next.",
    ],
    links: [
      { href: "/maintenance", label: "Go to Maintenance" },
      { href: "/incidents", label: "Go to Incidents" },
    ],
    note: {
      text: "A booking is stored in Solink, but nothing is sent to the provider: no email, no message. So contact them yourself and use the record to keep track. Photos are previews only until file storage is connected. Solink will also not predict a failure: it goes no further than saying an inspection may be worth booking.",
      keys: ["EMAIL_NOTIFICATION_PROVIDER", "SUPABASE_PROJECT", "PRODUCTION_ALERT_THRESHOLDS"],
    },
  },
  {
    id: "maintenance-costs",
    title: "Understanding Maintenance Costs",
    icon: Coins,
    lead: "A solar system keeps costing money after it is installed, so Solink keeps that cost in view instead of tucked away.",
    body: [
      "Panels need cleaning in a dusty climate, inverters do not last as long as panels, and things break. The maintenance page adds up what has actually been spent on the jobs recorded, and sets it beside the total cost of ownership: the equipment, the installation, and everything spent keeping the system working.",
      "Solink does not assume a price for a cleaning visit or a repair. Where a price is missing, the total says so rather than quietly leaving that cost out and looking cheaper than reality. A price you can see is a price somebody really quoted.",
    ],
    links: [
      { href: "/maintenance", label: "Go to Maintenance" },
      { href: "/calculator", label: "Model costs in the Calculator" },
    ],
    note: {
      text: "Providers have not entered prices, and the number of years a total-cost figure should cover has not been chosen. Until both are set, every cost cell shows the missing decision by name, and totals only include jobs with a real recorded price.",
      keys: ["MAINTENANCE_PRICE", "TCO_PERIOD"],
    },
  },
  {
    id: "reports",
    title: "Reports",
    icon: FileText,
    lead: "A report gathers one month into a single page: energy produced, maintenance carried out, and what that meant financially and environmentally.",
    body: [
      "Only finished months can be reported, so the month you are in appears once it has ended. Generate one and it is kept as a card showing the month’s total, the change from the month before, and how many incidents, cleanings and repairs it contained.",
      "Every figure carries its own label, so a measurement never gets confused with an estimate. A report is a sensible thing to keep for a warranty claim. To save one as a PDF, use your browser’s print dialog: Solink prints a version laid out for paper.",
    ],
    links: [{ href: "/reports", label: "Go to Reports" }],
    note: {
      text: "A report needs production records, which need monitoring hardware. The financial section needs an electricity price, the environmental section needs a CO₂ figure for grid electricity, and the written summary needs the AI service. Any of those missing, and that part of the report is shown as unavailable rather than estimated.",
      keys: ["SOLAR_MONITORING_HARDWARE_API", "ELECTRICITY_TARIFF", "GRID_CO2_EMISSION_FACTOR", "CLAUDE_API_KEY"],
    },
  },
  {
    id: "solar-passport",
    title: "Solar Passport",
    icon: FileBadge,
    lead: "The Solar Passport is the permanent identity of an installed system.",
    body: [
      "It holds what went on the roof, who installed it and when, the warranties that came with it and when they run out, and the full history of cleaning, repairs, replacements and incidents.",
      "It also freezes the specifications of your panel and inverter as they were on the day, and keeps the old version when something changes. That is what lets you show what was true at a given date: which matters for a warranty claim, and matters again when you sell the house and the next owner asks what is up there.",
      "A passport appears once a system is recorded as installed. Print it, or save it as a PDF through your browser, to hand to someone else.",
    ],
    links: [{ href: "/passport", label: "Go to Solar Passport" }],
    note: {
      text: "A passport can only describe what has been recorded. Where a warranty length or a specification was never entered it says “not recorded” rather than filling it in, and the monitoring source reads “not connected” until hardware is linked.",
      keys: ["SOLAR_MONITORING_HARDWARE_API"],
    },
  },
];
