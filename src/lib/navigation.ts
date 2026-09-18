import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, Home, Sun, Calculator, Store, GitCompare, Sparkles, PencilRuler, ShoppingCart, FileBadge,
  Activity, Wrench, AlertOctagon, FileText, TrendingUp, Recycle, Bot, ShieldCheck, BriefcaseBusiness, BookOpen,
} from "lucide-react";

export interface NavItem { href: string; label: string; icon: LucideIcon; description?: string }
export interface NavGroup { label: string; items: NavItem[] }

/** Homeowner app navigation, ordered along the Solink journey. */
export const APP_NAV: NavGroup[] = [
  { label: "Overview", items: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/agent", label: "AI Solar Agent", icon: Bot },
  ] },
  { label: "Plan", items: [
    { href: "/profile", label: "Solar Profile", icon: Home, description: "Your home, roof and electricity use" },
    { href: "/analysis", label: "Solar Potential", icon: Sun, description: "What your roof could produce" },
    { href: "/calculator", label: "Savings Calculator", icon: Calculator },
  ] },
  { label: "Choose", items: [
    { href: "/marketplace", label: "Marketplace", icon: Store },
    { href: "/compare", label: "Compare Panels", icon: GitCompare },
    { href: "/recommend", label: "AI Recommendation", icon: Sparkles },
    { href: "/designer", label: "Solar Designer", icon: PencilRuler },
    { href: "/purchase", label: "Purchase & Install", icon: ShoppingCart },
  ] },
  { label: "Operate", items: [
    { href: "/passport", label: "Solar Passport", icon: FileBadge },
    { href: "/monitoring", label: "Monitoring", icon: Activity },
    { href: "/maintenance", label: "Maintenance", icon: Wrench },
    { href: "/incidents", label: "Incidents", icon: AlertOctagon },
    { href: "/reports", label: "Reports", icon: FileText },
    { href: "/performance", label: "Long-term Performance", icon: TrendingUp },
    { href: "/replacement", label: "Replacement", icon: Recycle },
  ] },
  { label: "More", items: [
    { href: "/guide", label: "User Guide", icon: BookOpen },
    { href: "/provider", label: "Provider Dashboard", icon: BriefcaseBusiness },
    { href: "/admin", label: "Admin", icon: ShieldCheck },
  ] },
];

export const MARKETING_NAV = [
  { href: "/#journey", label: "The Journey" },
  { href: "/#features", label: "Features" },
  { href: "/guide", label: "User Guide" },
  { href: "/dashboard", label: "Open Solink" },
];

export const QUICK_START = ["Analyze Home", "Calculate Needs", "Choose System", "Design", "Purchase / Install", "Monitor", "Maintain", "Optimize"];
