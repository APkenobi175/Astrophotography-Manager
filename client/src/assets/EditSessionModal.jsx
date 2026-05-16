import { useState } from "react";

export default function EditSessionModal({ session, onSave, onClose }) {
  const [title, setTitle] = useState(session.title || "");
  const [target, setTarget] = useState(session.target || "");
  const [datetimeStart, setDatetimeStart] = useState(
    session.datetimeStart ? session.datetimeStart.slice(0, 16) : ""
  );
  const [locationName, setLocationName] = useState(session.locationName || "");
  const [lightFrames, setLightFrames] = useState(session.lightFrames ?? "");
  const [lightExposureSeconds, setLightExposureSeconds] = useState(session.lightExposureSeconds ?? "");
  const [iso, setIso] = useState(session.iso ?? "");
  const [cameraModel, setCameraModel] = useState(session.cameraModel || "");
  const [telescopeOrLens, setTelescopeOrLens] = useState(session.telescopeOrLens || "");
  const [isPublic, setIsPublic] = useState(session.isPublic || false);
  const [caption, setCaption] = useState(session.caption || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave(session.id, {
        title,
        target,
        datetimeStart,
        locationName,
        lightFrames: lightFrames !== "" ? Number(lightFrames) : 0,
        lightExposureSeconds: lightExposureSeconds !== "" ? Number(lightExposureSeconds) : 0,
        iso: iso !== "" ? Number(iso) : null,
        cameraModel,
        telescopeOrLens,
        isPublic,
        caption,
      });
    } catch (err) {
      setError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h2>Edit Session</h2>
        {error && <p className="modal-error">{error}</p>}
        <form onSubmit={handleSubmit} className="new-session-form">
          <label>
            Title
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required />
          </label>
          <label>
            Target
            <input type="text" value={target} onChange={e => setTarget(e.target.value)} required />
          </label>
          <label>
            Start Date &amp; Time
            <input
              type="datetime-local"
              value={datetimeStart}
              onChange={e => setDatetimeStart(e.target.value)}
              required
            />
          </label>
          <label>
            Location
            <input type="text" value={locationName} onChange={e => setLocationName(e.target.value)} required />
          </label>
          <label>
            Light Frames
            <input type="number" min="0" value={lightFrames} onChange={e => setLightFrames(e.target.value)} />
          </label>
          <label>
            Exposure per Light (seconds)
            <input type="number" min="0" value={lightExposureSeconds} onChange={e => setLightExposureSeconds(e.target.value)} />
          </label>
          <label>
            ISO
            <input type="number" min="0" value={iso} onChange={e => setIso(e.target.value)} />
          </label>
          <label>
            Camera Model
            <input type="text" value={cameraModel} onChange={e => setCameraModel(e.target.value)} required />
          </label>
          <label>
            Telescope / Lens
            <input type="text" value={telescopeOrLens} onChange={e => setTelescopeOrLens(e.target.value)} required />
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
            Make this session public
          </label>
          <label className="form-field">
            Caption
            <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={3} />
          </label>
          <div className="modal-actions">
            <button type="submit" disabled={saving}>{saving ? "Saving…" : "Save Changes"}</button>
            <button type="button" onClick={onClose} disabled={saving}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
