import { useRef, useState } from "react";
import { getCookie } from "./csrfhelper.js";

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

  // Image state — use imageObjects if available (includes IDs), fall back to URL-only
  const initialImages = (session.imageObjects || []).length > 0
    ? session.imageObjects
    : (session.images || []).map((url, i) => ({ id: null, url }));

  const [existingImages, setExistingImages] = useState(initialImages);
  const [removedIds, setRemovedIds] = useState([]);   // IDs queued for deletion
  const [newFiles, setNewFiles] = useState([]);        // File objects to upload
  const [newPreviews, setNewPreviews] = useState([]);  // Object URLs for preview
  const fileInputRef = useRef(null);

  const totalCount = existingImages.length + newFiles.length;
  const canAddMore = totalCount < 3;

  function handleRemoveExisting(img) {
    setExistingImages(prev => prev.filter(i => i !== img));
    if (img.id) setRemovedIds(prev => [...prev, img.id]);
  }

  function handleFileChange(e) {
    const files = Array.from(e.target.files);
    const slots = 3 - existingImages.length - newFiles.length;
    const picked = files.slice(0, slots);
    setNewFiles(prev => [...prev, ...picked]);
    setNewPreviews(prev => [...prev, ...picked.map(f => URL.createObjectURL(f))]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleRemoveNew(idx) {
    URL.revokeObjectURL(newPreviews[idx]);
    setNewFiles(prev => prev.filter((_, i) => i !== idx));
    setNewPreviews(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      // 1. Save metadata
      await onSave(session.id, {
        title, target, datetimeStart, locationName,
        lightFrames: lightFrames !== "" ? Number(lightFrames) : 0,
        lightExposureSeconds: lightExposureSeconds !== "" ? Number(lightExposureSeconds) : 0,
        iso: iso !== "" ? Number(iso) : null,
        cameraModel, telescopeOrLens, isPublic, caption,
      });

      // 2. Delete removed images
      for (const id of removedIds) {
        await fetch(`/api/sessions/${session.id}/images/${id}/`, {
          method: "DELETE",
          credentials: "include",
          headers: { "X-CSRFToken": getCookie("csrftoken") },
        });
      }

      // 3. Upload new images
      if (newFiles.length > 0) {
        const form = new FormData();
        newFiles.forEach(f => form.append("images", f));
        await fetch(`/api/sessions/${session.id}/images/`, {
          method: "POST",
          credentials: "include",
          headers: { "X-CSRFToken": getCookie("csrftoken") },
          body: form,
        });
      }

      // All done — close modal (parent will refresh sessions)
      onClose();
    } catch (err) {
      setError(err.message || "Save failed");
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
            <input type="datetime-local" value={datetimeStart} onChange={e => setDatetimeStart(e.target.value)} required />
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

          {/* Image management — full width */}
          <div className="modal-images-section">
            <div className="modal-images-label">
              Photos
              <span className="modal-images-count">{totalCount} / 3</span>
            </div>

            <div className="modal-images-row">
              {/* Existing images */}
              {existingImages.map(img => (
                <div key={img.url} className="modal-img-thumb-wrap">
                  <img src={img.url} alt="session" className="modal-img-thumb" />
                  <button
                    type="button"
                    className="modal-img-remove"
                    onClick={() => handleRemoveExisting(img)}
                    title="Remove image"
                  >×</button>
                </div>
              ))}

              {/* New image previews */}
              {newPreviews.map((url, idx) => (
                <div key={url} className="modal-img-thumb-wrap modal-img-new">
                  <img src={url} alt="new" className="modal-img-thumb" />
                  <button
                    type="button"
                    className="modal-img-remove"
                    onClick={() => handleRemoveNew(idx)}
                    title="Remove image"
                  >×</button>
                </div>
              ))}

              {/* Add button */}
              {canAddMore && (
                <button
                  type="button"
                  className="modal-img-add-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  + Add Photo
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png"
              multiple
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            <p className="modal-images-hint">JPG or PNG, max 50 MB each, up to 3 total.</p>
          </div>

          <div className="modal-actions">
            <button type="submit" disabled={saving}>{saving ? "Saving…" : "Save Changes"}</button>
            <button type="button" onClick={onClose} disabled={saving}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
