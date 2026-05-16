import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import EditSessionModal from "../assets/EditSessionModal.jsx";

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop().split(";").shift();
  }
  return null;
}

function HomePage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [title, setTitle] = useState("");
  const [datetimeStart, setDatetimeStart] = useState("");
  const [locationName, setLocationName] = useState("");
  const [lightFrames, setLightFrames] = useState("");
  const [lightExposureSeconds, setLightExposureSeconds] = useState("");
  const [iso, setIso] = useState("");
  const [cameraModel, setCameraModel] = useState("");
  const [telescopeOrLens, setTelescopeOrLens] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [target, setTarget] = useState("");
  const [targetSuggestions, setTargetSuggestions] = useState([]);
  const [targetLoading, setTargetLoading] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(false);
  const [caption, setCaption] = useState("");
  const [imagesFiles, setImagesFiles] = useState([]);

  // Edit/delete state
  const [editingSession, setEditingSession] = useState(null);

  // Fetch the sessions from the server
  async function fetchSessions() {
    try {
      const res = await fetch("/api/sessions/", {
        credentials: "include",
      });

      if (!res.ok) {
        console.error("Failed to fetch sessions", res.status);
        setSessions([]);
        return;
      }

      const body = await res.json();
      setSessions(body.sessions || []);
    } catch (err) {
      console.error("Error fetching sessions:", err);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSessions();
  }, []);
  // Form submission for creating a new session
  async function handleCreateSession(e) {
    e.preventDefault();

    const payload = {
      title,
      target,
      datetimeStart,
      locationName,
      lightFrames: lightFrames ? Number(lightFrames) : 0,
      lightExposureSeconds: lightExposureSeconds
        ? Number(lightExposureSeconds)
        : 0,
      iso: iso ? Number(iso) : null,
      cameraModel,
      telescopeOrLens,
      isPublic,
      caption,
      postCreationDate: new Date().toISOString(),
    };

    try {
      const res = await fetch("/api/sessions/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"), // CSRF Token for django
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        console.error("Failed to create session:", res.status, errBody);
        return;
      }

      // If files were selected, upload them to the session images endpoint
      const created = await res.json();
      if (imagesFiles && imagesFiles.length > 0 && created && created.id) {
        const form = new FormData();
        for (let i = 0; i < imagesFiles.length && i < 3; i++) {
          form.append("images", imagesFiles[i]);
        }

        try {
          const upRes = await fetch(`/api/sessions/${created.id}/images/`, {
            method: "POST",
            credentials: "include",
            headers: {
              "X-CSRFToken": getCookie("csrftoken"),
            },
            body: form,
          });

          if (!upRes.ok) {
            console.error("Image upload failed", upRes.status);
          }
        } catch (err) {
          console.error("Error uploading images:", err);
        }
      }

      await fetchSessions();

      setTitle("");
      setTarget("");
      setDatetimeStart("");
      setLocationName("");
      setLightFrames("");
      setLightExposureSeconds("");
      setIso("");
      setCameraModel("");
      setTelescopeOrLens("");
      setIsPublic(false);
      setImagesFiles([]);
    } catch (err) {
      console.error("Error creating session:", err);
    }
  }

  async function handleDeleteSession(sessionId) {
    if (!window.confirm("Delete this session? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/sessions/${sessionId}/`, {
        method: "DELETE",
        credentials: "include",
        headers: { "X-CSRFToken": getCookie("csrftoken") },
      });
      if (!res.ok) {
        console.error("Delete failed", res.status);
        return;
      }
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (err) {
      console.error("Error deleting session:", err);
    }
  }

  async function handleSaveEdit(sessionId, payload) {
    const res = await fetch(`/api/sessions/${sessionId}/`, {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCookie("csrftoken"),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Save failed");
    }
    const updated = await res.json();
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, ...updated } : s));
    setEditingSession(null);
  }

  // The logic for target auto complete using the astronomy API
  // https://astronomyapi.com/
  useEffect(() => {
  if (!target || target.length < 2) {
    setTargetSuggestions([]);
    return;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(async () => {
    setTargetLoading(true);
    try {
      const res = await fetch(
        `/api/targets/search/?q=${encodeURIComponent(target)}`,
        {
          credentials: "include",
          signal: controller.signal,
        }
      );

      if (!res.ok) {
        setTargetSuggestions([]);
        return;
      }

      const body = await res.json();
      setTargetSuggestions(body.results || []);
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Target search failed:", err);
      }
      setTargetSuggestions([]);
    } finally {
      setTargetLoading(false);
    }
  }, 300); // 300ms debounce timer 

  return () => {
    clearTimeout(timeoutId);
    controller.abort();
  };
}, [target]);

async function handleTargetChange(e) {
  const value = e.target.value;
  setTarget(value);
  setSelectedSuggestion(false);

  if (value.length < 2) {
    setTargetSuggestions([]);
    return;
  }

  const res = await fetch(
    `/api/targets/search/?q=${encodeURIComponent(value)}`,
    { credentials: "same-origin" }
  );
  if (!res.ok) return;

  const data = await res.json();
  setTargetSuggestions(data.results || []);
}

function handleSelectSuggestion(suggestion) {
  // This is the exact text that will go into the DB as `target`
  setTarget(suggestion.display);  // e.g. "M42 - Orion Nebula"
  setTargetSuggestions([]);       // hide the dropdown
  setSelectedSuggestion(true);
}

  return (
    <>
      <section className="new-session-section">
        <h2>New Session</h2>
        <form onSubmit={handleCreateSession} className="new-session-form">
          <label>
            Title
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </label>


            <input
              type="text"
              value={target}
              onChange={handleTargetChange}
              placeholder="Target (e.g. M42, Andromeda)"
            />

            {targetSuggestions.length > 0 && (
              <ul className="target-suggestions">
                {targetSuggestions.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectSuggestion(s)}
                    >
                      {s.display}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {target && !targetLoading && targetSuggestions.length === 0 && target.length >= 2 && !selectedSuggestion && (
              <div className="suggestion-status">No results found</div>
            )}





          <label>
            Start Date & Time
            <input
              type="datetime-local"
              value={datetimeStart}
              onChange={e => setDatetimeStart(e.target.value)}
              required
            />
          </label>

          <label>
            Location
            <input
              type="text"
              value={locationName}
              onChange={e => setLocationName(e.target.value)}
              required
            />
          </label>

          <label>
            Light Frames
            <input
              type="number"
              min="0"
              value={lightFrames}
              onChange={e => setLightFrames(e.target.value)}
            />
          </label>

          <label>
            Exposure per Light (seconds)
            <input
              type="number"
              min="0"
              step="1"
              value={lightExposureSeconds}
              onChange={e => setLightExposureSeconds(e.target.value)}
            />
          </label>

          <label>
            ISO
            <input
              type="number"
              min="0"
              value={iso}
              onChange={e => setIso(e.target.value)}
            />
          </label>

          <label>
            Camera Model
            <input
              type="text"
              value={cameraModel}
              onChange={e => setCameraModel(e.target.value)}
              required
            />
          </label>

          <label>
            Telescope / Lens
            <input
              type="text"
              value={telescopeOrLens}
              onChange={e => setTelescopeOrLens(e.target.value)}
              required
            />
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={e => setIsPublic(e.target.checked)}
            />
            Make this session public
          </label>


          <label className="form-field">
            Caption
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Enter a caption or description for your session... (Other users will see this if you make the session public)"
              rows={3}
            />
          </label>

          <label className="form-field">
            Photos (optional, up to 3)
            <input
              type="file"
              accept=".jpg,.jpeg,.png"
              multiple
              onChange={(e) => setImagesFiles(Array.from(e.target.files))}
            />
          </label>


          <button type="submit">Save Session</button>
        </form>
      </section>

      <section className="sessions-list-section">
        <h2>My Sessions</h2>
        {loading ? (
          <p>Loading sessions…</p>
        ) : sessions.length === 0 ? (
          <p>No sessions yet.</p>
        ) : (
          <ul className="my-sessions-list">
            {sessions.map(s => (
              <li key={s.id} className="my-session-row">
                {s.images && s.images.length > 0 ? (
                  <img src={s.images[0]} alt="session" className="my-session-thumb" />
                ) : (
                  <div className="my-session-thumb no-image">No image</div>
                )}
                <Link to={`/sessions/${s.id}`} className="my-session-title">
                  {s.title}
                </Link>
                <span className="my-session-caption">{s.caption}</span>
                <div className="my-session-actions">
                  <button
                    className="session-action-btn edit-btn"
                    onClick={() => setEditingSession(s)}
                  >
                    Edit
                  </button>
                  <button
                    className="session-action-btn delete-btn"
                    onClick={() => handleDeleteSession(s.id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editingSession && (
        <EditSessionModal
          session={editingSession}
          onSave={handleSaveEdit}
          onClose={() => setEditingSession(null)}
        />
      )}
    </>
  );
}

export default HomePage;
