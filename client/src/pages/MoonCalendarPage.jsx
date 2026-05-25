import { useEffect, useState } from "react";
import MoonCalendar from "../assets/MoonCalendar.jsx";

const START_OPTIONS = [
  { value: 19, label: "7 PM"  },
  { value: 20, label: "8 PM"  },
  { value: 21, label: "9 PM"  },
  { value: 22, label: "10 PM" },
  { value: 23, label: "11 PM" },
];

const END_OPTIONS = [
  { value: 0, label: "Midnight" },
  { value: 1, label: "1 AM"    },
  { value: 2, label: "2 AM"    },
  { value: 3, label: "3 AM"    },
  { value: 4, label: "4 AM"    },
  { value: 5, label: "5 AM"    },
  { value: 6, label: "6 AM"    },
  { value: 7, label: "7 AM"    },
];

function loadPref(key, fallback) {
  const v = localStorage.getItem(key);
  return v !== null ? Number(v) : fallback;
}

export default function MoonCalendarPage() {
  const [lat,       setLat]       = useState("");
  const [lon,       setLon]       = useState("");
  const [active,    setActive]    = useState(false);
  const [geoStatus, setGeoStatus] = useState("idle");

  const [imgStart, setImgStart] = useState(() => loadPref("moon_img_start", 22));
  const [imgEnd,   setImgEnd]   = useState(() => loadPref("moon_img_end",   4));

  // Persist window prefs
  useEffect(() => { localStorage.setItem("moon_img_start", imgStart); }, [imgStart]);
  useEffect(() => { localStorage.setItem("moon_img_end",   imgEnd);   }, [imgEnd]);

  // Try geolocation on mount
  useEffect(() => {
    if (!navigator.geolocation) return;
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLat(pos.coords.latitude.toFixed(4));
        setLon(pos.coords.longitude.toFixed(4));
        setActive(true);
        setGeoStatus("idle");
      },
      () => setGeoStatus("denied"),
      { timeout: 8000 }
    );
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (lat && lon) setActive(true);
  }

  function handleLocate() {
    if (!navigator.geolocation) return;
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLat(pos.coords.latitude.toFixed(4));
        setLon(pos.coords.longitude.toFixed(4));
        setActive(true);
        setGeoStatus("idle");
      },
      () => setGeoStatus("denied"),
      { timeout: 8000 }
    );
  }

  const canSubmit = lat !== "" && lon !== "" && geoStatus !== "loading";

  return (
    <div className="moon-page">
      <div className="page-heading">
        <h2 style={{ margin: "0 0 4px" }}>Moon Phase Calendar</h2>
        <p className="page-subheading">Plan imaging sessions around lunar conditions</p>
      </div>

      <div className="moon-coords-card">
        {/* Location row */}
        <form className="moon-coords-form" onSubmit={handleSubmit}>
          <div className="moon-coord-field">
            <label htmlFor="mc-lat">Latitude</label>
            <input
              id="mc-lat"
              type="number" step="0.0001" min="-90" max="90"
              placeholder="e.g. 40.7128"
              value={lat}
              onChange={e => { setLat(e.target.value); setActive(false); }}
            />
          </div>
          <div className="moon-coord-field">
            <label htmlFor="mc-lon">Longitude</label>
            <input
              id="mc-lon"
              type="number" step="0.0001" min="-180" max="180"
              placeholder="e.g. -74.0060"
              value={lon}
              onChange={e => { setLon(e.target.value); setActive(false); }}
            />
          </div>
          <button type="submit" disabled={!canSubmit} className="moon-load-btn">Load</button>
          <button
            type="button" className="moon-locate-btn"
            onClick={handleLocate} disabled={geoStatus === "loading"}
            title="Use my location"
          >
            {geoStatus === "loading" ? "…" : "📍"}
          </button>
        </form>

        {/* Imaging window row */}
        <div className="moon-window-row">
          <span className="moon-window-label">Imaging window</span>
          <select
            className="moon-window-select"
            value={imgStart}
            onChange={e => setImgStart(Number(e.target.value))}
          >
            {START_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <span className="moon-window-sep">to</span>
          <select
            className="moon-window-select"
            value={imgEnd}
            onChange={e => setImgEnd(Number(e.target.value))}
          >
            {END_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {geoStatus === "loading" && <p className="moon-geo-note">Detecting your location…</p>}
        {geoStatus === "denied"  && <p className="moon-geo-note" style={{ color: "var(--text-muted)" }}>Location access denied — enter coordinates manually.</p>}
      </div>

      {active && lat && lon ? (
        <MoonCalendar
          latitude={parseFloat(lat)}
          longitude={parseFloat(lon)}
          imagingStart={imgStart}
          imagingEnd={imgEnd}
        />
      ) : (
        !active && geoStatus === "idle" && (
          <div className="empty-state">
            <div className="empty-icon">🌙</div>
            <p>Enter your coordinates or allow location access to see your moon calendar.</p>
          </div>
        )
      )}
    </div>
  );
}
