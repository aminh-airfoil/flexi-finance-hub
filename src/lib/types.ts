import { LucideIcon } from "lucide-react";

export type Currency = "USD" | "MYR";

export interface Category {
  id: string;
  name: string;
  parentId?: string | null;
  icon: LucideIcon;
  iconName: string;
  color: string;
  budget: number;
}

export interface Account {
  id: string;
  name: string;
  bank: string;
  balance: number;
  color: string;
  type: string;
}

export interface Transaction {
  id: string;
  date: string;
  desc: string;
  cat: string | null;
  amount: number;
  acc: string;
  note: string;
}
