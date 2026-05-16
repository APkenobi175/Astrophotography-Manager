import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { getCookie } from "../assets/csrfhelper.js";
import SessionDiv from "../assets/sessiondiv.jsx";

export default function ProfilePage() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingBio, setEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState("");
  const [savingBio, setSavingBio] = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [picError, setPicError] = useState("");
  const fileInputRef = useRef(null);

  async function fetchProfile() {
    setLoading(true);
    try {
      const res = await fetch(`/api/profile/${username}/`, { credentials: "include" });
      if (!res.ok) { setProfile(null); return; }
      const body = await res.json();
      setProfile(body);
      setBioInput(body.bio || "");
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProfile();
  }, [username]);

  async function handleSaveBio() {
    setSavingBio(true);
    try {
      const res = await fetch(`/api/profile/${username}/`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCookie("csrftoken") },
        body: JSON.stringify({ bio: bioInput }),
      });
      if (res.ok) {
        const body = await res.json();
        setProfile(prev => ({ ...prev, bio: body.bio }));
        setEditingBio(false);
      }
    } finally {
      setSavingBio(false);
    }
  }

  async function handlePictureChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPicError("");
    setUploadingPic(true);
    const form = new FormData();
    form.append("picture", file);
    try {
      const res = await fetch(`/api/profile/${username}/picture/`, {
        method: "POST",
        credentials: "include",
        headers: { "X-CSRFToken": getCookie("csrftoken") },
        body: form,
      });
      if (res.ok) {
        const body = await res.json();
        setProfile(prev => ({ ...prev, profilePicture: body.profilePicture }));
      } else {
        const err = await res.json().catch(() => ({}));
        setPicError(err.error || "Upload failed");
      }
    } catch {
      setPicError("Upload failed");
    } finally {
      setUploadingPic(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (loading) return <p style={{ padding: "1rem" }}>Loading profile…</p>;
  if (!profile) return <p style={{ padding: "1rem" }}>Profile not found.</p>;

  const displayName = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.username;
  const initial = (profile.firstName?.[0] || profile.username?.[0] || "?").toUpperCase();

  return (
    <div className="profile-page">
      {/* Profile header card */}
      <div className="profile-header-card">
        <div className="profile-avatar-wrap">
          {profile.profilePicture ? (
            <img src={profile.profilePicture} className="profile-pic" alt={`${profile.username} avatar`} />
          ) : (
            <div className="profile-pic-placeholder">{initial}</div>
          )}
          {profile.isOwnProfile && (
            <>
              <button
                className="change-pic-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPic}
              >
                {uploadingPic ? "Uploading…" : "Change Photo"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png"
                style={{ display: "none" }}
                onChange={handlePictureChange}
              />
            </>
          )}
          {picError && <p className="pic-error">{picError}</p>}
        </div>

        <div className="profile-info">
          <h2 className="profile-display-name">{displayName}</h2>
          <div className="profile-username">@{profile.username}</div>

          {!profile.isOwnProfile && (
            <button
              className="message-btn"
              onClick={() => window.__openChat?.(profile.username)}
            >
              Message
            </button>
          )}

          {editingBio ? (
            <div className="profile-bio-edit">
              <textarea
                value={bioInput}
                onChange={e => setBioInput(e.target.value)}
                rows={3}
                placeholder="Write something about yourself…"
                className="profile-bio-textarea"
              />
              <div className="profile-bio-actions">
                <button onClick={handleSaveBio} disabled={savingBio}>
                  {savingBio ? "Saving…" : "Save"}
                </button>
                <button
                  className="cancel-btn"
                  onClick={() => { setEditingBio(false); setBioInput(profile.bio || ""); }}
                  disabled={savingBio}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="profile-bio-view">
              <p className="profile-bio-text">
                {profile.bio || (profile.isOwnProfile ? "No bio yet — add one!" : "")}
              </p>
              {profile.isOwnProfile && (
                <button className="edit-bio-btn" onClick={() => setEditingBio(true)}>
                  {profile.bio ? "Edit Bio" : "Add Bio"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sessions */}
      <div className="profile-sessions-section">
        <h3 className="profile-sessions-heading">
          {profile.isOwnProfile ? "All My Sessions" : `${profile.username}'s Public Sessions`}
          <span className="session-count">{profile.sessions.length}</span>
        </h3>

        {profile.sessions.length === 0 ? (
          <p className="no-sessions-msg">
            {profile.isOwnProfile ? "You have no sessions yet." : "No public sessions."}
          </p>
        ) : (
          <div className="session-div-grid">
            {profile.sessions.map(s => (
              <SessionDiv key={s.id} session={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
