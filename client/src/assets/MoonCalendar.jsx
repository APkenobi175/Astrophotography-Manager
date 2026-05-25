import { useEffect, useMemo, useRef, useState } from "react";

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

// ── helpers ───────────────────────────────────────────────────────────────────

function pad(n) { return String(n).padStart(2, "0"); }
function toDateStr(y, m, d) { return `${y}-${pad(m)}-${pad(d)}`; }

function parseFrac(f) {
  if (f == null) return 0;
  if (typeof f === "number") return Math.round(f);
  return parseInt(String(f).replace("%", "").trim(), 10) || 0;
}

function parseHour(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h + m / 60;
}

// Hours 0–11 (midnight to noon) are "after midnight" on the imaging night.
// Add 24 so they sort correctly after evening hours (19–23).
function normNight(h) {
  return h !== null && h < 12 ? h + 24 : h;
}

function fmt12(timeStr) {
  if (!timeStr) return "—";
  const [h, m] = timeStr.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${pad(m)} ${suffix}`;
}

function fmtHour24(h24) {
  if (h24 === 0) return "Midnight";
  if (h24 < 12) return `${h24} AM`;
  if (h24 === 12) return "Noon";
  return `${h24 - 12} PM`;
}

function tzOffsetForDate(year, month, day) {
  return -new Date(year, month - 1, day, 12, 0, 0).getTimezoneOffset() / 60;
}

function phaseToLocalDate(p) {
  const [h, mi] = p.time.split(":").map(Number);
  const tz = tzOffsetForDate(p.year, p.month, p.day);
  const localDate = new Date(Date.UTC(p.year, p.month - 1, p.day, h, mi) + tz * 3_600_000);
  return { ...p, year: localDate.getUTCFullYear(), month: localDate.getUTCMonth() + 1, day: localDate.getUTCDate() };
}

// ── quality scoring ───────────────────────────────────────────────────────────
// nightStart : 19–23  (e.g. 22 = 10 PM)
// nightEnd   : 0–8    (e.g. 4  = 4 AM)  — stored as raw hour; normalized to +24 internally

function calcQuality(illum, rawSet, rawRise, daysFromNew, nightStart, nightEnd) {
  if (Math.round(daysFromNew) === 0) return "best";

  const NS = nightStart;
  const NE = nightEnd + 24; // e.g. 4 AM → 28

  const rN = normNight(parseHour(rawRise));
  const sN = normNight(parseHour(rawSet));

  let moonIn    = false;
  let entryTime = NS;

  if (rN !== null && sN !== null) {
    if (rN > sN) {
      // Inverted: moon rose after midnight (rN=24+), sets during daytime (sN=12-18).
      // Two ways it can hit the window:
      //   1. The morning rise itself falls inside [NS, NE] (e.g. rises at 4:30 AM, window ends 5 AM)
      //   2. The daytime set is after NS — meaning the moon was also up in the previous evening
      const morningRiseInWindow = rN >= NS && rN < NE;
      const eveningPresence     = sN > NS; // moon was up at start of evening too
      moonIn    = morningRiseInWindow || eveningPresence;
      entryTime = eveningPresence ? NS : Math.max(rN, NS);
    } else {
      // Normal: rises then sets in order
      moonIn    = rN < NE && sN > NS;
      entryTime = Math.max(rN, NS);
    }
  } else if (rN !== null) {
    if (rN >= 24 && rN > NE) {
      // Morning rise (h < 12) with no set on this day — moon was up all evening,
      // set falls on the next calendar day
      moonIn    = true;
      entryTime = NS;
    } else {
      moonIn    = rN < NE;
      entryTime = Math.max(rN, NS);
    }
  } else if (sN !== null) {
    moonIn    = sN > NS;
    entryTime = NS; // was already up at window start
  }

  // BEST: moon absent AND thin enough that sky glow is negligible (≤25% illuminated)
  // Moon absent but bright → still "good" since a 50% moon that just set still glows the horizon
  if (!moonIn) return illum <= 25 ? "best" : "good";

  // Moon enters after 2 AM → very little interference
  if (entryTime >= 26) return illum > 60 ? "fair" : "good";

  // Moon enters midnight–2 AM → dark evening available
  if (entryTime >= 24) return illum > 40 ? "fair" : "good";

  // Moon present before midnight → most of the window affected
  if (illum > 50) return "poor";
  return "fair";
}

function buildSummary(quality, rawRise, rawSet, illum, nightStart, nightEnd) {
  const NS = nightStart;
  const NE = nightEnd + 24;

  const rN = normNight(parseHour(rawRise));
  const sN = normNight(parseHour(rawSet));
  const riseFmt = rawRise ? fmt12(rawRise) : null;
  const setFmt  = rawSet  ? fmt12(rawSet)  : null;
  const winStr  = `${fmtHour24(nightStart)} – ${fmtHour24(nightEnd)}`;

  switch (quality) {
    case "best":
      if (!rawRise && !rawSet)
        return "Excellent — Moon absent all night";
      if (sN !== null && sN <= NS)
        return `Excellent — Moon sets at ${setFmt}, before imaging begins`;
      if (rN !== null && rN >= NE)
        return `Excellent — Moon rises at ${riseFmt}, after imaging ends`;
      return `Excellent — Moon absent during your imaging window (${winStr})`;
    case "good":
      if (rN !== null && rN >= 24)
        return `Good — Moon rises at ${riseFmt} (${illum}%), dark skies for the first half of the night`;
      return `Good — Limited interference, ${illum}% illuminated`;
    case "fair":
      if (rN !== null && rN >= NS && rN < 24)
        return `Fair — Moon rises at ${riseFmt} (${illum}%), evening sky affected`;
      if (rN !== null)
        return `Fair — Moon rises at ${riseFmt} (${illum}%), second half of night affected`;
      if (setFmt)
        return `Fair — Moon (${illum}%) sets at ${setFmt}, first part of night affected`;
      return `Fair — ${illum}% illuminated, moon present during imaging hours`;
    case "poor":
      return riseFmt
        ? `Poor — ${illum}% moon rises at ${riseFmt}, bright sky for most of the night`
        : `Poor — ${illum}% illuminated moon up during prime imaging hours`;
    default:
      return "";
  }
}

// ── USNO fetch helpers ────────────────────────────────────────────────────────

async function fetchPhaseYear(year, signal) {
  const r = await fetch(`${USNO}/moon/phases/year?year=${year}&numphases=50`, { signal });
  if (!r.ok) throw new Error("phase fetch failed");
  return (await r.json()).phasedata ?? [];
}

async function fetchOneDay(year, month, day, lat, lon, signal) {
  const date = toDateStr(year, month, day);
  const tz   = tzOffsetForDate(year, month, day);
  const r = await fetch(`${USNO}/rstt/oneday?date=${date}&coords=${lat},${lon}&tz=${tz}`, { signal });
  if (!r.ok) return null;
  return r.json();
}

// ── component ─────────────────────────────────────────────────────────────────

export default function MoonCalendar({ latitude, longitude, imagingStart = 22, imagingEnd = 4 }) {
  const today    = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth() + 1, today.getDate());

  const [year,     setYear]    = useState(today.getFullYear());
  const [month,    setMonth]   = useState(today.getMonth() + 1);
  const [rawDays,  setRawDays] = useState({}); // pure API data, no quality
  const [loading,  setLoading] = useState(false);
  const [error,    setError]   = useState(null);
  const [selected, setSelected] = useState(null);
  const abortRef = useRef(null);

  // ── derive quality from raw data + current window (no re-fetch needed) ───────
  const days = useMemo(() => {
    const result = {};
    for (const [ds, raw] of Object.entries(rawDays)) {
      if (!raw) { result[ds] = null; continue; }
      const quality = calcQuality(raw.illum, raw.rawSet, raw.rawRise, raw.daysFromNew, imagingStart, imagingEnd);
      result[ds] = {
        ...raw,
        quality,
        summary: buildSummary(quality, raw.rawRise, raw.rawSet, raw.illum, imagingStart, imagingEnd),
      };
    }
    return result;
  }, [rawDays, imagingStart, imagingEnd]);

  // ── fetch raw data when month/location changes ────────────────────────────────
  useEffect(() => {
    if (latitude == null || longitude == null) return;

    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const sig = ctrl.signal;

    setLoading(true);
    setError(null);
    setSelected(null);
    setRawDays({});

    (async () => {
      try {
        let allPhases = await fetchPhaseYear(year, sig);
        if (month === 12) {
          const next = await fetchPhaseYear(year + 1, sig);
          allPhases = [...allPhases, ...next];
        }
        const localPhases = allPhases.map(phaseToLocalDate);

        const daysInMonth = new Date(year, month, 0).getDate();
        const results = await Promise.all(
          Array.from({ length: daysInMonth }, (_, i) =>
            fetchOneDay(year, month, i + 1, latitude, longitude, sig).catch(() => null)
          )
        );

        if (sig.aborted) return;

        const DAY_MS  = 86_400_000;
        const newRaw  = {};

        results.forEach((res, i) => {
          const d       = i + 1;
          const dateStr = toDateStr(year, month, d);

          if (!res || res.error) { newRaw[dateStr] = null; return; }

          const data     = res.properties?.data ?? {};
          const moondata = data.moondata ?? [];
          const illum    = parseFrac(data.fracillum);
          const curphase = data.curphase ?? "";
          const rawRise  = moondata.find(e => e.phen === "Rise")?.time ?? null;
          const rawSet   = moondata.find(e => e.phen === "Set")?.time  ?? null;

          const thisDate = new Date(year, month - 1, d);
          const newMoons = localPhases.filter(p => p.phase === "New Moon");
          let daysFromNew = Infinity;
          for (const nm of newMoons) {
            const diff = (thisDate - new Date(nm.year, nm.month - 1, nm.day)) / DAY_MS;
            if (Math.abs(diff) < Math.abs(daysFromNew)) daysFromNew = diff;
          }

          const phaseEvent = localPhases.find(p => p.year === year && p.month === month && p.day === d);

          newRaw[dateStr] = {
            illum, rawRise, rawSet, curphase,
            icon:       PHASE_ICON[curphase] ?? "🌙",
            phaseEvent: phaseEvent?.phase ?? null,
            daysFromNew,
          };
        });

        setRawDays(newRaw);
      } catch (err) {
        if (!sig.aborted)
          setError("Could not load moon data from USNO — check your connection and try again.");
      } finally {
        if (!sig.aborted) setLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, [year, month, latitude, longitude]);

  // ── navigation ────────────────────────────────────────────────────────────────
  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  const firstDow    = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const selData = selected ? days[selected] : null;

  return (
    <div className="moon-cal-wrap">

      <div className="moon-cal-nav">
        <button className="moon-nav-btn" onClick={prevMonth}>‹</button>
        <h3 className="moon-cal-month">
          {MONTH_NAMES[month - 1]} {year}
          {loading && <span className="moon-loading-pip" />}
        </h3>
        <button className="moon-nav-btn" onClick={nextMonth}>›</button>
      </div>

      <div className="moon-legend">
        {Object.entries(QUALITY).map(([k, v]) => (
          <div key={k} className="moon-legend-item">
            <span className="moon-legend-dot" style={{ background: v.text }} />
            <span style={{ color: v.text }}>{v.label}</span>
          </div>
        ))}
      </div>

      {error && <div className="moon-error">{error}</div>}

      <div className="moon-grid">
        {DAY_ABBR.map(d => <div key={d} className="moon-dow">{d}</div>)}

        {cells.map((day, idx) => {
          if (!day) return <div key={`e${idx}`} />;
          const ds      = toDateStr(year, month, day);
          const info    = days[ds];
          const cfg     = info ? QUALITY[info.quality] : null;
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
              <span className="moon-day-num" style={isToday ? { color: "var(--accent)", fontWeight: 700 } : undefined}>
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
        <Stat label="Moonrise"     value={fmt12(data.rawRise)} />
        <Stat label="Moonset"      value={fmt12(data.rawSet)}  />
        <Stat label="Illumination" value={`${data.illum}%`}   />
        <Stat label="Phase"        value={data.curphase || "—"} />
      </div>

      <div className="moon-detail-summary" style={{ color: cfg.text }}>
        <span className="moon-quality-badge" style={{ background: cfg.bg, borderColor: cfg.border, color: cfg.text }}>
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
