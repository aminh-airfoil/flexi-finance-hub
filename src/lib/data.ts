import {
  Utensils, ShoppingCart, Car, Zap, Heart, Monitor, Plane, Coffee,
} from "lucide-react";
import { Category, Account, Transaction } from "./types";

export const defaultCategories: Category[] = [
  // Main categories (parentId: null)
  { id: 1, name: "Food & Dining",   parentId: null, icon: Utensils,      color: "#F59E0B", budget: 800  },
  { id: 2, name: "Shopping",        parentId: null, icon: ShoppingCart,   color: "#8B5CF6", budget: 600  },
  { id: 3, name: "Transport",       parentId: null, icon: Car,            color: "#0EA5E9", budget: 300  },
  { id: 4, name: "Utilities",       parentId: null, icon: Zap,            color: "#10B981", budget: 250  },
  { id: 5, name: "Healthcare",      parentId: null, icon: Heart,          color: "#F43F5E", budget: 400  },
  { id: 6, name: "Entertainment",   parentId: null, icon: Monitor,        color: "#EC4899", budget: 200  },
  { id: 7, name: "Travel",          parentId: null, icon: Plane,          color: "#14B8A6", budget: 1000 },
  { id: 8, name: "Coffee & Drinks", parentId: null, icon: Coffee,         color: "#D97706", budget: 150  },

  // Example subcategories (point to the main categories above)
  { id: 21, name: "Groceries",      parentId: 1,   icon: Utensils,      color: "#FBBF24", budget: 500  },
  { id: 22, name: "Restaurants",    parentId: 1,   icon: Utensils,      color: "#F97316", budget: 300  },
  { id: 23, name: "Online Shopping",parentId: 2,   icon: ShoppingCart,  color: "#A855F7", budget: 400  },
  { id: 24, name: "Clothing",       parentId: 2,   icon: ShoppingCart,  color: "#6366F1", budget: 200  },
];

export const defaultAccounts: Account[] = [
  { id: 1, name: "Main Checking", bank: "Chase Bank",     balance: 12480.50, color: "#0EA5E9", type: "Checking" },
  { id: 2, name: "Savings Goal",  bank: "Marcus Goldman", balance: 34200.00, color: "#10B981", type: "Savings"  },
  { id: 3, name: "Credit Card",   bank: "Amex Platinum",  balance: -2340.80, color: "#F43F5E", type: "Credit"   },
  { id: 4, name: "Investment",    bank: "Fidelity",       balance: 88750.00, color: "#8B5CF6", type: "Invest"   },
];

export const defaultTransactions: Transaction[] = [
  { id: 1,  date:"2025-03-28", desc:"Whole Foods Market",  cat:1,    amount:-124.30, acc:1, note:"Weekly groceries" },
  { id: 2,  date:"2025-03-27", desc:"Salary Deposit",      cat:null, amount:5200.00, acc:1, note:"Monthly salary"  },
  { id: 3,  date:"2025-03-27", desc:"Netflix",             cat:6,    amount:-15.99,  acc:3, note:"Monthly sub"     },
  { id: 4,  date:"2025-03-26", desc:"Shell Gas Station",   cat:3,    amount:-68.50,  acc:1, note:"Fill up"         },
  { id: 5,  date:"2025-03-25", desc:"Amazon Purchase",     cat:2,    amount:-289.99, acc:3, note:"Electronics"     },
  { id: 6,  date:"2025-03-24", desc:"Starbucks",           cat:8,    amount:-7.45,   acc:1, note:"Morning coffee"  },
  { id: 7,  date:"2025-03-23", desc:"Freelance Payment",   cat:null, amount:1200.00, acc:1, note:"Design project"  },
  { id: 8,  date:"2025-03-22", desc:"CVS Pharmacy",        cat:5,    amount:-43.20,  acc:3, note:"Prescriptions"   },
  { id: 9,  date:"2025-03-21", desc:"Uber",                cat:3,    amount:-22.80,  acc:1, note:"Airport ride"    },
  { id: 10, date:"2025-03-20", desc:"Chipotle",            cat:1,    amount:-18.90,  acc:1, note:"Lunch"           },
  { id: 11, date:"2025-03-19", desc:"AT&T Bill",           cat:4,    amount:-89.00,  acc:1, note:"Phone + internet"},
  { id: 12, date:"2025-03-18", desc:"Zara",                cat:2,    amount:-156.00, acc:3, note:"Spring clothing" },
  { id: 13, date:"2025-03-17", desc:"Planet Fitness",      cat:5,    amount:-24.99,  acc:1, note:"Gym membership"  },
  { id: 14, date:"2025-03-16", desc:"Spotify",             cat:6,    amount:-9.99,   acc:1, note:"Music sub"       },
  { id: 15, date:"2025-03-15", desc:"Delta Airlines",      cat:7,    amount:-420.00, acc:3, note:"NYC trip"        },
  { id: 16, date:"2025-03-14", desc:"Dividend Income",     cat:null, amount:340.00,  acc:4, note:"Q1 dividends"   },
  { id: 17, date:"2025-03-13", desc:"Blue Bottle Coffee",  cat:8,    amount:-12.50,  acc:1, note:"Coffee meeting"  },
  { id: 18, date:"2025-03-12", desc:"Trader Joe's",        cat:1,    amount:-97.40,  acc:1, note:"Groceries"       },
  { id: 19, date:"2025-03-11", desc:"Electric Bill",       cat:4,    amount:-112.00, acc:1, note:"March bill"      },
  { id: 20, date:"2025-03-10", desc:"Apple Store",         cat:2,    amount:-79.00,  acc:3, note:"Accessories"     },
];

export const dailyTrend = Array.from({ length: 31 }, (_, i) => ({
  day: i + 1,
  expenses: Math.round(50 + Math.random() * 200 + (i % 7 === 0 ? 150 : 0)),
  income: Math.round(i === 1 || i === 15 ? 5200 : (Math.random() > 0.9 ? 300 + Math.random() * 800 : 0)),
}));

export const monthlyFlow = [
  { m: "Oct", i: 5100, e: 3200 },
  { m: "Nov", i: 6200, e: 3800 },
  { m: "Dec", i: 7400, e: 4900 },
  { m: "Jan", i: 5800, e: 3100 },
  { m: "Feb", i: 6890, e: 3210 },
  { m: "Mar", i: 6740, e: 3890 },
];

export const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  MYR: 4.47,
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  MYR: "RM",
};
