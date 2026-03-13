"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import mqtt from "mqtt";
import { createClient } from "@supabase/supabase-js";

/* ─────────────────────────────────────────────
   SUPABASE INIT
───────────────────────────────────────────── */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/* ─────────────────────────────────────────────
   INACTIVITY AUTO-LOGOUT
───────────────────────────────────────────── */
export function useInactivityLogout(onTimeout, timeoutMs = 15 * 60 * 1000) {
  const timerRef = useRef(null);
  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(onTimeout, timeoutMs);
  }, [onTimeout, timeoutMs]);

  useEffect(() => {
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [reset]);
}

/* ─────────────────────────────────────────────
   AUTH HELPERS
───────────────────────────────────────────── */
export const authHelpers = {
  getSession: () => supabase.auth.getSession(),

  // FIX: Only fire on meaningful auth events — not TOKEN_REFRESHED spam
  onAuthChange: (callback) =>
    supabase.auth.onAuthStateChange((event, session) => {
      if (
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "INITIAL_SESSION" ||
        event === "USER_UPDATED"
      ) {
        callback(session?.user || null);
      }
    }),

  signUp: (email, password, username) =>
    supabase.auth.signUp({
      email,
      password,
      options: { data: { username, account_deleted: false } },
    }),

  signIn: async (email, password) => {
    const res = await supabase.auth.signInWithPassword({ email, password });
    if (res.data?.user?.user_metadata?.account_deleted) {
      await supabase.auth.signOut();
      return { error: { message: "This account has been disabled." } };
    }
    return res;
  },

  // FIX: Removed problematic access_type/prompt queryParams + clean redirectTo
  signInWithGoogle: async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/`
            : undefined,
      },
    });
    return { error };
  },

  signOut: () => supabase.auth.signOut(),

  deleteAccount: async () => {
    await supabase.auth.updateUser({ data: { account_deleted: true } });
    return supabase.auth.signOut();
  },
};

/* ─────────────────────────────────────────────
   MQTT HOOK
───────────────────────────────────────────── */
export function useMQTT(user) {
  const [latest, setLatest] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [logs, setLogs] = useState([]);
  const [espConnected, setEspConnected] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  const clientRef = useRef(null);
  const loadedUserIdRef = useRef(null);

  const resetState = useCallback(() => {
    setLatest(null);
    setChartData([]);
    setLogs([]);
    setEspConnected(false);
    setLastSync(null);
    loadedUserIdRef.current = null;
  }, []);

  const refreshReadings = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("sensor_readings")
      .select("*")
      .eq("user_id", user.id)
      .order("recorded_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      if (loadedUserIdRef.current !== user.id) return;

      const formatted = data.map((d) => ({
        id: d.id,
        aqi: d.aqi,
        temp: d.temperature,
        humidity: d.humidity,
        timestamp: new Date(d.recorded_at),
      }));

      setLogs(formatted);
      setChartData(formatted.slice(0, 10).reverse());
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      resetState();
      return;
    }

    loadedUserIdRef.current = user.id;
    refreshReadings();

    const client = mqtt.connect(process.env.NEXT_PUBLIC_MQTT_URL, {
      clientId: `web_${Math.random().toString(16).slice(2, 10)}`,
      username: process.env.NEXT_PUBLIC_MQTT_USER,
      password: process.env.NEXT_PUBLIC_MQTT_PASSWORD,
      protocol: "wss",
      path: "/mqtt",
      reconnectPeriod: 2000,
      clean: true,
    });

    clientRef.current = client;

    client.on("connect", () => {
      setEspConnected(true);
      client.subscribe("env/telemetry");
    });

    client.on("message", async (topic, message) => {
      if (topic !== "env/telemetry" || loadedUserIdRef.current !== user.id) return;

      try {
        const payload = JSON.parse(message.toString());
        const now = new Date();

        const { data, error } = await supabase
          .from("sensor_readings")
          .insert([
            {
              user_id: user.id,
              temperature: payload.temp,
              humidity: payload.humidity,
              aqi: payload.aqi,
              recorded_at: now.toISOString(),
              device_id: "esp32-01",
            },
          ])
          .select();

        if (error || !data?.[0]) return;

        const newEntry = {
          id: data[0].id,
          aqi: payload.aqi,
          temp: payload.temp,
          humidity: payload.humidity,
          timestamp: now,
        };

        setLatest(newEntry);
        setLastSync(now);
        setChartData((prev) => [...prev.slice(-9), newEntry]);
        setLogs((prev) => [newEntry, ...prev.slice(0, 19)]);
      } catch (err) {
        console.error("MQTT Processing Error:", err);
      }
    });

    client.on("error", () => setEspConnected(false));
    client.on("offline", () => setEspConnected(false));
    client.on("reconnect", () => setEspConnected(false));

    return () => {
      if (clientRef.current) clientRef.current.end(true);
    };
  }, [user?.id, refreshReadings, resetState]);

  const removeLogsFromAccount = async (logIds) => {
    if (!user || !logIds?.length) return;

    const { error } = await supabase
      .from("sensor_readings")
      .delete()
      .eq("user_id", user.id)
      .in("id", logIds);

    if (!error) {
      setLogs((prev) => prev.filter((log) => !logIds.includes(log.id)));
      setChartData((prev) => prev.filter((log) => !logIds.includes(log.id)));
    }
  };

  return {
    latest,
    chartData,
    logs,
    espConnected,
    lastSync,
    refreshReadings,
    removeLogsFromAccount,
    resetState,
  };
}