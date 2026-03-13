"use client";

import { useState, useEffect, useRef } from "react";
import { useMQTT, authHelpers } from "../hooks/useMQTT";

// ─── STYLES ──────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0b111a;
    --card: #1a222e;
    --primary: #00d1e0;
    --text: #ffffff;
    --text-muted: #94a3b8;
    --red: #ff4d4d;
    --orange: #ffa726;
    --blue: #29b6f6;
    --green: #4ade80;
    --font-main: 'Inter', sans-serif;
  }

  body { background: var(--bg); color: var(--text); font-family: var(--font-main); min-height: 100vh; overflow-x: hidden; }

  .app-wrap { width: 100%; max-width: 450px; margin: 0 auto; min-height: 100vh; display: flex; flex-direction: column; position: relative; }

  .app-header { display: flex; align-items: center; justify-content: space-between; padding: 20px; position: sticky; top: 0; z-index: 100; background: var(--bg); }
  .user-badge { width: 42px; height: 42px; border-radius: 50%; overflow: hidden; background: #232d3d; border: 2px solid var(--primary); cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; text-transform: uppercase; color: var(--primary); }
  .user-badge img { width: 100%; height: 100%; object-fit: cover; }
  .header-status { font-size: 11px; font-weight: 700; color: var(--text-muted); display: flex; align-items: center; gap: 6px; }

  .content { flex: 1; padding: 10px 20px 110px; }

  .hazard-banner { background: rgba(255, 77, 77, 0.12); border: 1px solid var(--red); border-radius: 12px; padding: 16px; margin-bottom: 20px; animation: slideDown 0.3s ease; }
  .hazard-title { color: var(--red); font-weight: 700; font-size: 14px; margin-bottom: 4px; display: flex; align-items: center; gap: 8px; }
  .hazard-body { font-size: 13px; color: #ffb3b3; line-height: 1.4; }

  .ui-card { background: var(--card); border-radius: 24px; padding: 24px; margin-bottom: 20px; box-shadow: 0 8px 30px rgba(0,0,0,0.3); position: relative; }
  .card-label { text-align: center; color: var(--text-muted); font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-top: 15px; font-weight: 700; }
  .card-status { text-align: center; font-weight: 700; font-size: 15px; margin-top: 4px; }

  .gauge-container { display: flex; flex-direction: column; align-items: center; }

  .log-row { display: grid; grid-template-columns: 30px 1fr 1fr 1fr 40px; padding: 16px 8px; border-bottom: 1px solid rgba(255,255,255,0.05); align-items: center; font-size: 13px; transition: 0.2s; }
  .log-row.selected { background: rgba(0, 209, 224, 0.1); }
  .checkbox { width: 16px; height: 16px; border: 2px solid var(--primary); border-radius: 4px; appearance: none; cursor: pointer; }
  .checkbox:checked { background: var(--primary); }

  .primary-btn { width: 100%; background: var(--primary); color: #000; border: none; border-radius: 16px; padding: 16px; font-weight: 700; font-size: 14px; cursor: pointer; transition: 0.2s; }
  .primary-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .small-btn { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--text-muted); color: var(--text-muted); border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; }
  .danger-text { color: var(--red); border-color: rgba(255, 77, 77, 0.4); background: rgba(255, 77, 77, 0.1); }

  .styled-input, .styled-select { width: 100%; background: #131a26; border: 1.5px solid #232d3d; border-radius: 14px; padding: 14px 16px; color: #fff; font-size: 14px; outline: none; margin-top: 8px; }
  .styled-input:focus { border-color: var(--primary); }
  input[type=range] { width: 100%; accent-color: var(--primary); margin: 15px 0; cursor: pointer; }

  .show-hide-btn { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 4px; transition: 0.2s; }
  .show-hide-btn:hover { color: var(--primary); }

  .bottom-nav { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 450px; background: #0f1724; display: flex; padding: 12px 0 28px; border-top: 1px solid #1c2533; z-index: 100; }
  .nav-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px; cursor: pointer; color: var(--text-muted); }
  .nav-item.active { color: var(--primary); }
  .nav-label { font-size: 11px; font-weight: 600; }

  .toggle-wrap { display: flex; justify-content: space-between; align-items: center; margin-top: 15px; }
  .switch { position: relative; display: inline-block; width: 44px; height: 24px; }
  .switch input { opacity: 0; width: 0; height: 0; }
  .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #232d3d; transition: .4s; border-radius: 24px; }
  .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
  input:checked + .slider { background-color: var(--primary); }
  input:checked + .slider:before { transform: translateX(20px); }

  .auth-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 16px; }
  .spinner { width: 36px; height: 36px; border: 3px solid #232d3d; border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; }

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes slideDown { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  .fade-in { animation: fadeIn 0.4s ease forwards; }

  .legend { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 20px; font-weight: 600; }
  .legend-item { display: flex; align-items: center; gap: 6px; }
  .legend-dot { width: 10px; height: 10px; border-radius: 50%; }
`;

// ─── SVG ICONS ───
const Icons = {
  Warning: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  Monitor: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
    </svg>
  ),
  History: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
  ),
  Settings: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06-.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  Trash: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>
  ),
  Refresh: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
  ),
  Eye: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  EyeOff: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ),
};

// ─── HELPERS ───
function getInitials(user) {
  if (!user) return "--";
  const source = user.name || user.email || "?";
  const parts = source.trim().split(/\s+/);
  
  // ✅ IMPROVED: First letter of each name if two, otherwise just one
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source.slice(0, 1).toUpperCase();
}

function getStatus(val, type, threshold = 100) {
  if (type === "aqi") {
    if (val < threshold / 2) return { label: "Good", color: "var(--green)" };
    if (val < threshold) return { label: "Moderate", color: "var(--orange)" };
    return { label: "Poor", color: "var(--red)" };
  }
  if (type === "temp") {
    if (val < 20) return { label: "Cold", color: "var(--blue)" };
    if (val <= 30) return { label: "Average", color: "var(--green)" };
    return { label: "Hot", color: "var(--red)" };
  }
  if (type === "humidity") {
    if (val < 30) return { label: "Dry", color: "var(--orange)" };
    if (val <= 60) return { label: "Comfortable", color: "var(--green)" };
    return { label: "Humid", color: "var(--blue)" };
  }
}

function formatTime(d) {
  return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function playSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const gain = ctx.createGain();
    gain.gain.value = 0.2;
    const osc = ctx.createOscillator();
    osc.type = type === "Warning" ? "sawtooth" : "square";
    osc.frequency.value = type === "Warning" ? 300 : 600;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {}
}

// ─── CIRCULAR GAUGE ───
function CircularGauge({ value, unit, label, type, threshold = 100 }) {
  const status = getStatus(value, type, threshold);
  const radius = 60;
  const circ = 2 * Math.PI * radius;
  const pct = Math.min(value, 600) / 600;
  const offset = circ - pct * circ;

  return (
    <div className="ui-card">
      <div className="gauge-container">
        <svg width="150" height="150" viewBox="0 0 150 150">
          <circle cx="75" cy="75" r={radius} fill="none" stroke="#232d3d" strokeWidth="12" />
          <circle
            cx="75" cy="75" r={radius} fill="none" stroke={status.color} strokeWidth="12"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            transform="rotate(-90 75 75)"
            style={{ transition: "0.8s cubic-bezier(0.4, 0, 0.2, 1)" }}
          />
          <text x="75" y="72" textAnchor="middle" fill="#fff" fontSize="30" fontWeight="800" fontFamily="Inter">
            {value}
            <tspan fontSize="12" fill="var(--text-muted)" fontWeight="500"> {unit}</tspan>
          </text>
        </svg>
      </div>
      <div className="card-label">{label}</div>
      <div className="card-status" style={{ color: status.color }}>{status.label}</div>
    </div>
  );
}

// ─── MULTI-LINE CHART ───
function MultiLineChart({ data }) {
  if (!data || data.length < 2) {
    return (
      <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--text-muted)" }}>
        WAITING FOR SENSOR DATA...
      </div>
    );
  }

  const W = 350, H = 140, PL = 25, PR = 10, PT = 10, PB = 10;
  const recent = data.slice(-20);
  const aqis = recent.map((d) => d.aqi);
  const temps = recent.map((d) => d.temp);
  const hums = recent.map((d) => d.humidity);
  const maxVal = Math.max(...aqis, ...temps, ...hums, 100);

  const xScale = (i) => PL + (i / (recent.length - 1)) * (W - PL - PR);
  const yScale = (v) => (H - PB) - (v / maxVal) * (H - PT - PB);

  const path = (arr) => arr.map((v, i) => `${i === 0 ? "M" : "L"} ${xScale(i)},${yScale(v)}`).join(" ");

  return (
    <div>
      <div className="legend">
        <div className="legend-item"><div className="legend-dot" style={{ background: "var(--primary)" }} /> AQI: {aqis[aqis.length - 1]}</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: "var(--red)" }} /> Temp: {temps[temps.length - 1]}°</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: "var(--blue)" }} /> Hum: {hums[hums.length - 1]}%</div>
      </div>
      <div style={{ width: "100%", height: H }}>
        <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          <text x={PL - 5} y={yScale(maxVal)} fill="var(--text-muted)" fontSize="10" textAnchor="end" dominantBaseline="middle">{Math.round(maxVal)}</text>
          <text x={PL - 5} y={yScale(maxVal / 2)} fill="var(--text-muted)" fontSize="10" textAnchor="end" dominantBaseline="middle">{Math.round(maxVal / 2)}</text>
          <text x={PL - 5} y={yScale(0)} fill="var(--text-muted)" fontSize="10" textAnchor="end" dominantBaseline="middle">0</text>
          <line x1={PL} y1={yScale(maxVal / 2)} x2={W - PR} y2={yScale(maxVal / 2)} stroke="#232d3d" strokeDasharray="4 4" />
          <line x1={PL} y1={H - PB} x2={W - PR} y2={H - PB} stroke="#232d3d" />
          <path d={path(hums)} fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }} />
          <path d={path(temps)} fill="none" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }} />
          <path d={path(aqis)} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

// ─── AUTH SCREEN ───
function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const handleAuth = async () => {
    setError("");

    if (!email.trim() || !pass.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    if (!isLogin && pass !== confirmPass) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    let res;
    if (isLogin) {
      res = await authHelpers.signIn(email.trim(), pass);
    } else {
      res = await authHelpers.signUp(email.trim(), pass, username.trim());
      if (res && !res.error) {
        res = await authHelpers.signIn(email.trim(), pass);
      }
    }

    setLoading(false);

    if (res?.error) {
      setError(res.error.message);
    }
  };

  return (
    <div className="app-wrap" style={{ justifyContent: "center", padding: 20 }}>
      <div className="ui-card fade-in" style={{ padding: 30 }}>
        <h1 style={{ color: "var(--primary)", marginBottom: 5, fontSize: 20, textAlign: "center" }}>AIR MONITOR</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 25, textAlign: "center" }}>
          {isLogin ? "Secure Terminal Access" : "Register New Operative"}
        </p>

        {error && (
          <div style={{ color: "var(--red)", fontSize: 12, marginBottom: 15, textAlign: "center", background: "rgba(255,0,0,0.1)", padding: 10, borderRadius: 8 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {!isLogin && (
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 5, fontWeight: 600 }}>Username</div>
              <input className="styled-input" type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Operative Name" style={{ marginTop: 0 }} />
            </div>
          )}

          <div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 5, fontWeight: 600 }}>Email Address</div>
            <input className="styled-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@system.com" style={{ marginTop: 0 }} />
          </div>

          <div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 5, fontWeight: 600 }}>Passcode</div>
            <div style={{ position: "relative" }}>
              <input
                className="styled-input"
                style={{ marginTop: 0, paddingRight: 40 }}
                type={showPass ? "text" : "password"}
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAuth()}
                placeholder="••••••••"
              />
              <button type="button" className="show-hide-btn" onClick={() => setShowPass(!showPass)}>
                {showPass ? <Icons.EyeOff /> : <Icons.Eye />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 5, fontWeight: 600 }}>Confirm Passcode</div>
              <div style={{ position: "relative" }}>
                <input
                  className="styled-input"
                  style={{ marginTop: 0, paddingRight: 40 }}
                  type={showConfirmPass ? "text" : "password"}
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAuth()}
                  placeholder="••••••••"
                />
                <button type="button" className="show-hide-btn" onClick={() => setShowConfirmPass(!showConfirmPass)}>
                  {showConfirmPass ? <Icons.EyeOff /> : <Icons.Eye />}
                </button>
              </div>
            </div>
          )}
        </div>

        <button className="primary-btn" onClick={handleAuth} disabled={loading}>
          {loading ? "PROCESSING..." : isLogin ? "INITIALIZE SESSION" : "CREATE PROFILE"}
        </button>

        <p style={{ marginTop: 20, fontSize: 12, color: "var(--text-muted)", textAlign: "center" }}>
          {isLogin ? "New User? " : "Already Registered? "}
          <span
            style={{ color: "var(--primary)", fontWeight: 700, cursor: "pointer" }}
            onClick={() => { setIsLogin(!isLogin); setError(""); }}
          >
            {isLogin ? "Create Profile" : "Login Here"}
          </span>
        </p>
      </div>
    </div>
  );
}

// ─── MAIN APP ───
export default function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [tab, setTab] = useState("monitor");
  const [avatar, setAvatar] = useState(null);

  const [alarmType, setAlarmType] = useState("Emergency");
  const [aqiThreshold, setAqiThreshold] = useState(340);
  const [isSilent, setIsSilent] = useState(false);

  const [isDataFlowing, setIsDataFlowing] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState(new Set());
  const [hiddenLogs, setHiddenLogs] = useState(new Set());

  const pressTimer = useRef(null);
  const watchdog = useRef(null);

  const { latest, chartData, logs, espConnected, lastSync, refreshReadings, removeLogsFromAccount } = useMQTT(user);

  useEffect(() => {
    const handleUserSetup = (supabaseUser) => {
      if (!supabaseUser) {
        setUser(null);
        setAvatar(null);
        setAuthReady(true);
        return;
      }

      const name =
        supabaseUser.user_metadata?.full_name ||
        supabaseUser.user_metadata?.username ||
        supabaseUser.email?.split("@")[0] ||
        "User";

      const profilePic =
        supabaseUser.user_metadata?.avatar_url ||
        localStorage.getItem("user_avatar_" + supabaseUser.id);

      setUser({ id: supabaseUser.id, name, email: supabaseUser.email });
      setAvatar(profilePic || null);
      setAuthReady(true);

      const savedThreshold = localStorage.getItem("aqi_threshold");
      if (savedThreshold) setAqiThreshold(Number(savedThreshold));
      setIsSilent(localStorage.getItem("is_silent") === "true");
      const savedAlarm = localStorage.getItem("alarm_type");
      if (savedAlarm) setAlarmType(savedAlarm);
    };

    authHelpers.getSession().then(({ data }) => {
      handleUserSetup(data?.session?.user || null);
    });

    const { data: listenerData } = authHelpers.onAuthChange(handleUserSetup);

    return () => {
      listenerData?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (latest?.timestamp) {
      setIsDataFlowing(true);
      if (watchdog.current) clearTimeout(watchdog.current);
      watchdog.current = setTimeout(() => setIsDataFlowing(false), 15000);
    }
  }, [latest]);

  useEffect(() => {
    if (latest?.aqi >= aqiThreshold && !isSilent) {
      playSound(alarmType);
    }
  }, [latest?.timestamp, aqiThreshold, isSilent, alarmType]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAvatar(ev.target.result);
      localStorage.setItem("user_avatar_" + user.id, ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setAvatar(null);
    localStorage.removeItem("user_avatar_" + user.id);
  };

  const handleLogout = async () => {
    await authHelpers.signOut();
    setHiddenLogs(new Set());
    setSelectedLogs(new Set());
    setTab("monitor");
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "WARNING: Are you sure you want to permanently disable your account?\n\nThis action will FREEZE your email. You will NEVER be able to log in or register a new account with this email address again.\n\nProceed with disable?"
    );
    if (confirmed) {
      if (authHelpers.deleteAccount) await authHelpers.deleteAccount();
      localStorage.clear();
      setHiddenLogs(new Set());
      setSelectedLogs(new Set());
      setTab("monitor");
    }
  };

  const toggleSelection = (id) => {
    const s = new Set(selectedLogs);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedLogs(s);
  };

  const handlePressStart = (id) => {
    pressTimer.current = setTimeout(() => {
      setIsSelecting(true);
      toggleSelection(id);
    }, 500);
  };

  const handleDeleteAllLogs = () => {
    const allIds = logs.map((l) => l.id);
    setHiddenLogs(new Set([...hiddenLogs, ...allIds]));
    setSelectedLogs(new Set());
    setIsSelecting(false);
    if (removeLogsFromAccount) removeLogsFromAccount(allIds);
  };

  const downloadCSV = () => {
    const visible = logs.filter((l) => !hiddenLogs.has(l.id));
    if (!visible.length) return;
    const headers = ["Date", "Time", "AQI (PPM)", "Temperature (C)", "Humidity (%)"];
    const rows = visible.map((log) => {
      const d = new Date(log.timestamp);
      return `${d.toLocaleDateString()},${d.toLocaleTimeString()},${log.aqi},${log.temp},${log.humidity}`;
    });
    const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "air_quality_logs.csv" });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (!authReady) {
    return (
      <>
        <style>{styles}</style>
        <div className="app-wrap">
          <div className="auth-loading">
            <div className="spinner" />
            <span style={{ color: "var(--text-muted)", fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
              INITIALIZING...
            </span>
          </div>
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <style>{styles}</style>
        <AuthScreen />
      </>
    );
  }

  const isHazard = latest?.aqi >= aqiThreshold;
  const isActuallyOnline = espConnected && isDataFlowing;

  return (
    <>
      <style>{styles}</style>
      <div className="app-wrap">
        <header className="app-header">
          <div className="user-badge" onClick={() => setTab("settings")}>
            {avatar ? <img src={avatar} alt="Profile" /> : <span>{getInitials(user)}</span>}
          </div>
          <div className="header-status">
            <span>{isActuallyOnline ? "CONNECTED" : "DISCONNECTED"}</span>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: isActuallyOnline ? "var(--green)" : "var(--red)" }} />
          </div>
        </header>

        <div className="content">
          {tab === "monitor" && (
            <div className="fade-in">
              {isHazard && (
                <div className="hazard-banner">
                  <div className="hazard-title"><Icons.Warning /> HAZARD WARNING: POOR AIR QUALITY</div>
                  <div className="hazard-body">
                    Current Level: {latest.aqi} PPM (Threshold: {aqiThreshold} PPM)<br />
                    Current Temp: {latest.temp}°C
                  </div>
                </div>
              )}
              <CircularGauge value={latest?.aqi || 0} unit="PPM" label="AIR QUALITY" type="aqi" threshold={aqiThreshold} />
              <CircularGauge value={latest?.temp || 0} unit="°C" label="TEMPERATURE" type="temp" />
              <CircularGauge value={latest?.humidity || 0} unit="%" label="HUMIDITY" type="humidity" />
              <div className="ui-card">
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)", marginBottom: 15 }}>REAL-TIME ANALYSIS</div>
                <MultiLineChart data={chartData} />
                <div style={{ textAlign: "center", fontSize: 11, color: "var(--text-muted)", marginTop: 15 }}>
                  LAST SYNC: {lastSync ? formatTime(lastSync) : "--:--:--"}
                </div>
              </div>
            </div>
          )}

          {tab === "history" && (
            <div className="fade-in">
              <div className="ui-card" style={{ padding: 0, overflow: "hidden", paddingBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: 20, alignItems: "center" }}>
                  <h3 style={{ fontSize: 16 }}>Recent Logs</h3>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={handleDeleteAllLogs} className="small-btn danger-text"><Icons.Trash /> ALL</button>
                    <button onClick={refreshReadings} className="small-btn"><Icons.Refresh /> REF</button>
                  </div>
                </div>
                <div className="log-row" style={{ background: "#131a26", color: "var(--text-muted)", fontSize: 11, fontWeight: 800 }}>
                  <span /><span>TIME</span><span>AQI</span><span>TMP</span><span />
                </div>
                {logs.filter((l) => l.id && !hiddenLogs.has(l.id)).slice(0, 15).map((log) => (
                  <div
                    key={log.id}
                    className={`log-row ${selectedLogs.has(log.id) ? "selected" : ""}`}
                    onMouseDown={() => handlePressStart(log.id)}
                    onMouseUp={() => clearTimeout(pressTimer.current)}
                    onTouchStart={() => handlePressStart(log.id)}
                    onTouchEnd={() => clearTimeout(pressTimer.current)}
                    onClick={() => isSelecting && toggleSelection(log.id)}
                  >
                    <div>{isSelecting && <input type="checkbox" checked={selectedLogs.has(log.id)} className="checkbox" readOnly />}</div>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{formatTime(log.timestamp)}</span>
                    <span style={{ fontWeight: 700, color: log.aqi >= aqiThreshold ? "var(--red)" : "var(--text)" }}>{log.aqi}</span>
                    <span>{log.temp}°</span>
                    <span
                      style={{ cursor: "pointer", color: "var(--text-muted)" }}
                      onClick={() => {
                        setHiddenLogs(new Set([...hiddenLogs, log.id]));
                        if (removeLogsFromAccount) removeLogsFromAccount([log.id]);
                      }}
                    >
                      <Icons.Trash />
                    </span>
                  </div>
                ))}
                <div style={{ padding: "0 20px", marginTop: 20 }}>
                  <button
                    className="primary-btn"
                    onClick={downloadCSV}
                    style={{ background: "var(--card)", border: "1px solid var(--primary)", color: "var(--primary)" }}
                  >
                    DOWNLOAD LOGS (CSV)
                  </button>
                </div>
              </div>
              {isSelecting && (
                <button
                  className="primary-btn"
                  style={{ marginTop: 15, background: "var(--red)" }}
                  onClick={() => {
                    setHiddenLogs(new Set([...hiddenLogs, ...selectedLogs]));
                    if (removeLogsFromAccount) removeLogsFromAccount(Array.from(selectedLogs));
                    setIsSelecting(false);
                    setSelectedLogs(new Set());
                  }}
                >
                  DELETE SELECTED ({selectedLogs.size})
                </button>
              )}
            </div>
          )}

          {tab === "settings" && (
            <div className="fade-in">
              <div className="ui-card" style={{ textAlign: "center" }}>
                <div style={{ width: 90, height: 90, borderRadius: "50%", border: "3px solid var(--primary)", margin: "0 auto 15px", overflow: "hidden", background: "#131a26", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {avatar ? (
                    <img src={avatar} style={{ width: "100%" }} alt="Avatar" />
                  ) : (
                    <span style={{ fontSize: 24, fontWeight: "bold", textTransform: "uppercase", color: "var(--primary)" }}>
                      {getInitials(user)}
                    </span>
                  )}
                </div>
                <h2 style={{ fontSize: 18, marginBottom: 4 }}>{user.name}</h2>
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{user.email}</p>
                <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 15 }}>
                  <input type="file" onChange={handleImageUpload} style={{ display: "none" }} id="up" accept="image/*" />
                  <label htmlFor="up" className="small-btn" style={{ margin: 0, color: "var(--primary)", borderColor: "var(--primary)", cursor: "pointer" }}>NEW PHOTO</label>
                  {avatar && <button onClick={handleRemoveImage} className="small-btn danger-text" style={{ margin: 0 }}><Icons.Trash /></button>}
                </div>
              </div>

              <div className="ui-card">
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 15 }}>Sound & Notifications</div>
                <div className="toggle-wrap">
                  <span style={{ fontSize: 13 }}>Silent Mode</span>
                  <label className="switch">
                    <input type="checkbox" checked={isSilent} onChange={(e) => { setIsSilent(e.target.checked); localStorage.setItem("is_silent", e.target.checked); }} />
                    <span className="slider" />
                  </label>
                </div>
                <div style={{ marginTop: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Alarm Tone Type</span>
                    <button onClick={() => playSound(alarmType)} className="small-btn">TEST AUDIO</button>
                  </div>
                  <select className="styled-select" value={alarmType} onChange={(e) => { setAlarmType(e.target.value); localStorage.setItem("alarm_type", e.target.value); }}>
                    <option value="Emergency">Emergency Beep</option>
                    <option value="Warning">Warning Chime</option>
                  </select>
                </div>
              </div>

              <div className="ui-card">
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Calibration</div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-muted)" }}>
                  <span>Poor Air Threshold (PPM)</span>
                  <span style={{ color: "var(--primary)", fontWeight: 800 }}>{aqiThreshold}</span>
                </div>
                <input type="range" min="100" max="600" value={aqiThreshold} onChange={(e) => { setAqiThreshold(Number(e.target.value)); localStorage.setItem("aqi_threshold", e.target.value); }} />
                <div style={{ background: "#131a26", padding: 14, borderRadius: 12, marginTop: 10, display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span>Current Sensor Reading:</span>
                  <span style={{ color: isHazard ? "var(--red)" : "var(--green)", fontWeight: 800 }}>{latest?.aqi || 0} PPM</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button className="primary-btn" style={{ background: "rgba(255,77,77,0.1)", color: "var(--red)", border: "1px solid var(--red)" }} onClick={handleLogout}>
                  LOG OUT
                </button>
                <button className="primary-btn" style={{ background: "var(--red)", color: "#fff", width: "auto", padding: "16px 20px" }} onClick={handleDeleteAccount}>
                  <Icons.Trash />
                </button>
              </div>
            </div>
          )}
        </div>

        <nav className="bottom-nav">
          <div className={`nav-item ${tab === "monitor" ? "active" : ""}`} onClick={() => setTab("monitor")}>
            <Icons.Monitor /><span className="nav-label">Monitor</span>
          </div>
          <div className={`nav-item ${tab === "history" ? "active" : ""}`} onClick={() => setTab("history")}>
            <Icons.History /><span className="nav-label">History</span>
          </div>
          <div className={`nav-item ${tab === "settings" ? "active" : ""}`} onClick={() => setTab("settings")}>
            <Icons.Settings /><span className="nav-label">Settings</span>
          </div>
        </nav>
      </div>
    </>
  );
}