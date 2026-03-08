import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are FinTrack AI, a financial assistant that helps users manage transactions. You can add, edit, and delete transactions.

RULES:
1. When user wants to add/edit a transaction, extract: description, amount, date, category, account, and note.
2. Amount should be NEGATIVE for expenses and POSITIVE for income.
3. If the user doesn't specify whether it's income or expense, ASK them.
4. If the user doesn't specify a category, ASK which category to use from the available list.
5. If the user doesn't specify an account, ASK which account to use from the available list.
6. If the category mentioned doesn't exist in the available list, tell the user it doesn't exist and ask them to create it first in the Categories page.
7. If the user mentions a parent category that has subcategories, ASK which subcategory to use.
8. For date, default to today if not specified.
9. The user may log MULTIPLE transactions at once. Process each one and confirm all together.
10. ALWAYS present a summary and ask for confirmation before executing any action.
11. When presenting a summary, use the confirm_transactions tool.
12. For deletion, search existing transactions and confirm before deleting.
13. Keep responses concise and friendly.
14. If user just chats casually, respond naturally but steer back to finance topics.`;

const tools = [
  {
    type: "function",
    function: {
      name: "confirm_transactions",
      description:
        "Present transaction summaries to user for confirmation before creating/updating/deleting. Call this when you have all required details.",
      parameters: {
        type: "object",
        properties: {
          transactions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                action: { type: "string", enum: ["add", "edit", "delete"] },
                id: { type: "string", description: "Transaction ID (for edit/delete)" },
                description: { type: "string" },
                amount: { type: "number", description: "Negative for expense, positive for income" },
                date: { type: "string", description: "YYYY-MM-DD format" },
                category_id: { type: "string" },
                category_name: { type: "string" },
                account_id: { type: "string" },
                account_name: { type: "string" },
                note: { type: "string" },
              },
              required: ["action", "description", "amount"],
            },
          },
          summary_message: { type: "string", description: "Human-readable summary to show the user" },
        },
        required: ["transactions", "summary_message"],
      },
    },
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { messages, action, transactionData } = await req.json();

    // Handle confirmed transaction execution
    if (action === "execute") {
      const results = [];
      for (const tx of transactionData) {
        if (tx.action === "add") {
          const { error } = await supabase.from("transactions").insert({
            user_id: user.id,
            description: tx.description,
            amount: tx.amount,
            date: tx.date || new Date().toISOString().split("T")[0],
            category_id: tx.category_id || null,
            account_id: tx.account_id,
            note: tx.note || "",
          });
          results.push({ description: tx.description, success: !error, error: error?.message });
        } else if (tx.action === "edit" && tx.id) {
          const update: Record<string, unknown> = {};
          if (tx.description) update.description = tx.description;
          if (tx.amount !== undefined) update.amount = tx.amount;
          if (tx.date) update.date = tx.date;
          if (tx.category_id !== undefined) update.category_id = tx.category_id || null;
          if (tx.account_id) update.account_id = tx.account_id;
          if (tx.note !== undefined) update.note = tx.note;
          const { error } = await supabase.from("transactions").update(update).eq("id", tx.id);
          results.push({ description: tx.description, success: !error, error: error?.message });
        } else if (tx.action === "delete" && tx.id) {
          const { error } = await supabase.from("transactions").delete().eq("id", tx.id);
          results.push({ description: tx.description, success: !error, error: error?.message });
        }
      }
      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch user's context data
    const [accRes, catRes, txRes] = await Promise.all([
      supabase.from("accounts").select("id, name, type, balance").order("created_at"),
      supabase.from("categories").select("id, name, parent_id, icon, color").order("created_at"),
      supabase.from("transactions").select("id, date, description, amount, category_id, account_id, note").order("date", { ascending: false }).limit(20),
    ]);

    const accounts = accRes.data || [];
    const categories = catRes.data || [];
    const recentTx = txRes.data || [];

    const mainCats = categories.filter((c) => !c.parent_id);
    const catTree = mainCats
      .map((m) => {
        const subs = categories.filter((c) => c.parent_id === m.id);
        if (subs.length) return `${m.name} (${m.id}): subcategories: ${subs.map((s) => `${s.name} (${s.id})`).join(", ")}`;
        return `${m.name} (${m.id})`;
      })
      .join("\n");

    const contextMsg = `
AVAILABLE ACCOUNTS:
${accounts.map((a) => `- ${a.name} [${a.type}] (${a.id})`).join("\n")}

AVAILABLE CATEGORIES (use subcategory ID when available):
${catTree}

RECENT TRANSACTIONS (last 20):
${recentTx.map((t) => {
  const cat = categories.find((c) => c.id === t.category_id);
  const acc = accounts.find((a) => a.id === t.account_id);
  return `- ${t.date} | ${t.description} | ${t.amount} | cat: ${cat?.name || "none"} | acc: ${acc?.name || "?"} | id: ${t.id}`;
}).join("\n")}

Today's date: ${new Date().toISOString().split("T")[0]}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiMessages = [
      { role: "system", content: SYSTEM_PROMPT + "\n\n" + contextMsg },
      ...messages,
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
        tools,
        tool_choice: "auto",
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    if (choice?.message?.tool_calls?.length) {
      const toolCall = choice.message.tool_calls[0];
      if (toolCall.function.name === "confirm_transactions") {
        const args = JSON.parse(toolCall.function.arguments);
        return new Response(
          JSON.stringify({
            type: "confirmation",
            summary: args.summary_message,
            transactions: args.transactions,
            assistantMessage: choice.message,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({
        type: "message",
        content: choice?.message?.content || "I'm not sure how to help with that.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("chat-agent error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
