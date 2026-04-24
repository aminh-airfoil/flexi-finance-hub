import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { Currency, Category, Account, Transaction } from "@/lib/types";
import { getIconByName } from "@/lib/icons";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface AppContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  fmt: (n: number) => string;
  convert: (n: number) => number;
  loading: boolean;

  transactions: Transaction[];
  addTransaction: (t: Omit<Transaction, "id">) => Promise<void>;
  updateTransaction: (t: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  categories: Category[];
  addCategory: (c: Omit<Category, "id">) => Promise<void>;
  updateCategory: (c: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  getMainCategories: () => Category[];
  getSubCategories: (parentId: string) => Category[];

  accounts: Account[];
  addAccount: (a: Omit<Account, "id">) => Promise<void>;
  updateAccount: (a: Account) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;

  getCat: (id: string | null) => Category | undefined;
  getAcc: (id: string) => Account | undefined;
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [currency, setCurrency] = useState<Currency>("USD");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  // Track whether we've done at least one successful load
  const hasLoadedRef = useRef(false);
  // Track the user ID we last loaded data for
  const loadedForUserRef = useRef<string | null>(null);

  const convert = useCallback((n: number) => n, []);
  const fmt = useCallback((n: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(n);
  }, [currency]);

  const getCat = useCallback((id: string | null) => id ? categories.find(c => c.id === id) : undefined, [categories]);
  const getAcc = useCallback((id: string) => accounts.find(a => a.id === id), [accounts]);
  const getMainCategories = useCallback(() => categories.filter(c => !c.parentId), [categories]);
  const getSubCategories = useCallback((parentId: string) => categories.filter(c => c.parentId === parentId), [categories]);

  // --- Fetch all data ---
  // silent=true: background refresh — don't show loading gate, keep existing data visible
  const fetchData = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);

    const [accRes, catRes, txRes] = await Promise.all([
      supabase.from("accounts").select("*").order("created_at"),
      supabase.from("categories").select("*").order("created_at"),
      supabase.from("transactions").select("*").order("date", { ascending: false }),
    ]);

    if (accRes.data) {
      setAccounts(accRes.data.map(a => ({
        id: a.id, name: a.name, bank: a.bank, balance: Number(a.balance), color: a.color, type: a.type,
      })));
    }

    if (catRes.data) {
      setCategories(catRes.data.map(c => ({
        id: c.id, name: c.name, parentId: (c as any).parent_id || null,
        icon: getIconByName(c.icon), iconName: c.icon, color: c.color, budget: Number(c.budget),
      })));
    }

    if (txRes.data) {
      setTransactions(txRes.data.map(t => ({
        id: t.id, date: t.date, desc: t.description, cat: t.category_id,
        amount: Number(t.amount), acc: t.account_id, note: t.note,
      })));
    }

    hasLoadedRef.current = true;
    loadedForUserRef.current = user.id;
    setLoading(false);
  }, [user]);

  // Initial load: only fetch when user is available and we haven't loaded for this user yet
  useEffect(() => {
    if (!user) return;
    // If we already have data for this user, skip — prevents refetch on auth token refresh
    if (hasLoadedRef.current && loadedForUserRef.current === user.id) return;
    fetchData(false);
  }, [user, fetchData]);

  // Listen for explicit refresh-data events (e.g. from AI chat)
  useEffect(() => {
    const handler = () => { fetchData(true); }; // silent background refresh
    window.addEventListener("refresh-data", handler);
    return () => window.removeEventListener("refresh-data", handler);
  }, [fetchData]);

  // --- Accounts CRUD ---
  const addAccount = async (a: Omit<Account, "id">) => {
    const { error } = await supabase.from("accounts").insert({
      user_id: user!.id, name: a.name, bank: a.bank, balance: a.balance, color: a.color, type: a.type,
    });
    if (error) { toast.error(error.message); return; }
    await fetchData(true);
  };

  const updateAccount = async (a: Account) => {
    const { error } = await supabase.from("accounts").update({
      name: a.name, bank: a.bank, balance: a.balance, color: a.color, type: a.type,
    }).eq("id", a.id);
    if (error) { toast.error(error.message); return; }
    await fetchData(true);
  };

  const deleteAccount = async (id: string) => {
    const { error } = await supabase.from("accounts").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await fetchData(true);
  };

  // --- Categories CRUD ---
  const addCategory = async (c: Omit<Category, "id">) => {
    const { error } = await supabase.from("categories").insert({
      user_id: user!.id, name: c.name, icon: c.iconName, color: c.color, budget: c.budget,
      parent_id: c.parentId || null,
    } as any);
    if (error) { toast.error(error.message); return; }
    await fetchData(true);
  };

  const updateCategory = async (c: Category) => {
    const { error } = await supabase.from("categories").update({
      name: c.name, icon: c.iconName, color: c.color, budget: c.budget,
      parent_id: c.parentId || null,
    } as any).eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    await fetchData(true);
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await fetchData(true);
  };

  // --- Transactions CRUD ---
  const addTransaction = async (t: Omit<Transaction, "id">) => {
    const { error } = await supabase.from("transactions").insert({
      user_id: user!.id, date: t.date, description: t.desc, amount: t.amount,
      category_id: t.cat || null, account_id: t.acc, note: t.note,
    });
    if (error) { toast.error(error.message); return; }
    await fetchData(true);
  };

  const updateTransaction = async (t: Transaction) => {
    const { error } = await supabase.from("transactions").update({
      date: t.date, description: t.desc, amount: t.amount,
      category_id: t.cat || null, account_id: t.acc, note: t.note,
    }).eq("id", t.id);
    if (error) { toast.error(error.message); return; }
    await fetchData(true);
  };

  const deleteTransaction = async (id: string) => {
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await fetchData(true);
  };

  return (
    <AppContext.Provider value={{
      currency, setCurrency, fmt, convert, loading,
      transactions, addTransaction, updateTransaction, deleteTransaction,
      categories, addCategory, updateCategory, deleteCategory,
      accounts, addAccount, updateAccount, deleteAccount,
      getCat, getAcc, getMainCategories, getSubCategories,
    }}>
      {children}
    </AppContext.Provider>
  );
};
