import React, { createContext, useContext, useState, useCallback } from "react";
import { Currency, Category, Account, Transaction } from "@/lib/types";
import { defaultCategories, defaultAccounts, defaultTransactions, EXCHANGE_RATES, CURRENCY_SYMBOLS } from "@/lib/data";

interface AppContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  fmt: (n: number) => string;
  convert: (n: number) => number;

  transactions: Transaction[];
  addTransaction: (t: Omit<Transaction, "id">) => void;
  updateTransaction: (t: Transaction) => void;
  deleteTransaction: (id: number) => void;

  categories: Category[];
  addCategory: (c: Omit<Category, "id">) => void;
  updateCategory: (c: Category) => void;
  deleteCategory: (id: number) => void;

  accounts: Account[];
  addAccount: (a: Omit<Account, "id">) => void;
  updateAccount: (a: Account) => void;
  deleteAccount: (id: number) => void;

  getCat: (id: number | null) => Category | undefined;
  getAcc: (id: number) => Account | undefined;
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};

let nextId = 100;

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrency] = useState<Currency>("USD");
  const [transactions, setTransactions] = useState<Transaction[]>(defaultTransactions);
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [accounts, setAccounts] = useState<Account[]>(defaultAccounts);

  const convert = useCallback((n: number) => n * EXCHANGE_RATES[currency], [currency]);
  const fmt = useCallback((n: number) => {
    const converted = n * EXCHANGE_RATES[currency];
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(converted);
  }, [currency]);

  const getCat = useCallback((id: number | null) => id ? categories.find(c => c.id === id) : undefined, [categories]);
  const getAcc = useCallback((id: number) => accounts.find(a => a.id === id), [accounts]);

  const addTransaction = (t: Omit<Transaction, "id">) => setTransactions(prev => [{ ...t, id: ++nextId }, ...prev]);
  const updateTransaction = (t: Transaction) => setTransactions(prev => prev.map(x => x.id === t.id ? t : x));
  const deleteTransaction = (id: number) => setTransactions(prev => prev.filter(x => x.id !== id));

  const addCategory = (c: Omit<Category, "id">) => setCategories(prev => [...prev, { ...c, id: ++nextId }]);
  const updateCategory = (c: Category) => setCategories(prev => prev.map(x => x.id === c.id ? c : x));
  const deleteCategory = (id: number) => setCategories(prev => prev.filter(x => x.id !== id));

  const addAccount = (a: Omit<Account, "id">) => setAccounts(prev => [...prev, { ...a, id: ++nextId }]);
  const updateAccount = (a: Account) => setAccounts(prev => prev.map(x => x.id === a.id ? a : x));
  const deleteAccount = (id: number) => setAccounts(prev => prev.filter(x => x.id !== id));

  return (
    <AppContext.Provider value={{
      currency, setCurrency, fmt, convert,
      transactions, addTransaction, updateTransaction, deleteTransaction,
      categories, addCategory, updateCategory, deleteCategory,
      accounts, addAccount, updateAccount, deleteAccount,
      getCat, getAcc,
    }}>
      {children}
    </AppContext.Provider>
  );
};
