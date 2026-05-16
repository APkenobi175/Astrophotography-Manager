import { Link } from "react-router-dom";
import { timeAgo } from "../assets/timeago.js";
import { useEffect, useState } from "react";
import { getCookie } from "../assets/csrfhelper.js";

// ── Lightbox ──────────────────────────────────────────────────────────────────
function Lightbox({ images, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex);
  const total = images.length;

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIdx(i => Math.min(i + 1, total - 1));
      if (e.key === "ArrowLeft")  setIdx(i => Math.max(i - 1, 0));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [total, onClose]);

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <button className="lightbox-close" onClick={onClose}>✕</button>

      {idx > 0 && (
        <button className="lightbox-arrow lightbox-prev" onClick={e => { e.stopPropagation(); setIdx(i => i - 1); }}>‹</button>
      )}

      <img
        className="lightbox-img"
        src={images[idx]}
        alt={`photo ${idx + 1}`}
        onClick={e => e.stopPropagation()}
      />

      {idx < total - 1 && (
        <button className="lightbox-arrow lightbox-next" onClick={e => { e.stopPropagation(); setIdx(i => i + 1); }}>›</button>
      )}

      <div className="lightbox-counter">{idx + 1} / {total}</div>
    </div>
  );
}

// ── Image Grid ────────────────────────────────────────────────────────────────
function ImageGrid({ images }) {
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const count = images.length;
  if (count === 0) return null;

  // Displayed tiles: up to 4, the 4th shows overflow count if there are more
  const shown = images.slice(0, Math.min(count, 4));
  const extra = count > 4 ? count - 4 : 0;

  return (
    <>
      <div className={`img-grid img-grid-${Math.min(count, 4)}`}>
        {shown.map((url, i) => (
          <div
            key={url + i}
            className="img-grid-item"
            onClick={() => setLightboxIdx(extra > 0 && i === 3 ? 3 : i)}
          >
            <img src={url} alt={`photo ${i + 1}`} className="img-grid-photo" />
            {extra > 0 && i === 3 && (
              <div className="img-grid-more">+{extra}</div>
            )}
          </div>
        ))}
      </div>

      {lightboxIdx !== null && (
        <Lightbox images={images} startIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}
    </>
  );
}

// ── SessionDiv ────────────────────────────────────────────────────────────────
export default function SessionDiv({ session }) {
  const fullName = session.ownerName || "";
  const username = session.ownerUsername || "anonymous";
  const profilePic = session.ownerProfilePicture || null;
  const initial = ((fullName.split(" ")[0] || "")[0] || username[0] || "?").toUpperCase();

  const postedAgo = timeAgo(session.postCreationDate);
  const postedExact = session.postCreationDate ? new Date(session.postCreationDate).toLocaleString() : "";

  const [likeCount, setLikeCount] = useState(session.likeCount || 0);
  const [liked, setLiked]         = useState(session.likedByCurrentUser || false);
  const [likeBusy, setLikeBusy]   = useState(false);

  async function toggleLike() {
    if (likeBusy) return;
    setLikeBusy(true);
    try {
      const res = await fetch(`/api/sessions/${session.id}/like/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCookie("csrftoken") },
      });
      if (!res.ok) return;
      const body = await res.json();
      setLiked(body.liked);
      setLikeCount(body.likeCount);
    } catch (err) {
      console.error("Error toggling like:", err);
    } finally {
      setLikeBusy(false);
    }
  }

  return (
    <div className="session-div">
      {/* HEADER */}
      <div className="session-div-header-bar">
        <Link to={`/profile/${username}`} className="session-div-user session-div-user-link">
          <div className="avatar-circle">
            {profilePic
              ? <img src={profilePic} alt={username} className="avatar-circle-img" />
              : initial}
          </div>
          <div className="user-text">
            <div className="username">{fullName || username}</div>
            <div className="real-name">@{username}</div>
          </div>
        </Link>

        <div className="header-right">
          {postedAgo && <div className="posted-time" title={postedExact}>{postedAgo}</div>}
          <button
            type="button"
            className={`like-button ${liked ? "liked" : ""}`}
            onClick={toggleLike}
            disabled={likeBusy}
          >
            <span className="heart-icon">♡</span>
            <span className="like-count">{likeCount}</span>
          </button>
        </div>
      </div>

      {/* TITLE / TARGET */}
      <div className="session-div-title-block">
        <Link to={`/sessions/${session.id}`} className="session-card-title">
          {session.title || session.target}
        </Link>
        <div className="session-card-target">{session.target}</div>
      </div>

      {/* CAPTION */}
      {session.caption && <p className="session-div-caption">{session.caption}</p>}

      {/* IMAGES */}
      {session.images && session.images.length > 0 && (
        <ImageGrid images={session.images} />
      )}

      {/* STATS */}
      <div className="session-div-stats-grid">
        <div className="stat"><div className="stat-label">Location</div><div className="stat-value">{session.locationName}</div></div>
        <div className="stat"><div className="stat-label">Start</div><div className="stat-value">{new Date(session.datetimeStart).toLocaleString()}</div></div>
        <div className="stat"><div className="stat-label">Lights</div><div className="stat-value">{session.lightFrames} × {session.lightExposureSeconds}s</div></div>
        <div className="stat"><div className="stat-label">Integration</div><div className="stat-value">{session.totalIntegrationSeconds}s</div></div>
        {session.iso && <div className="stat"><div className="stat-label">ISO</div><div className="stat-value">ISO {session.iso}</div></div>}
        <div className="stat"><div className="stat-label">Camera</div><div className="stat-value">{session.cameraModel}</div></div>
        <div className="stat"><div className="stat-label">Optics</div><div className="stat-value">{session.telescopeOrLens}</div></div>
      </div>
    </div>
  );
}
