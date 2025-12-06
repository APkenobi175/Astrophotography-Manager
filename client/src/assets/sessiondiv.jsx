{/* This file defines a react componenet that displays a single "Post" or "Session" in our app */}

import { Link } from "react-router-dom";
import { timeAgo } from "../assets/timeago.js";
import { useState } from "react";
import { getCookie } from "../assets/csrfhelper.js";

export default function SessionDiv({ session }) {
  const fullName = session.ownerName || "";
  const username = session.ownerUsername || "anonymous";
  // Use the first letter of the first name for the avatar initial when available, if I ever implement the profile section i would like to add profile pictures, but for now this will do
  const firstNameInitial = fullName ? (fullName.split(" ")[0] || "")[0] : null;
  const initial = (firstNameInitial || username[0] || "?").toUpperCase();

  const postedAgo = timeAgo(session.postCreationDate);
  const postedExact = session.postCreationDate
    ? new Date(session.postCreationDate).toLocaleString()
    : "";

  const [likeCount, setLikeCount] = useState(session.likeCount || 0);
  const [liked, setLiked] = useState(session.likedByCurrentUser || false);
  const [likeBusy, setLikeBusy] = useState(false);

  async function toggleLike() {
    if (likeBusy) return; // prevent multiple clicks
    setLikeBusy(true);
    
    try {
        const res = await fetch(`/api/sessions/${session.id}/like/`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken'),
            },
        });

        if (!res.ok) {
          console.error("Failed to toggle like", res.status);
          return;
        }

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
      {/* HEADER STRIP */}
      <div className="session-div-header-bar">
        <div className="session-div-user">
          <div className="avatar-circle">{initial}</div>
          <div className="user-text">
            <div className="username">{fullName || username}</div>
            {username && (
              <div className="real-name">@{username}</div>
            )}
          </div>
        </div>

        <div className="header-right">
          {postedAgo && (
            <div className="posted-time" title={postedExact}>
              {postedAgo}
            </div>
          )}
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
      {session.caption && (
        <p className="session-div-caption">{session.caption}</p>
      )}

          {/* IMAGES */}
          {session.images && session.images.length > 0 && (
            <div className="session-images-row">
              {session.images.slice(0, 3).map((img, idx) => (
                <Link key={img} to={`/sessions/${session.id}`}>
                  <img
                    src={img}
                    alt={`session-${session.id}-${idx}`}
                    className={`session-thumb ${idx === 0 ? 'session-thumb-main' : 'session-thumb-small'}`}
                  />
                </Link>
              ))}
            </div>
          )}

      {/* STATS GRID */}
      <div className="session-div-stats-grid">
        <div className="stat">
          <div className="stat-label">Location</div>
          <div className="stat-value">{session.locationName}</div>
        </div>

        <div className="stat">
          <div className="stat-label">Start</div>
          <div className="stat-value">
            {new Date(session.datetimeStart).toLocaleString()}
          </div>
        </div>

        <div className="stat">
          <div className="stat-label">Lights</div>
          <div className="stat-value">
            {session.lightFrames} X {session.lightExposureSeconds}s
          </div>
        </div>

        <div className="stat">
          <div className="stat-label">Integration</div>
          <div className="stat-value">
            {session.totalIntegrationSeconds}s total
          </div>
        </div>

        {session.iso && (
          <div className="stat">
            <div className="stat-label">ISO</div>
            <div className="stat-value">ISO {session.iso}</div>
          </div>
        )}

        <div className="stat">
          <div className="stat-label">Camera</div>
          <div className="stat-value">{session.cameraModel}</div>
        </div>

        <div className="stat">
          <div className="stat-label">Optics</div>
          <div className="stat-value">{session.telescopeOrLens}</div>
        </div>
      </div>
    </div>
  );
}
