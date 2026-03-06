import {
  Utensils, ShoppingCart, Car, Zap, Heart, Monitor, Plane, Coffee,
  LucideIcon, HelpCircle,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Utensils,
  ShoppingCart,
  Car,
  Zap,
  Heart,
  Monitor,
  Plane,
  Coffee,
};

export const ICON_OPTIONS = Object.entries(ICON_MAP).map(([name, icon]) => ({ name, icon }));

export function getIconByName(name: string): LucideIcon {
  return ICON_MAP[name] || HelpCircle;
}
