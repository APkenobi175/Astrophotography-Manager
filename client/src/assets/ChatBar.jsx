import { useEffect, useState } from "react";
import ChatWindow from "./ChatWindow.jsx";
import { getCookie } from "./csrfhelper.js";

export default function ChatBar({ currentUsername }) {
  const [conversations, setConversations] = useState([]);
  const [openWindows, setOpenWindows] = useState([]); // array of conversation objects

  // Load conversations on mount and poll every 10s
  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, []);

  async function fetchConversations() {
    try {
      const res = await fetch("/api/chat/conversations/", { credentials: "include" });
      if (!res.ok) return;
      const body = await res.json();
      setConversations(body.conversations || []);
    } catch { /* ignore */ }
  }

  function openConversation(convo) {
    // Don't open duplicates
    if (openWindows.find(w => w.id === convo.id)) return;
    // Limit to 3 windows
    setOpenWindows(prev => {
      const next = prev.length >= 3 ? prev.slice(1) : prev;
      return [...next, convo];
    });
  }

  function closeWindow(convoId) {
    setOpenWindows(prev => prev.filter(w => w.id !== convoId));
  }

  // Expose openConversation on window so ProfilePage can trigger it
  useEffect(() => {
    window.__openChat = async (username) => {
      try {
        const res = await fetch(`/api/chat/start/${username}/`, {
          method: "POST",
          credentials: "include",
          headers: { "X-CSRFToken": getCookie("csrftoken") },
        });
        if (!res.ok) return;
        const convo = await res.json();
        openConversation(convo);
        fetchConversations();
      } catch { /* ignore */ }
    };
    return () => { delete window.__openChat; };
  }, [openWindows]);

  const initial = (u) => ((u.name?.[0] || u.username?.[0] || "?").toUpperCase());

  return (
    <>
      {/* Chat windows */}
      {openWindows.map((convo, i) => (
        <ChatWindow
          key={convo.id}
          conversation={convo}
          currentUsername={currentUsername}
          onClose={() => closeWindow(convo.id)}
          style={{ right: 16 + i * 320 }}
        />
      ))}

      {/* Bottom bar */}
      {conversations.length > 0 && (
        <div className="chat-bar">
          <div className="chat-bar-label">Messages</div>
          <div className="chat-bar-avatars">
            {conversations.map(c => {
              const u = c.otherUser;
              const isOpen = !!openWindows.find(w => w.id === c.id);
              return (
                <button
                  key={c.id}
                  className={`chat-bar-btn ${isOpen ? "chat-bar-btn-active" : ""}`}
                  title={u.name || u.username}
                  onClick={() => isOpen ? closeWindow(c.id) : openConversation(c)}
                >
                  {u.profilePicture
                    ? <img src={u.profilePicture} className="chat-bar-avatar-img" alt="" />
                    : <span>{initial(u)}</span>}
                  {c.latestMessage && (
                    <div className="chat-bar-preview">{c.latestMessage.body.slice(0, 28)}</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
