import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "owner" | "admin" | "member";

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  created_at: string;
}

export interface TeamMember {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: UserProfile | null;
  role: UserRole | null;
  isOwner: boolean;
  isAdmin: boolean;
  canWrite: boolean;
  canDelete: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

const ROLE_CACHE_KEY = "finops_user_role";
const PROFILE_CACHE_KEY = "finops_user_profile";

function getCachedProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setCachedProfile(p: UserProfile | null) {
  try {
    if (p) {
      localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(p));
      localStorage.setItem(ROLE_CACHE_KEY, p.role);
    } else {
      localStorage.removeItem(PROFILE_CACHE_KEY);
      localStorage.removeItem(ROLE_CACHE_KEY);
    }
  } catch {}
}

/** Fetch the current user's profile from the team API */
async function fetchMyProfile(accessToken: string): Promise<UserProfile | null> {
  try {
    const res = await fetch("/api/team/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Seed from cache immediately — prevents "no role" flash on load/tab focus
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(getCachedProfile);

  // Track the last user ID we fetched a profile for — skip re-fetch if same user
  const lastFetchedUserId = useRef<string | null>(null);
  // Track in-flight fetch to avoid duplicate concurrent requests
  const fetchingRef = useRef(false);

  const doFetchProfile = useCallback(async (accessToken: string, userId: string) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const p = await fetchMyProfile(accessToken);
      if (p) {
        setCachedProfile(p);
        setProfile(p);
        lastFetchedUserId.current = userId;
      }
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (currentSession?.access_token) {
      // Force re-fetch by resetting the tracker
      lastFetchedUserId.current = null;
      await doFetchProfile(currentSession.access_token, currentSession.user.id);
    } else {
      setCachedProfile(null);
      setProfile(null);
    }
  }, [doFetchProfile]);

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.access_token && session.user) {
        // Always fetch on initial load (cold start)
        await doFetchProfile(session.access_token, session.user.id);
      } else if (!session) {
        setCachedProfile(null);
        setProfile(null);
      }
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.access_token && session.user) {
        // Only re-fetch profile if:
        // 1. It's a sign-in event (new user or different user)
        // 2. We don't have a profile yet
        // Skip for TOKEN_REFRESHED / tab focus events where user ID is the same
        const isNewUser = lastFetchedUserId.current !== session.user.id;
        const isSignIn = event === "SIGNED_IN" || event === "USER_UPDATED";
        const noProfile = !profile;

        if (isNewUser || isSignIn || noProfile) {
          await doFetchProfile(session.access_token, session.user.id);
        }
        // For TOKEN_REFRESHED on same user: keep existing profile from state/cache
      } else if (event === "SIGNED_OUT") {
        setCachedProfile(null);
        setProfile(null);
        lastFetchedUserId.current = null;
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setCachedProfile(null);
    setProfile(null);
    lastFetchedUserId.current = null;
  };

  const role = profile?.role ?? null;
  const isOwner = role === "owner";
  const isAdmin = role === "admin";
  const canWrite = isOwner || isAdmin;
  const canDelete = isOwner;

  return (
    <AuthContext.Provider value={{
      user, session, loading, profile, role,
      isOwner, isAdmin, canWrite, canDelete,
      signIn, signOut, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
