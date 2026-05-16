import { useEffect, useRef, useState } from "react";
import { getCookie } from "./csrfhelper.js";

export default function CreateSessionModal({ onClose, onCreated }) {
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [targetSuggestions, setTargetSuggestions] = useState([]);
  const [targetLoading, setTargetLoading] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(false);
  const [datetimeStart, setDatetimeStart] = useState("");
  const [locationName, setLocationName] = useState("");
  const [lightFrames, setLightFrames] = useState("");
  const [lightExposureSeconds, setLightExposureSeconds] = useState("");
  const [iso, setIso] = useState("");
  const [cameraModel, setCameraModel] = useState("");
  const [telescopeOrLens, setTelescopeOrLens] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [caption, setCaption] = useState("");
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  // Target autocomplete
  useEffect(() => {
    if (!target || target.length < 2 || selectedSuggestion) {
      setTargetSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const t = setTimeout(async () => {
      setTargetLoading(true);
      try {
        const res = await fetch(`/api/targets/search/?q=${encodeURIComponent(target)}`, {
          credentials: "include",
          signal: controller.signal,
        });
        if (res.ok) {
          const body = await res.json();
          setTargetSuggestions(body.results || []);
        }
      } catch (e) {
        if (e.name !== "AbortError") console.error(e);
      } finally {
        setTargetLoading(false);
      }
    }, 300);
    return () => { clearTimeout(t); controller.abort(); };
  }, [target, selectedSuggestion]);

  function handleSelectSuggestion(s) {
    setTarget(s.display);
    setTargetSuggestions([]);
    setSelectedSuggestion(true);
  }

  function handleFileChange(e) {
    const files = Array.from(e.target.files);
    const slots = 10 - imageFiles.length;
    const picked = files.slice(0, slots);
    setImageFiles(prev => [...prev, ...picked]);
    setImagePreviews(prev => [...prev, ...picked.map(f => URL.createObjectURL(f))]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removePreview(idx) {
    URL.revokeObjectURL(imagePreviews[idx]);
    setImageFiles(prev => prev.filter((_, i) => i !== idx));
    setImagePreviews(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/sessions/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCookie("csrftoken") },
        body: JSON.stringify({
          title, target, datetimeStart, locationName,
          lightFrames: lightFrames ? Number(lightFrames) : 0,
          lightExposureSeconds: lightExposureSeconds ? Number(lightExposureSeconds) : 0,
          iso: iso ? Number(iso) : null,
          cameraModel, telescopeOrLens, isPublic, caption,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create session");
      }
      const created = await res.json();

      if (imageFiles.length > 0 && created.id) {
        const form = new FormData();
        imageFiles.forEach(f => form.append("images", f));
        const upRes = await fetch(`/api/sessions/${created.id}/images/`, {
          method: "POST",
          credentials: "include",
          headers: { "X-CSRFToken": getCookie("csrftoken") },
          body: form,
        });
        if (!upRes.ok) {
          const upErr = await upRes.json().catch(() => ({}));
          throw new Error(upErr.error || "Image upload failed");
        }
      }

      onCreated?.();
      onClose();
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box create-modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New Session</h2>
          <button type="button" className="modal-x-btn" onClick={onClose}>✕</button>
        </div>

        {error && <p className="modal-error">{error}</p>}

        <form onSubmit={handleSubmit} className="new-session-form">
          <label>Title<input type="text" value={title} onChange={e => setTitle(e.target.value)} required /></label>

          <div style={{ gridColumn: "1 / -1", position: "relative" }}>
            <label style={{ display:"flex", flexDirection:"column", fontSize:"0.8rem", fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.03em" }}>
              Target
              <input
                type="text"
                value={target}
                onChange={e => { setTarget(e.target.value); setSelectedSuggestion(false); }}
                placeholder="e.g. M42, Andromeda"
              />
            </label>
            {targetSuggestions.length > 0 && (
              <ul className="target-suggestions">
                {targetSuggestions.map(s => (
                  <li key={s.id}><button type="button" onClick={() => handleSelectSuggestion(s)}>{s.display}</button></li>
                ))}
              </ul>
            )}
            {target && !targetLoading && targetSuggestions.length === 0 && target.length >= 2 && !selectedSuggestion && (
              <div className="suggestion-status">No results found</div>
            )}
          </div>

          <label>Start Date &amp; Time<input type="datetime-local" value={datetimeStart} onChange={e => setDatetimeStart(e.target.value)} required /></label>
          <label>Location<input type="text" value={locationName} onChange={e => setLocationName(e.target.value)} required /></label>
          <label>Light Frames<input type="number" min="0" value={lightFrames} onChange={e => setLightFrames(e.target.value)} /></label>
          <label>Exposure per Light (s)<input type="number" min="0" value={lightExposureSeconds} onChange={e => setLightExposureSeconds(e.target.value)} /></label>
          <label>ISO<input type="number" min="0" value={iso} onChange={e => setIso(e.target.value)} /></label>
          <label>Camera Model<input type="text" value={cameraModel} onChange={e => setCameraModel(e.target.value)} required /></label>
          <label>Telescope / Lens<input type="text" value={telescopeOrLens} onChange={e => setTelescopeOrLens(e.target.value)} required /></label>

          <label className="checkbox-row">
            <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
            Make this session public
          </label>

          <label className="form-field">
            Caption
            <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={3} placeholder="What did you observe? Any notes?" />
          </label>

          {/* Image picker */}
          <div className="modal-images-section">
            <div className="modal-images-label">
              Photos <span className="modal-images-count">{imageFiles.length} / 10</span>
            </div>
            <div className="modal-images-row">
              {imagePreviews.map((url, idx) => (
                <div key={url} className="modal-img-thumb-wrap modal-img-new">
                  <img src={url} alt="preview" className="modal-img-thumb" />
                  <button type="button" className="modal-img-remove" onClick={() => removePreview(idx)}>×</button>
                </div>
              ))}
              {imageFiles.length < 10 && (
                <button type="button" className="modal-img-add-btn" onClick={() => fileInputRef.current?.click()}>
                  + Add Photo
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png" multiple style={{ display: "none" }} onChange={handleFileChange} />
            <p className="modal-images-hint">JPG or PNG, max 50 MB each, up to 10 total.</p>
          </div>

          <div className="modal-actions">
            <button type="submit" disabled={submitting}>{submitting ? "Creating…" : "Create Session"}</button>
            <button type="button" onClick={onClose} disabled={submitting}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
