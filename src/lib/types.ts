import { LucideIcon } from "lucide-react";

export type Currency = "USD" | "MYR";

export interface Category {
  id: number;
  name: string;
  /**
   * If null/undefined → main category.
   * If set         → subcategory of the category with this id.
   */
  parentId?: number | null;
  icon: LucideIcon;
  color: string;
  budget: number;
}

export interface Account {
  id: number;
  name: string;
  bank: string;
  balance: number;
  color: string;
  type: string;
}

export interface Transaction {
  id: number;
  date: string;
  desc: string;
  cat: number | null;
  amount: number;
  acc: number;
  note: string;
}
