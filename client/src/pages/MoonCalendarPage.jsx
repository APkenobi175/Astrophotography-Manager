import { useEffect, useState } from "react";
import MoonCalendar from "../assets/MoonCalendar.jsx";

export default function MoonCalendarPage() {
  const [lat,        setLat]        = useState("");
  const [lon,        setLon]        = useState("");
  const [active,     setActive]     = useState(false);
  const [geoStatus,  setGeoStatus]  = useState("idle"); // idle | loading | denied

  // Try browser geolocation on mount
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

      {/* Location form */}
      <div className="moon-coords-card">
        <form className="moon-coords-form" onSubmit={handleSubmit}>
          <div className="moon-coord-field">
            <label htmlFor="mc-lat">Latitude</label>
            <input
              id="mc-lat"
              type="number"
              step="0.0001"
              min="-90"
              max="90"
              placeholder="e.g. 40.7128"
              value={lat}
              onChange={e => { setLat(e.target.value); setActive(false); }}
            />
          </div>
          <div className="moon-coord-field">
            <label htmlFor="mc-lon">Longitude</label>
            <input
              id="mc-lon"
              type="number"
              step="0.0001"
              min="-180"
              max="180"
              placeholder="e.g. -74.0060"
              value={lon}
              onChange={e => { setLon(e.target.value); setActive(false); }}
            />
          </div>
          <button type="submit" disabled={!canSubmit} className="moon-load-btn">
            Load
          </button>
          <button
            type="button"
            className="moon-locate-btn"
            onClick={handleLocate}
            disabled={geoStatus === "loading"}
            title="Use my location"
          >
            {geoStatus === "loading" ? "…" : "📍"}
          </button>
        </form>
        {geoStatus === "loading" && (
          <p className="moon-geo-note">Detecting your location…</p>
        )}
        {geoStatus === "denied" && (
          <p className="moon-geo-note" style={{ color: "var(--text-muted)" }}>
            Location access denied — enter coordinates manually.
          </p>
        )}
      </div>

      {/* Calendar */}
      {active && lat && lon ? (
        <MoonCalendar latitude={parseFloat(lat)} longitude={parseFloat(lon)} />
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
