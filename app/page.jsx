"use client";

import { useState, useEffect, useRef } from "react";
import { useMQTT, authHelpers } from "../hooks/useMQTT";

// ─── STYLES ──────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Rajdhani:wght@300;400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #03040b;
    --card: #0b0f19;
    --card2: #151b2b;
    --border: #232d42;
    --primary: #00f3ff;
    --primary-dim: rgba(0, 243, 255, 0.15);
    --secondary: #f72585;
    --text: #e2e8f0;
    --muted: #64748b;
    --red: #ef4444;
    --orange: #f59e0b;
    --font-display: 'Orbitron', monospace;
    --font-body: 'Rajdhani', sans-serif;
    --radius: 2px;
  }

  body { background: var(--bg); color: var(--text); font-family: var(--font-body); min-height: 100vh; overflow-x: hidden; user-select: none; -webkit-user-select: none; }

  .app { max-width: 430px; margin: 0 auto; min-height: 100vh; position: relative; background: var(--bg); display: flex; flex-direction: column; }

  .app::before { content: ''; position: fixed; inset: 0; background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 243, 255, 0.03) 2px, rgba(0, 243, 255, 0.03) 4px); pointer-events: none; z-index: 999; }

  .header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; background: var(--card); border-bottom: 2px solid var(--primary); position: sticky; top: 0; z-index: 100; box-shadow: 0 4px 20px var(--primary-dim); }
  .header-avatar { width: 36px; height: 36px; border-radius: 50%; border: 2px solid var(--primary); background: var(--card2); overflow: hidden; cursor: pointer; display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-weight: bold; color: var(--primary); }
  .header-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .esp-status { display: flex; flex-direction: column; align-items: flex-end; }
  .sync-dot { width: 8px; height: 8px; border-radius: 50%; animation: pulse 2s infinite; margin-top: 4px; }

  .content { flex: 1; overflow-y: auto; padding: 16px; padding-bottom: 90px; }

  .bottom-nav { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 430px; background: var(--card); border-top: 1px solid var(--border); display: flex; padding: 10px 0 20px; z-index: 100; }
  .nav-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer; padding: 4px; transition: 0.2s; }
  .nav-item svg { width: 22px; height: 22px; transition: 0.2s; }
  .nav-label { font-family: var(--font-display); font-size: 9px; letter-spacing: 2px; text-transform: uppercase; }
  .nav-item.active .nav-label, .nav-item.active svg { color: var(--primary); filter: drop-shadow(0 0 5px var(--primary)); }
  .nav-item:not(.active) .nav-label, .nav-item:not(.active) svg { color: var(--muted); }

  .card { background: linear-gradient(135deg, var(--card) 0%, var(--bg) 100%); border: 1px solid var(--border); border-left: 3px solid var(--primary); border-radius: var(--radius); padding: 20px; margin-bottom: 16px; position: relative; }
  .card-title { font-family: var(--font-display); font-size: 11px; letter-spacing: 2px; color: var(--secondary); text-transform: uppercase; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
  .card-title::before { content: '■'; color: var(--primary); font-size: 8px; }

  .gauge-wrap { display: flex; flex-direction: column; align-items: center; padding: 16px; background: var(--card2); border: 1px solid var(--border); border-radius: var(--radius); margin-bottom: 12px; position: relative; }
  .gauge-value { font-family: var(--font-display); font-size: 28px; font-weight: 700; }
  .gauge-unit { font-family: var(--font-body); font-size: 12px; color: var(--muted); margin-top: -4px; }
  .gauge-label { font-family: var(--font-display); font-size: 10px; letter-spacing: 2px; text-transform: uppercase; margin-top: 8px; }
  .gauge-status { font-family: var(--font-body); font-size: 14px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
  
  .status-good { color: var(--primary); }
  .status-moderate { color: var(--orange); }
  .status-poor { color: var(--red); }

  .chart-container { position: relative; width: 100%; height: 180px; }
  .chart-tooltip { background: var(--card); border: 1px solid var(--primary); border-radius: 0; padding: 10px; font-size: 12px; white-space: nowrap; box-shadow: 0 0 10px var(--primary-dim); position: absolute; pointer-events: none; z-index: 10;}
  .t-row { display: flex; gap: 8px; align-items: center; margin-bottom: 2px; font-weight: 600; }

  .history-header { display: flex; gap: 8px; padding: 8px 12px; color: var(--secondary); font-size: 11px; font-family: var(--font-display); letter-spacing: 1px; border-bottom: 1px solid var(--border); text-transform: uppercase; }
  .history-row { display: flex; gap: 8px; padding: 12px; border-bottom: 1px solid var(--border); align-items: center; font-size: 14px; font-weight: 600; transition: 0.2s; cursor: pointer; }
  .history-time { font-size: 11px; color: var(--muted); font-family: var(--font-display); line-height: 1.4; }
  .history-aqi { color: var(--primary); font-weight: 700; }

  .checkbox { width: 16px; height: 16px; border: 1px solid var(--primary); background: transparent; appearance: none; outline: none; cursor: pointer; position: relative; border-radius: 2px; }
  .checkbox:checked { background: var(--primary); }
  .checkbox:checked::after { content: '✔'; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #000; font-size: 10px; font-family: sans-serif; }

  .input-field, .custom-select { background: var(--bg); border: 1px solid var(--border); border-radius: 0; color: var(--primary); padding: 14px 16px; font-family: var(--font-display); font-size: 13px; width: 100%; outline: none; transition: 0.2s; }
  .input-field:focus, .custom-select:focus { border-color: var(--primary); box-shadow: 0 0 8px var(--primary-dim); }
  .input-label { font-size: 11px; font-weight: 700; margin-bottom: 8px; color: var(--secondary); letter-spacing: 2px; font-family: var(--font-display); text-transform: uppercase; }
  input[type=range] { width: 100%; accent-color: var(--primary); cursor: pointer; margin-top: 10px; }

  .btn-primary { background: var(--primary-dim); border: 1px solid var(--primary); color: var(--primary); font-family: var(--font-display); font-size: 12px; letter-spacing: 3px; padding: 16px; border-radius: 0; width: 100%; cursor: pointer; font-weight: 700; transition: 0.2s; text-transform: uppercase; margin-top: 10px;}
  .btn-primary:hover { background: var(--primary); color: #000; box-shadow: 0 0 15px var(--primary); }
  .btn-danger { background: rgba(255,59,59,0.1); border: 1px solid var(--red); color: var(--red); font-family: var(--font-display); font-size: 12px; letter-spacing: 3px; padding: 16px; border-radius: 0; width: 100%; cursor: pointer; font-weight: 700; margin-top: 12px; transition: 0.2s; text-transform: uppercase; }
  .btn-danger:hover { background: var(--red); color: #000; box-shadow: 0 0 15px var(--red); }

  .show-hide-btn { position: absolute; right: 10px; top: 12px; background: none; border: none; color: var(--secondary); cursor: pointer; font-family: var(--font-display); font-size: 10px; letter-spacing: 1px; }

  .login-wrap { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 24px; background: radial-gradient(circle at center, var(--card) 0%, var(--bg) 100%); }
  .login-card { background: var(--card2); border: 1px solid var(--border); border-top: 3px solid var(--primary); padding: 36px 28px; width: 100%; max-width: 380px; position: relative; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
  .login-title { font-family: var(--font-display); font-size: 18px; font-weight: 900; color: var(--primary); text-align: center; letter-spacing: 2px; margin-bottom: 8px; text-shadow: 0 0 10px var(--primary-dim); line-height: 1.4; }
  .login-sub { text-align: center; color: var(--muted); font-size: 12px; margin-bottom: 32px; font-family: var(--font-display); letter-spacing: 2px; text-transform: uppercase; }
  .login-link { text-align: center; margin-top: 20px; font-size: 12px; color: var(--muted); font-family: var(--font-display); letter-spacing: 1px; }
  .login-link a { color: var(--secondary); cursor: pointer; font-weight: bold; }

  .row-between { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
  .page-title { font-family: var(--font-display); font-size: 14px; letter-spacing: 3px; color: var(--primary); text-transform: uppercase; }
  .fade-in { animation: fadeIn 0.4s ease forwards; }

  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
  @keyframes fadeIn { from{opacity:0; transform:translateY(10px)} to{opacity:1; transform:translateY(0)} }
`;

// Added threshold parameter to dynamically adjust status labels
function getStatus(val, type, threshold = 100) {
  if (type === "aqi") {
    const elevated = Math.round(threshold / 2);
    if (val < elevated) return { label: "Optimal", cls: "status-good" };
    if (val < threshold) return { label: "Elevated", cls: "status-moderate" };
    return { label: "Hazardous", cls: "status-poor" };
  }
  if (type === "temp") {
    if (val < 20) return { label: "Sub-Optimal", cls: "status-moderate" };
    if (val <= 28) return { label: "Nominal", cls: "status-good" };
    return { label: "Critical", cls: "status-poor" };
  }
  if (type === "humidity") {
    if (val < 30) return { label: "Arid", cls: "status-moderate" };
    if (val <= 60) return { label: "Nominal", cls: "status-good" };
    return { label: "Saturated", cls: "status-moderate" };
  }
}

function formatTime(d) { 
  if (!(d instanceof Date)) d = new Date(d);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }); 
}
function formatDate(d) { 
  if (!(d instanceof Date)) d = new Date(d);
  return (d.getMonth() + 1) + "/" + d.getDate() + " " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }); 
}

function playSound(type) {
  if (type === "Silent") return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    if (ctx.state === "suspended") ctx.resume();
    const gain = ctx.createGain();
    gain.gain.value = 0.5;
    gain.connect(ctx.destination);
    
    const osc = ctx.createOscillator();
    osc.type = type === "Warning" ? "sawtooth" : type === "Alert" ? "sine" : "square";
    osc.frequency.value = type === "Warning" ? 300 : type === "Alert" ? 600 : 440;
    osc.connect(gain);
    
    osc.start();
    osc.stop(ctx.currentTime + (type === "Alert" ? 0.2 : 0.5));
    setTimeout(() => ctx.close(), 1000);
  } catch (e) {}
}

function CircularGauge({ value, unit, label, color, min = 0, max = 600, type, threshold = 100 }) {
  const r = 70, cx = 85, cy = 85, stroke = 8;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, (value - min) / (max - min)));
  const rot = -135;
  const status = getStatus(value, type, threshold);

  return (
    <div className="gauge-wrap">
      <div style={{ position: "absolute", top: 8, left: 8, fontSize: 10, color: "var(--muted)", fontFamily: "var(--font-display)" }}>SYS.GAUGE</div>
      <svg width={170} height={150} viewBox="0 0 170 150">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg)" strokeWidth={stroke + 4} strokeDasharray="4 6" transform={"rotate(" + rot + ", " + cx + ", " + cy + ")"} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={(circumference * 0.75 * pct) + " " + circumference} strokeLinecap="butt" transform={"rotate(" + rot + ", " + cx + ", " + cy + ")"} style={{ filter: "drop-shadow(0 0 8px " + color + ")", transition: "stroke-dasharray 0.5s ease" }} />
        <text x={cx} y={cy - 2} textAnchor="middle" fill={color} fontSize="32" fontFamily="Orbitron" fontWeight="900" style={{textShadow: "0 0 10px " + color}}>{value}</text>
        <text x={cx} y={cy + 18} textAnchor="middle" fill="var(--muted)" fontSize="12" fontFamily="Rajdhani" fontWeight="700" letterSpacing="2">{unit}</text>
      </svg>
      <div className="gauge-label" style={{ color }}>{label}</div>
      <div className={"gauge-status " + status.cls}>{status.label}</div>
    </div>
  );
}

function LineChart({ data }) {
  const [tooltip, setTooltip] = useState(null);
  const svgRef = useRef();
  const W = 380, H = 160, PL = 32, PR = 12, PT = 12, PB = 28;
  const iW = W - PL - PR, iH = H - PT - PB;

  if (!data || data.length < 2) return <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)", fontFamily: "var(--font-display)", fontSize: 11, letterSpacing: 2 }}>AWAITING SENSOR TELEMETRY...</div>;

  const aqis = data.map(d => d.aqi);
  const temps = data.map(d => d.temp);
  const hums = data.map(d => d.humidity);
  
  const minAqi = Math.min(...aqis, 0);
  const maxAqi = Math.max(...aqis, 100);
  
  const minTemp = Math.min(...temps) - 2;
  const maxTemp = Math.max(...temps) + 2;
  
  const minHum = Math.min(...hums) - 5;
  const maxHum = Math.max(...hums) + 5;

  const xScale = i => PL + (i / (data.length - 1)) * iW;
  const yScale = (v, mn, mx) => PT + iH - ((v - mn) / (mx - mn || 1)) * iH;
  const path = (arr, mn, mx) => arr.map((v, i) => (i === 0 ? "M" : "L") + xScale(i).toFixed(1) + "," + yScale(v, mn, mx).toFixed(1)).join(" ");

  const ticks = 4;
  const yLabels = Array.from({ length: ticks + 1 }, (_, i) => Math.round(minAqi + (maxAqi - minAqi) * i / ticks));

  return (
    <div className="chart-container" style={{ height: H + 20 }}>
      <svg ref={svgRef} width="100%" viewBox={"0 0 " + W + " " + H} preserveAspectRatio="none"
        onMouseMove={(e) => {
          const rect = svgRef.current.getBoundingClientRect();
          const mx = e.clientX - rect.left - PL;
          const idx = Math.max(0, Math.min(data.length - 1, Math.round((mx / iW) * (data.length - 1))));
          setTooltip({ x: xScale(idx), y: yScale(data[idx].aqi, minAqi, maxAqi), d: data[idx] });
        }} 
        onMouseLeave={() => setTooltip(null)} style={{ cursor: "crosshair", overflow: "visible" }}>
        
        {yLabels.map((v, i) => {
          const y = PT + iH - (i / ticks) * iH;
          return <g key={i}><line x1={PL} y1={y} x2={W - PR} y2={y} stroke="var(--border)" strokeWidth={1} strokeDasharray="2 4" /><text x={PL - 8} y={y + 4} textAnchor="end" fill="var(--muted)" fontSize="10" fontFamily="Orbitron">{v}</text></g>;
        })}
        
        <path d={path(hums, minHum, maxHum)} fill="none" stroke="var(--muted)" strokeWidth={1.5} />
        <path d={path(temps, minTemp, maxTemp)} fill="none" stroke="var(--secondary)" strokeWidth={1.5} />
        <path d={path(aqis, minAqi, maxAqi)} fill="none" stroke="var(--primary)" strokeWidth={2} style={{ filter: "drop-shadow(0 0 4px var(--primary))" }} />
        
        {tooltip && <>
          <line x1={tooltip.x} y1={PT} x2={tooltip.x} y2={PT + iH} stroke="var(--secondary)" strokeWidth={1} strokeDasharray="4 2" />
          <circle cx={tooltip.x} cy={tooltip.y} r={4} fill="var(--bg)" stroke="var(--primary)" strokeWidth={2} />
        </>}
      </svg>
      {tooltip && (
        <div className="chart-tooltip" style={{ left: Math.min(tooltip.x + 10, 200), top: 10 }}>
          <div style={{color: "var(--secondary)", fontFamily: "var(--font-display)", fontSize: 10, marginBottom: 6, borderBottom: "1px solid var(--border)", paddingBottom: 4}}>{formatTime(tooltip.d.timestamp)}</div>
          <div className="t-row"><span style={{ color: "var(--primary)" }}>■</span> AQI: {tooltip.d.aqi}</div>
          <div className="t-row"><span style={{ color: "var(--secondary)" }}>■</span> TEMP: {tooltip.d.temp}°C</div>
          <div className="t-row"><span style={{ color: "var(--muted)" }}>■</span> HUM: {tooltip.d.humidity}%</div>
        </div>
      )}
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAuth = async () => {
    setError(""); 
    if (isRegister && pass !== confirmPass) {
      setError("DECRYPTION KEYS DO NOT MATCH");
      return;
    }
    setLoading(true);
    let res;
    if (isRegister) res = await authHelpers.signUp(email, pass, username);
    else res = await authHelpers.signIn(email, pass);
    
    setLoading(false);
    if (res.error) setError(res.error.message);
    else onLogin({ id: res.data.user.id, name: username || email.split("@")[0], email });
  };

  return (
    <div className="login-wrap">
      <div className="login-card fade-in">
        <div style={{ position: "absolute", top: -14, left: 20, background: "var(--bg)", padding: "0 10px", color: "var(--primary)", fontFamily: "var(--font-display)", fontSize: 10, letterSpacing: 2 }}>SYS.AUTH</div>
        <div className="login-title">AIR POLLUTION<br/>MONITORING SYSTEM</div>
        <div className="login-sub">{isRegister ? "REGISTER OPERATIVE" : "SECURE TERMINAL ACCESS"}</div>
        
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {isRegister && <div><div className="input-label">IDENTIFIER (USERNAME)</div><input className="input-field" value={username} onChange={e=>setUsername(e.target.value)} /></div>}
          
          <div><div className="input-label">EMAIL ADDRESS</div><input className="input-field" type="email" value={email} onChange={e=>setEmail(e.target.value)} /></div>
          
          <div>
            <div className="input-label">DECRYPTION KEY (PASSWORD)</div>
            <div style={{position: "relative"}}>
              <input className="input-field" type={showPass ? "text" : "password"} value={pass} onChange={e=>setPass(e.target.value)} />
              <button type="button" className="show-hide-btn" onClick={() => setShowPass(!showPass)}>{showPass ? "HIDE" : "SHOW"}</button>
            </div>
          </div>

          {isRegister && (
            <div>
              <div className="input-label">CONFIRM DECRYPTION KEY</div>
              <div style={{position: "relative"}}>
                <input className="input-field" type={showConfirmPass ? "text" : "password"} value={confirmPass} onChange={e=>setConfirmPass(e.target.value)} />
                <button type="button" className="show-hide-btn" onClick={() => setShowConfirmPass(!showConfirmPass)}>{showConfirmPass ? "HIDE" : "SHOW"}</button>
              </div>
            </div>
          )}

          <button className="btn-primary" onClick={handleAuth} disabled={loading}>{loading ? "PROCESSING..." : (isRegister ? "INITIALIZE" : "ACCESS TERMINAL")}</button>
          {error && <div style={{ color: "var(--red)", fontSize: 12, textAlign: "center", fontFamily: "var(--font-display)" }}>ERR: {error}</div>}
        </div>
        
        <div className="login-link">
          {isRegister ? "EXISTING OPERATIVE? " : "NEW OPERATIVE? "}
          <a onClick={() => { setIsRegister(!isRegister); setError(""); }}>{isRegister ? "SIGN IN" : "REGISTER"}</a>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("monitor");
  const [avatar, setAvatar] = useState(null);
  const [alarmType, setAlarmType] = useState("Emergency");
  const [aqiThreshold, setAqiThreshold] = useState(100); // Dynamic Slider State

  // Selection & Deletion State
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState(new Set());
  const [hiddenLogs, setHiddenLogs] = useState(new Set());
  const pressTimer = useRef(null);

  const { latest, chartData, logs, espConnected, lastSync, refreshReadings } = useMQTT(user);

  // LOAD SETTINGS ON START
  useEffect(() => {
    authHelpers.getSession().then(({ data }) => {
      const u = data?.session?.user;
      if (u) {
        setUser({ id: u.id, name: u.user_metadata?.username || u.email.split("@")[0], email: u.email });
        setAvatar(localStorage.getItem("user_avatar_" + u.id));
        setAlarmType(localStorage.getItem("alarm_type") || "Emergency");
        
        const savedThreshold = localStorage.getItem("aqi_threshold");
        if(savedThreshold) setAqiThreshold(Number(savedThreshold));
      }
    });
    const { data: { subscription } } = authHelpers.onAuthChange((u) => {
      if (u) {
        setUser({ id: u.id, name: u.user_metadata?.username || u.email.split("@")[0], email: u.email });
        setAvatar(localStorage.getItem("user_avatar_" + u.id));
      } else setUser(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // TRIGGER ALARM WHEN AQI CROSSES THRESHOLD
  useEffect(() => {
    if (latest && latest.aqi !== undefined) {
      if (latest.aqi >= aqiThreshold && alarmType !== "Silent") {
        playSound(alarmType);
      }
    }
  }, [latest?.timestamp, aqiThreshold, alarmType]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const res = ev.target.result;
      setAvatar(res);
      localStorage.setItem("user_avatar_" + user.id, res);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setAvatar(null);
    localStorage.removeItem("user_avatar_" + user.id);
  };

  const handleSoundChange = (e) => {
    const val = e.target.value;
    setAlarmType(val);
    localStorage.setItem("alarm_type", val);
    playSound(val);
  };

  const handleThresholdChange = (e) => {
    const val = Number(e.target.value);
    setAqiThreshold(val);
    localStorage.setItem("aqi_threshold", val);
  };

  const getLogKey = (log) => log.id ? log.id : new Date(log.timestamp).getTime();

  // --- LONG PRESS & SELECTION LOGIC ---
  const handlePressStart = (key) => {
    pressTimer.current = setTimeout(() => {
      setIsSelecting(true);
      toggleSelection(key);
    }, 500); 
  };

  const handlePressEnd = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  const toggleSelection = (key) => {
    const newSet = new Set(selectedLogs);
    if (newSet.has(key)) newSet.delete(key);
    else newSet.add(key);
    setSelectedLogs(newSet);
  };

  const handleSelectAll = () => {
    const newSet = new Set();
    logs.slice(0, 20).forEach(log => newSet.add(getLogKey(log)));
    setSelectedLogs(newSet);
  };

  const handleDeleteSelected = async () => {
    const newHidden = new Set(hiddenLogs);
    selectedLogs.forEach(key => newHidden.add(key));
    setHiddenLogs(newHidden);
    setIsSelecting(false);
    setSelectedLogs(new Set());
  };

  const handleDeleteAll = async () => {
    const newHidden = new Set(hiddenLogs);
    logs.forEach(log => newHidden.add(getLogKey(log)));
    setHiddenLogs(newHidden);
    setIsSelecting(false);
  };

  if (!user) return <><style>{styles}</style><LoginScreen onLogin={setUser} /></>;

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        <div className="header">
          <div className="esp-status">
             <span style={{ fontFamily: "var(--font-display)", fontSize: 11, letterSpacing: 2, color: espConnected ? "var(--primary)" : "var(--red)" }}>
               {espConnected ? "ESP32: CONNECTED" : "ESP32: DISCONNECTED"}
             </span>
             <div className="sync-dot" style={{ background: espConnected ? "var(--primary)" : "var(--red)", boxShadow: "0 0 10px " + (espConnected ? "var(--primary)" : "var(--red)") }} />
          </div>
          <div className="header-avatar" onClick={() => setTab("settings")}>
            {avatar ? <img src={avatar} alt="Profile" /> : user.name[0]?.toUpperCase()}
          </div>
        </div>

        <div className="content">
          {tab === "monitor" && (
            <div className="fade-in">
              <CircularGauge value={latest?.aqi || 0} unit="PPM" label="AIR TOXICITY" color="var(--primary)" type="aqi" threshold={aqiThreshold} />
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{flex: 1}}><CircularGauge value={latest?.temp || 0} unit="°C" label="TEMP" color="var(--secondary)" type="temp" /></div>
                <div style={{flex: 1}}><CircularGauge value={latest?.humidity || 0} unit="%" label="HUM" color="var(--muted)" type="humidity" /></div>
              </div>
              <div className="card" style={{ marginTop: 16 }}>
                <div className="card-title">TREND ANALYSIS</div>
                <LineChart data={chartData} />
                <div style={{ fontSize: 10, color: "var(--muted)", fontFamily: "var(--font-display)", marginTop: 16 }}>LAST SYNC: {lastSync ? formatTime(lastSync) : "--:--:--"}</div>
              </div>
            </div>
          )}
          
          {tab === "history" && (
            <div className="fade-in">
              <div className="row-between">
                <div className="page-title">SENSOR LOGS</div>
                <div style={{ display: "flex", gap: "8px" }}>
                  {!isSelecting ? (
                    <>
                      <button onClick={handleDeleteAll} style={{background: "none", border: "1px solid var(--red)", color: "var(--red)", padding: "8px 10px", cursor: "pointer", fontFamily: "var(--font-display)", fontSize: 10}}>[ DEL ALL ]</button>
                      <button onClick={refreshReadings} style={{background: "none", border: "1px solid var(--secondary)", color: "var(--secondary)", padding: "8px 10px", cursor: "pointer", fontFamily: "var(--font-display)", fontSize: 10}}>[ REFRESH ]</button>
                    </>
                  ) : (
                    <>
                      <button onClick={handleSelectAll} style={{background: "none", border: "1px solid var(--primary)", color: "var(--primary)", padding: "8px 10px", cursor: "pointer", fontFamily: "var(--font-display)", fontSize: 10}}>[ ALL ]</button>
                      <button onClick={() => { setIsSelecting(false); setSelectedLogs(new Set()); }} style={{background: "none", border: "1px solid var(--muted)", color: "var(--muted)", padding: "8px 10px", cursor: "pointer", fontFamily: "var(--font-display)", fontSize: 10}}>[ CANCEL ]</button>
                    </>
                  )}
                </div>
              </div>

              {isSelecting && selectedLogs.size > 0 && (
                <button className="btn-danger fade-in" onClick={handleDeleteSelected} style={{marginTop: 0, marginBottom: 16}}>DELETE SELECTED ({selectedLogs.size})</button>
              )}

              <div className="card" style={{ padding: 0 }}>
                <div className="history-header">
                  {isSelecting && <div style={{width: 16}}></div>}
                  <span style={{flex: 2}}>TIME</span><span style={{flex: 1}}>AQI</span><span style={{flex: 1}}>TMP</span><span style={{flex: 1}}>HUM</span>
                </div>
                {logs
                  .map(log => ({ ...log, uniqueKey: getLogKey(log) }))
                  .filter(log => !hiddenLogs.has(log.uniqueKey))
                  .slice(0, 20)
                  .map((log) => (
                  <div 
                    className="history-row" 
                    key={log.uniqueKey}
                    style={{ background: selectedLogs.has(log.uniqueKey) ? 'var(--card2)' : 'transparent' }}
                    onMouseDown={() => handlePressStart(log.uniqueKey)}
                    onMouseUp={handlePressEnd}
                    onMouseLeave={handlePressEnd}
                    onTouchStart={() => handlePressStart(log.uniqueKey)}
                    onTouchEnd={handlePressEnd}
                    onClick={() => { if (isSelecting) toggleSelection(log.uniqueKey); }}
                  >
                    {isSelecting && (
                      <div style={{width: 16, display: 'flex', alignItems: 'center'}}>
                        <input type="checkbox" className="checkbox" checked={selectedLogs.has(log.uniqueKey)} readOnly />
                      </div>
                    )}
                    <div className="history-time" style={{flex: 2}}>{formatDate(log.timestamp)}</div>
                    <div className="history-aqi" style={{flex: 1, color: log.aqi >= aqiThreshold ? "var(--red)" : "var(--primary)"}}>{log.aqi}</div>
                    <div style={{color: "var(--secondary)", flex: 1}}>{log.temp}°</div>
                    <div style={{color: "var(--muted)", flex: 1}}>{log.humidity}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "settings" && (
            <div className="fade-in">
              <div className="card">
                <div className="card-title">OPERATIVE PROFILE</div>
                <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
                  <div style={{ width: 60, height: 60, borderRadius: "50%", border: "2px solid var(--primary)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--card2)" }}>
                    {avatar ? <img src={avatar} style={{width: "100%", height: "100%", objectFit: "cover"}} /> : <span style={{fontFamily: "var(--font-display)", fontSize: 24, color: "var(--primary)"}}>{user.name[0]?.toUpperCase()}</span>}
                  </div>
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--primary)" }}>{user.name}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>{user.email}</div>
                  </div>
                </div>
                
                <div className="input-label">PROFILE PHOTO</div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input type="file" accept="image/*" onChange={handleImageUpload} style={{fontFamily: "var(--font-body)", fontSize: 12, color: "var(--muted)", flex: 1}} />
                  {avatar && (
                    <button onClick={handleRemoveImage} style={{background: "var(--card2)", border: "1px solid var(--red)", color: "var(--red)", padding: "6px 12px", cursor: "pointer", fontFamily: "var(--font-display)", fontSize: 10, height: "100%"}}>
                      [ REMOVE ]
                    </button>
                  )}
                </div>
              </div>

              <div className="card">
                <div className="card-title" style={{color: "var(--orange)"}}>SENSOR CALIBRATION</div>
                <div className="input-label" style={{marginTop: 10}}>HAZARDOUS AQI THRESHOLD: <span style={{color: "var(--primary)"}}>{aqiThreshold} PPM</span></div>
                
                <input type="range" min="50" max="500" step="10" value={aqiThreshold} onChange={handleThresholdChange} />
                
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-display)', marginTop: 4}}>
                  <span>50 (STRICT)</span>
                  <span>500 (LOOSE)</span>
                </div>
                
                <div style={{fontSize: 10, color: 'var(--muted)', marginTop: 12, fontFamily: 'var(--font-display)', lineHeight: 1.6}}>
                  <span style={{color: "var(--primary)"}}>■ OPTIMAL:</span> &lt; {Math.round(aqiThreshold / 2)}<br/>
                  <span style={{color: "var(--orange)"}}>■ ELEVATED:</span> &lt; {aqiThreshold}<br/>
                  <span style={{color: "var(--red)"}}>■ HAZARDOUS:</span> &gt;= {aqiThreshold}
                </div>
              </div>

              <div className="card">
                <div className="card-title" style={{color: "var(--red)"}}>AUDIO & ALERTS</div>
                
                <div className="input-label" style={{marginTop: 10}}>ALERT SOUND TYPE</div>
                <select className="custom-select" value={alarmType} onChange={handleSoundChange}>
                  <option value="Emergency">Emergency Beep</option>
                  <option value="Warning">Warning Chime</option>
                  <option value="Alert">Short Alert</option>
                  <option value="Silent">Silent (No Sound)</option>
                </select>

                <button onClick={() => playSound(alarmType)} style={{background: "var(--card2)", color: "var(--secondary)", border: "1px solid var(--secondary)", padding: "10px", width: "100%", marginTop: 10, cursor: "pointer", fontFamily: "var(--font-display)", fontSize: 12}}>TEST AUDIO</button>
              </div>
              
              <button className="btn-danger" onClick={() => { setAvatar(null); authHelpers.signOut(); }}>DISCONNECT TERMINAL</button>
            </div>
          )}
        </div>

        <div className="bottom-nav">
          {[ 
            { id: "monitor", label: "MONITOR", path: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" },
            { id: "history", label: "LOGS", path: "M1 4v6h6M3.51 15a9 9 0 1 0 .49-3" },
            { id: "settings", label: "SETTINGS", path: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06-.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" }
          ].map(t => (
            <div key={t.id} className={tab === t.id ? "nav-item active" : "nav-item"} onClick={() => setTab(t.id)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={tab === t.id ? 2 : 1.5}><path d={t.path}/></svg>
              <span className="nav-label">{t.label}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}