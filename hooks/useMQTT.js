"use client";

import { useState, useEffect, useCallback } from "react";
import mqtt from "mqtt";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export const authHelpers = {
  getSession: () => supabase.auth.getSession(),
  onAuthChange: (callback) => supabase.auth.onAuthStateChange((event, session) => callback(session?.user || null)),
  signUp: async (email, password, username) => {
    return await supabase.auth.signUp({ 
      email, 
      password, 
      options: { data: { username } } 
    });
  },
  signIn: async (email, password) => await supabase.auth.signInWithPassword({ email, password }),
  signOut: () => supabase.auth.signOut()
};

export function useMQTT(user) {
  const [latest, setLatest] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [logs, setLogs] = useState([]);
  const [espConnected, setEspConnected] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  const refreshReadings = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("telemetry") 
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
      
    if (data && !error) {
       const formattedData = data.map(d => ({...d, timestamp: new Date(d.created_at)}));
       setLogs(formattedData);
       setChartData(formattedData.slice(0, 10).reverse());
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    refreshReadings();

    const clientId = `web_${Math.random().toString(16).slice(3)}`;
    const client = mqtt.connect(process.env.NEXT_PUBLIC_MQTT_URL, {
      clientId,
      username: process.env.NEXT_PUBLIC_MQTT_USER,
      password: process.env.NEXT_PUBLIC_MQTT_PASSWORD,
    });

    client.on("connect", () => {
      setEspConnected(true);
      client.subscribe("env/telemetry");
    });

    client.on("message", async (topic, message) => {
      if (topic === "env/telemetry") {
        try {
          const payload = JSON.parse(message.toString());
          const now = new Date();
          payload.timestamp = now; 
          
          setLatest(payload);
          setLastSync(now);
          setChartData(prev => [...prev.slice(-9), payload]);
          setLogs(prev => [payload, ...prev.slice(0, 19)]);
          
          await supabase.from("telemetry").insert([{
             temp: payload.temp,
             humidity: payload.humidity,
             aqi: payload.aqi
          }]);
        } catch (e) {}
      }
    });

    client.on("offline", () => setEspConnected(false));

    return () => client.end();
  }, [user, refreshReadings]);

  return { latest, chartData, logs, espConnected, lastSync, refreshReadings };
}
