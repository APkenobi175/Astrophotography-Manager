import { useEffect, useRef, useState } from "react";

const USNO = "https://aa.usno.navy.mil/api";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_ABBR = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const QUALITY = {
  best: { bg: "rgba(6,182,212,0.13)",  border: "rgba(6,182,212,0.5)",  text: "#22d3ee", label: "Best"  },
  good: { bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.45)", text: "#4ade80", label: "Good"  },
  fair: { bg: "rgba(234,179,8,0.12)",  border: "rgba(234,179,8,0.45)", text: "#fbbf24", label: "Fair"  },
  poor: { bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.45)", text: "#f87171", label: "Poor"  },
};

const PHASE_ICON = {
  "New Moon":        "🌑",
  "Waxing Crescent": "🌒",
  "First Quarter":   "🌓",
  "Waxing Gibbous":  "🌔",
  "Full Moon":       "🌕",
  "Waning Gibbous":  "🌖",
  "Last Quarter":    "🌗",
  "Waning Crescent": "🌘",
};

// ── helpers ──────────────────────────────────────────────────────────────────

function pad(n) { return String(n).padStart(2, "0"); }
function toDateStr(y, m, d) { return `${y}-${pad(m)}-${pad(d)}`; }

function parseFrac(fracillum) {
  if (fracillum == null) return 0;
  if (typeof fracillum === "number") return Math.round(fracillum);
  return parseInt(String(fracillum).replace("%", "").trim(), 10) || 0;
}

function parseHour(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h + m / 60;
}

// Early-AM times (0–8 h) are treated as "after midnight" → add 24 so they
// sort correctly relative to evening hours (21–23).
function nightHour(h) {
  return h !== null && h < 8 ? h + 24 : h;
}

function fmt12(timeStr) {
  if (!timeStr) return "—";
  const [h, m] = timeStr.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${pad(m)} ${suffix}`;
}

function tzOffsetForDate(year, month, day) {
  return -new Date(year, month - 1, day, 12, 0, 0).getTimezoneOffset() / 60;
}

// ── quality scoring ───────────────────────────────────────────────────────────

function calcQuality(illum, rawSet, rawRise, daysFromNew) {
  const setH  = rawSet  !== null ? nightHour(parseHour(rawSet))  : null;

  // New moon day
  if (Math.abs(daysFromNew) < 0.5) return "best";

  // Moon never rises (below horizon all night)
  if (rawRise === null && rawSet === null) return "best";

  // Moon sets before astronomical darkness (~9:30 PM)
  if (setH !== null && setH < 21.5) return "best";

  // Within ±3 days of new moon
  if (Math.abs(daysFromNew) <= 3) return "good";

  // Moonset before 11 PM
  if (setH !== null && setH < 23) return "good";

  // Moon never sets and is bright → very poor
  if (rawSet === null && illum > 50) return "poor";

  // Moon sets after 2 AM and is bright
  if (setH !== null && setH >= 26 && illum > 50) return "poor";

  return "fair";
}

function buildSummary(quality, rawRise, rawSet, illum) {
  const setFmt  = fmt12(rawSet);

  switch (quality) {
    case "best":
      if (!rawRise && !rawSet)
        return "Excellent — Moon absent all night, ideal conditions";
      if (rawSet && parseHour(rawSet) < 21.5)
        return `Excellent — Moon sets at ${setFmt} before darkness falls`;
      return "Excellent — New moon phase, minimal light interference";
    case "good":
      return rawSet
        ? `Good — Moon sets at ${setFmt}, leaving dark skies for the rest of the night`
        : "Good — Moon rises late, limited interference";
    case "fair":
      return rawSet
        ? `Fair — Moon sets at ${setFmt} (${illum}% illuminated), some interference overnight`
        : `Fair — ${illum}% illuminated, moon present for much of the night`;
    case "poor":
      return rawSet
        ? `Poor — Bright moon (${illum}%) sets at ${setFmt}, significant light pollution`
        : `Poor — ${illum}% illuminated moon visible all night`;
    default:
      return "";
  }
}

// ── USNO fetch helpers (module-level, no closures) ────────────────────────────

async function fetchPhaseYear(year, signal) {
  const r = await fetch(
    `${USNO}/moon/phases/year?year=${year}&numphases=50`,
    { signal }
  );
  if (!r.ok) throw new Error("phase fetch failed");
  const d = await r.json();
  return d.phasedata ?? [];
}

async function fetchOneDay(year, month, day, lat, lon, signal) {
  const tz   = tzOffsetForDate(year, month, day);
  const date = toDateStr(year, month, day);
  const r = await fetch(
    `${USNO}/rstt/oneday?date=${date}&coords=${lat},${lon}&tz=${tz}`,
    { signal }
  );
  if (!r.ok) return null;
  return r.json();
}

// ── component ─────────────────────────────────────────────────────────────────

export default function MoonCalendar({ latitude, longitude }) {
  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth() + 1, today.getDate());

  const [year,     setYear]     = useState(today.getFullYear());
  const [month,    setMonth]    = useState(today.getMonth() + 1);
  const [days,     setDays]     = useState({});
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [selected, setSelected] = useState(null);
  const abortRef = useRef(null);

  // ── data loading ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (latitude == null || longitude == null) return;

    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const sig = ctrl.signal;

    setLoading(true);
    setError(null);
    setSelected(null);
    setDays({});

    (async () => {
      try {
        // Phase events for this year (+ next year if December)
        let allPhases = await fetchPhaseYear(year, sig);
        if (month === 12) {
          const next = await fetchPhaseYear(year + 1, sig);
          allPhases = [...allPhases, ...next];
        }

        const daysInMonth = new Date(year, month, 0).getDate();

        // All days in parallel
        const results = await Promise.all(
          Array.from({ length: daysInMonth }, (_, i) =>
            fetchOneDay(year, month, i + 1, latitude, longitude, sig).catch(() => null)
          )
        );

        if (sig.aborted) return;

        const newDays = {};
        const DAY_MS = 86_400_000;

        results.forEach((res, i) => {
          const d       = i + 1;
          const dateStr = toDateStr(year, month, d);

          if (!res || res.error) { newDays[dateStr] = null; return; }

          const data     = res.properties?.data ?? {};
          const moondata = data.moondata ?? [];
          const illum    = parseFrac(data.fracillum);
          const curphase = data.curphase ?? "";

          const rawRise = moondata.find(e => e.phen === "Rise")?.time ?? null;
          const rawSet  = moondata.find(e => e.phen === "Set")?.time  ?? null;

          // Days from nearest new moon
          const thisDate = new Date(year, month - 1, d);
          const newMoons = allPhases.filter(p => p.phase === "New Moon");
          let daysFromNew = Infinity;
          for (const nm of newMoons) {
            const diff = (thisDate - new Date(nm.year, nm.month - 1, nm.day)) / DAY_MS;
            if (Math.abs(diff) < Math.abs(daysFromNew)) daysFromNew = diff;
          }

          const quality    = calcQuality(illum, rawSet, rawRise, daysFromNew);
          const phaseEvent = allPhases.find(
            p => p.year === year && p.month === month && p.day === d
          );

          newDays[dateStr] = {
            illum,
            rawRise,
            rawSet,
            curphase,
            icon:       PHASE_ICON[curphase] ?? "🌙",
            quality,
            phaseEvent: phaseEvent?.phase ?? null,
            daysFromNew,
            summary:    buildSummary(quality, rawRise, rawSet, illum),
          };
        });

        setDays(newDays);
      } catch (err) {
        if (!sig.aborted)
          setError("Could not load moon data from USNO — check your connection and try again.");
      } finally {
        if (!sig.aborted) setLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, [year, month, latitude, longitude]);

  // ── navigation ───────────────────────────────────────────────────────────────
  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  // ── build grid cells ─────────────────────────────────────────────────────────
  const firstDow    = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const selData = selected ? days[selected] : null;

  return (
    <div className="moon-cal-wrap">

      {/* Month nav */}
      <div className="moon-cal-nav">
        <button className="moon-nav-btn" onClick={prevMonth}>‹</button>
        <h3 className="moon-cal-month">
          {MONTH_NAMES[month - 1]} {year}
          {loading && <span className="moon-loading-pip" />}
        </h3>
        <button className="moon-nav-btn" onClick={nextMonth}>›</button>
      </div>

      {/* Legend */}
      <div className="moon-legend">
        {Object.entries(QUALITY).map(([k, v]) => (
          <div key={k} className="moon-legend-item">
            <span className="moon-legend-dot" style={{ background: v.text }} />
            <span style={{ color: v.text }}>{v.label}</span>
          </div>
        ))}
      </div>

      {error && <div className="moon-error">{error}</div>}

      {/* Calendar grid */}
      <div className="moon-grid">
        {DAY_ABBR.map(d => <div key={d} className="moon-dow">{d}</div>)}

        {cells.map((day, idx) => {
          if (!day) return <div key={`e${idx}`} />;

          const ds   = toDateStr(year, month, day);
          const info = days[ds];
          const cfg  = info ? QUALITY[info.quality] : null;
          const isToday = ds === todayStr;
          const isSel   = selected === ds;

          return (
            <button
              key={ds}
              className={`moon-day${isToday ? " moon-today" : ""}${isSel ? " moon-sel" : ""}${loading && !info ? " moon-shimmer" : ""}`}
              style={cfg ? {
                background:  cfg.bg,
                borderColor: isSel ? cfg.text : cfg.border,
                boxShadow:   isSel ? `0 0 0 2px ${cfg.text}55` : undefined,
              } : undefined}
              onClick={() => setSelected(isSel ? null : ds)}
              aria-label={`${MONTH_NAMES[month - 1]} ${day}`}
            >
              <span
                className="moon-day-num"
                style={isToday ? { color: "var(--accent)", fontWeight: 700 } : undefined}
              >
                {day}
              </span>

              {info?.phaseEvent && (
                <span className="moon-phase-tag">
                  {info.phaseEvent === "New Moon"      ? "NM" :
                   info.phaseEvent === "Full Moon"     ? "FM" :
                   info.phaseEvent === "First Quarter" ? "1Q" : "3Q"}
                </span>
              )}

              {info?.icon && <span className="moon-icon">{info.icon}</span>}
            </button>
          );
        })}
      </div>

      {/* Detail panel */}
      {selected && selData && (
        <DetailPanel
          dateStr={selected}
          data={selData}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// ── detail panel ──────────────────────────────────────────────────────────────

function DetailPanel({ dateStr, data, onClose }) {
  const cfg  = QUALITY[data.quality];
  const date = new Date(dateStr + "T12:00:00");

  return (
    <div className="moon-detail" style={{ borderColor: cfg.border }}>
      <div className="moon-detail-head">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "1.6rem", lineHeight: 1 }}>{data.icon}</span>
          <div>
            <div className="moon-detail-date">
              {date.toLocaleDateString("en-US", {
                weekday: "long", month: "long", day: "numeric", year: "numeric",
              })}
            </div>
            {data.phaseEvent && (
              <div style={{ fontSize: "0.78rem", color: cfg.text, marginTop: 2 }}>
                {data.phaseEvent}
              </div>
            )}
          </div>
        </div>
        <button className="moon-detail-close" onClick={onClose}>✕</button>
      </div>

      <div className="moon-detail-stats">
        <Stat label="Moonrise"    value={fmt12(data.rawRise)} />
        <Stat label="Moonset"     value={fmt12(data.rawSet)}  />
        <Stat label="Illumination" value={`${data.illum}%`}  />
        <Stat label="Phase"       value={data.curphase || "—"} />
      </div>

      <div className="moon-detail-summary" style={{ color: cfg.text }}>
        <span
          className="moon-quality-badge"
          style={{ background: cfg.bg, borderColor: cfg.border, color: cfg.text }}
        >
          {cfg.label}
        </span>
        {data.summary}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="moon-detail-stat">
      <span className="moon-detail-lbl">{label}</span>
      <span className="moon-detail-val">{value}</span>
    </div>
  );
}
