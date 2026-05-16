import { useEffect, useRef, useState } from "react";
import { getCookie } from "./csrfhelper.js";

export default function ChatWindow({ conversation, currentUsername, onClose, style }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const lastIdRef = useRef(null);
  const { otherUser, id: convoId } = conversation;

  // Initial load
  useEffect(() => {
    fetchMessages(null);
  }, [convoId]);

  // Poll every 3 s for new messages
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastIdRef.current !== null) fetchMessages(lastIdRef.current);
    }, 3000);
    return () => clearInterval(interval);
  }, [convoId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function fetchMessages(sinceId) {
    try {
      const url = sinceId
        ? `/api/chat/conversations/${convoId}/?since=${sinceId}`
        : `/api/chat/conversations/${convoId}/`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return;
      const body = await res.json();
      if (body.messages.length > 0) {
        lastIdRef.current = body.messages[body.messages.length - 1].id;
        setMessages(prev => sinceId ? [...prev, ...body.messages] : body.messages);
      } else if (!sinceId) {
        setMessages([]);
      }
    } catch { /* ignore */ }
  }

  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    try {
      const res = await fetch(`/api/chat/conversations/${convoId}/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCookie("csrftoken") },
        body: JSON.stringify({ body: text }),
      });
      if (!res.ok) return;
      const msg = await res.json();
      lastIdRef.current = msg.id;
      setMessages(prev => [...prev, msg]);
    } finally {
      setSending(false);
    }
  }

  const initial = (otherUser.name?.[0] || otherUser.username?.[0] || "?").toUpperCase();

  return (
    <div className="chat-window" style={style}>
      {/* Header */}
      <div className="chat-window-header">
        <div className="chat-window-user">
          {otherUser.profilePicture
            ? <img src={otherUser.profilePicture} className="chat-avatar-img" alt="" />
            : <div className="chat-avatar">{initial}</div>}
          <span className="chat-window-name">{otherUser.name || otherUser.username}</span>
        </div>
        <button className="chat-window-close" onClick={onClose}>✕</button>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">No messages yet. Say hello!</div>
        )}
        {messages.map(m => (
          <div key={m.id} className={`chat-bubble ${m.mine ? "chat-bubble-mine" : "chat-bubble-theirs"}`}>
            <div className="chat-bubble-body">{m.body}</div>
            <div className="chat-bubble-time">
              {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form className="chat-input-row" onSubmit={handleSend}>
        <input
          className="chat-input"
          type="text"
          placeholder="Message…"
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={sending}
          autoFocus
        />
        <button type="submit" className="chat-send-btn" disabled={!input.trim() || sending}>
          ➤
        </button>
      </form>
    </div>
  );
}
