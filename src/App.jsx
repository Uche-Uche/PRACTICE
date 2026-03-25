import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import RusOutput from "../RusOutput.jsx";
import { hasSupabaseEnv, supabase } from "./lib/supabase.js";

function createSupabaseStorage(client, userId) {
  let cache = null;
  let loadPromise = null;
  let flushTimer = null;

  async function ensureLoaded() {
    if (cache) return cache;
    if (loadPromise) return loadPromise;

    loadPromise = client
      .from("app_state")
      .select("data")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) throw error;
        cache = data?.data ?? {};
        return cache;
      })
      .finally(() => {
        loadPromise = null;
      });

    return loadPromise;
  }

  async function flushNow() {
    if (!cache) return;
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }

    const { error } = await client.from("app_state").upsert({
      user_id: userId,
      data: cache,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;
  }

  function scheduleFlush() {
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(() => {
      flushNow().catch(() => {});
    }, 400);
  }

  return {
    get: async key => {
      const data = await ensureLoaded();
      const value = data[key];
      return value == null ? null : { value };
    },
    set: async (key, value) => {
      const data = await ensureLoaded();
      cache = { ...data, [key]: value };
      scheduleFlush();
      return { value };
    },
    flush: flushNow,
  };
}

function Shell({ children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#080808",
        color: "#f0f0f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "'JetBrains Mono', 'Courier New', monospace",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          background: "#0a0a0a",
          border: "1px solid #1a1a1a",
          padding: 28,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function ConfigScreen() {
  return (
    <Shell>
      <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>RusOutput</div>
      <div style={{ color: "#999", lineHeight: 1.7, fontSize: 14, marginBottom: 18 }}>
        Supabase is not configured yet. Add the required Vite environment variables and redeploy.
      </div>
      <div style={{ fontSize: 13, color: "#ddd", lineHeight: 1.8 }}>
        <div>`VITE_SUPABASE_URL`</div>
        <div>`VITE_SUPABASE_ANON_KEY`</div>
      </div>
    </Shell>
  );
}

function LoginScreen({ error }) {
  async function handleGoogleSignIn() {
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (signInError) {
      console.error(signInError);
    }
  }

  return (
    <Shell>
      <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 10 }}>RusOutput</div>
      <div style={{ color: "#999", lineHeight: 1.7, fontSize: 14, marginBottom: 22 }}>
        Sign in with Google to sync your phrases, flashcards, presentation script, and practice stats.
      </div>
      <button
        onClick={handleGoogleSignIn}
        style={{
          width: "100%",
          background: "#CC2200",
          color: "#fff",
          padding: "14px 18px",
          fontSize: 14,
          letterSpacing: 0.4,
          border: "none",
          cursor: "pointer",
        }}
      >
        Continue with Google
      </button>
      {error ? (
        <div style={{ marginTop: 16, color: "#ff8f8f", fontSize: 13, lineHeight: 1.6 }}>{error}</div>
      ) : null}
    </Shell>
  );
}

function LoadingScreen({ label }) {
  return (
    <Shell>
      <div style={{ fontSize: 16, color: "#ddd" }}>{label}</div>
    </Shell>
  );
}

function DatabaseErrorScreen({ error }) {
  return (
    <Shell>
      <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Database setup needed</div>
      <div style={{ color: "#999", lineHeight: 1.7, fontSize: 14, marginBottom: 18 }}>
        The app reached Supabase, but the `app_state` table or its policies are not ready yet.
      </div>
      <div style={{ color: "#ddd", lineHeight: 1.8, fontSize: 13, marginBottom: 18 }}>
        Run the SQL in `supabase/schema.sql` inside the Supabase SQL Editor, then refresh this page.
      </div>
      {error ? <div style={{ color: "#ff8f8f", fontSize: 12 }}>{error}</div> : null}
    </Shell>
  );
}

function SignedInApp({ session }) {
  const storage = useMemo(() => createSupabaseStorage(supabase, session.user.id), [session.user.id]);
  const [dbError, setDbError] = useState("");
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function verifyDatabase() {
      const { error } = await supabase.from("app_state").select("user_id").eq("user_id", session.user.id).maybeSingle();
      if (!active) return;
      if (error) {
        setDbError(error.message);
        setDbReady(false);
      } else {
        setDbError("");
        setDbReady(true);
      }
    }

    verifyDatabase();

    return () => {
      active = false;
      storage.flush().catch(() => {});
    };
  }, [session.user.id, storage]);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return undefined;
    window.storage = storage;

    return () => {
      if (window.storage === storage) delete window.storage;
    };
  }, [storage]);

  async function handleSignOut() {
    await storage.flush().catch(() => {});
    await supabase.auth.signOut();
  }

  if (!dbReady) {
    return dbError ? <DatabaseErrorScreen error={dbError} /> : <LoadingScreen label="Connecting to your database..." />;
  }

  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          position: "fixed",
          top: 12,
          right: 12,
          zIndex: 2000,
          display: "flex",
          gap: 8,
          alignItems: "center",
          background: "rgba(8, 8, 8, 0.88)",
          border: "1px solid #1a1a1a",
          padding: "8px 10px",
          color: "#ddd",
          fontFamily: "'JetBrains Mono', 'Courier New', monospace",
          fontSize: 11,
          backdropFilter: "blur(6px)",
        }}
      >
        <span style={{ color: "#999", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {session.user.email}
        </span>
        <button
          onClick={handleSignOut}
          style={{
            background: "#CC2200",
            color: "#fff",
            border: "none",
            padding: "6px 10px",
            cursor: "pointer",
            fontSize: 11,
          }}
        >
          Sign out
        </button>
      </div>
      <RusOutput />
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return undefined;
    }

    let active = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setAuthError(error.message);
        setSession(data.session ?? null);
        setLoading(false);
      })
      .catch(error => {
        if (!active) return;
        setAuthError(error.message);
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  if (!hasSupabaseEnv) return <ConfigScreen />;
  if (loading) return <LoadingScreen label="Loading authentication..." />;
  if (!session) return <LoginScreen error={authError} />;
  return <SignedInApp session={session} />;
}
