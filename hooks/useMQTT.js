"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import mqtt from "mqtt";
import { createClient } from "@supabase/supabase-js";

/* ─────────────────────────────────────────────
   SUPABASE INIT
───────────────────────────────────────────── */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/* ─────────────────────────────────────────────
   AUTH HELPERS
───────────────────────────────────────────── */

export const authHelpers = {
  getSession: () => supabase.auth.getSession(),

  onAuthChange: (callback) =>
    supabase.auth.onAuthStateChange((_, session) =>
      callback(session?.user || null)
    ),

  signUp: (email, password, username) =>
    supabase.auth.signUp({
      email,
      password,
      options: { data: { username, account_deleted: false } },
    }),

  signIn: async (email, password) => {
    const res = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (res.data?.user?.user_metadata?.account_deleted) {
      await supabase.auth.signOut();
      return {
        error: {
          message:
            "This account has been disabled. Please register a new account with a different email.",
        },
      };
    }

    return res;
  },

  signOut: () => supabase.auth.signOut(),

  deleteAccount: async () => {
    await supabase.auth.updateUser({
      data: { account_deleted: true },
    });
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

  /* ─────────────────────────────────────────────
     FETCH EXISTING READINGS
  ───────────────────────────────────────────── */

  const refreshReadings = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("telemetry")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      const formatted = data.map((d) => ({
        ...d,
        timestamp: new Date(d.created_at),
      }));

      setLogs(formatted);
      setChartData(formatted.slice(0, 10).reverse());
    } else {
      console.error("Supabase fetch error:", error);
    }
  }, [user]);

  /* ─────────────────────────────────────────────
     MQTT CONNECTION
  ───────────────────────────────────────────── */

  useEffect(() => {
    if (!user) return;

    refreshReadings();

    if (
      !process.env.NEXT_PUBLIC_MQTT_URL ||
      !process.env.NEXT_PUBLIC_MQTT_USER ||
      !process.env.NEXT_PUBLIC_MQTT_PASSWORD
    ) {
      console.error("Missing MQTT environment variables");
      return;
    }

    const clientId = `web_${Math.random().toString(16).slice(2, 10)}`;

    const client = mqtt.connect(process.env.NEXT_PUBLIC_MQTT_URL, {
      clientId,
      username: process.env.NEXT_PUBLIC_MQTT_USER,
      password: process.env.NEXT_PUBLIC_MQTT_PASSWORD,
      protocol: "wss",
      path: "/mqtt",
      reconnectPeriod: 2000,
      connectTimeout: 30 * 1000,
      clean: true,
    });

    clientRef.current = client;

    client.on("connect", () => {
      console.log("✅ MQTT Connected");
      setEspConnected(true);

      client.subscribe("env/telemetry", (err) => {
        if (err) {
          console.error("Subscription error:", err);
        } else {
          console.log("📡 Subscribed to env/telemetry");
        }
      });
    });

    client.on("message", async (topic, message) => {
      if (topic !== "env/telemetry") return;

      try {
        const payload = JSON.parse(message.toString());
        const now = new Date();

        const newEntry = {
          ...payload,
          timestamp: now,
          id: `${now.getTime()}_${Math.random()}`,
        };

        setLatest(newEntry);
        setLastSync(now);
        setChartData((prev) => [...prev.slice(-9), newEntry]);
        setLogs((prev) => [newEntry, ...prev.slice(0, 19)]);

        await supabase.from("telemetry").insert([
          {
            user_id: user.id,
            temp: payload.temp,
            humidity: payload.humidity,
            aqi: payload.aqi,
            created_at: now.toISOString(),
          },
        ]);
      } catch (err) {
        console.error("Message parse error:", err);
      }
    });

    client.on("error", (err) => {
      console.error("MQTT Error:", err.message);
      setEspConnected(false);
    });

    client.on("offline", () => {
      console.warn("MQTT Offline");
      setEspConnected(false);
    });

    client.on("reconnect", () => {
      console.log("MQTT Reconnecting...");
    });

    return () => {
      if (clientRef.current) {
        clientRef.current.end(true);
        console.log("MQTT Connection Closed");
      }
    };
  }, [user, refreshReadings]);

  /* ─────────────────────────────────────────────
     SOFT DELETE LOGS
  ───────────────────────────────────────────── */

  const removeLogsFromAccount = async (logIds) => {
    if (!user || !logIds?.length) return;

    await supabase
      .from("telemetry")
      .update({ user_id: null })
      .eq("user_id", user.id)
      .in("id", logIds);
  };

  return {
    latest,
    chartData,
    logs,
    espConnected,
    lastSync,
    refreshReadings,
    removeLogsFromAccount,
  };
}
