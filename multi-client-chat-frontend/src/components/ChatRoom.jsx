import React, { useEffect, useRef, useState } from "react";
import "./ChatRoom.css";

export default function ChatRoom() {
  const [messages, setMessages] = useState([]);
  const [username, setUsername] = useState("");
  const [text, setText] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [users, setUsers] = useState([]);
  const ws = useRef(null);
  const messagesEndRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const shouldReconnect = useRef(false);
  const maxReconnectAttempts = 6; // exponential backoff cap
  // Ensure refs are not flagged as unused by some linters
  void messagesEndRef;
  void reconnectAttemptsRef;
  void shouldReconnect;

  const connectWebSocket = (name) => {
    // Close previous connection if present
    if (ws.current) {
      try {
        ws.current.close();
      } catch (e) {
        console.warn("Error closing existing websocket:", e);
      }
      ws.current = null;
    }

    ws.current = new WebSocket("ws://localhost:7070/chat");

    ws.current.onopen = () => {
      console.log("✅ Connected to WebSocket");
      reconnectAttemptsRef.current = 0;
      setIsConnected(true);
      // mark that this connection came from a join action and allow reconnects
      shouldReconnect.current = true;
      // send JOIN immediately
      try {
        ws.current.send(
          JSON.stringify({
            type: "JOIN",
            payload: { username: name },
          })
        );
      } catch (err) {
        console.error("Failed to send JOIN:", err);
      }
    };

    ws.current.onmessage = (event) => {
      let msg = null;
      try {
        msg = JSON.parse(event.data);
      } catch (err) {
        console.error("Invalid JSON from server:", event.data, err);
        return;
      }

      // USER_LIST_UPDATE -> update users state
      if (msg.type === "USER_LIST_UPDATE") {
        setUsers(Array.isArray(msg.payload?.users) ? msg.payload.users : []);
        return;
      }

      // push all other messages into messages array
      setMessages((prev) => [...prev, msg]);
    };

    ws.current.onclose = (ev) => {
      console.log("❌ Disconnected from WebSocket", ev.code, ev.reason);
      setIsConnected(false);
      // attempt reconnect with exponential backoff if desired
      if (shouldReconnect.current) {
        const attempt = reconnectAttemptsRef.current + 1;
        reconnectAttemptsRef.current = attempt;
        if (attempt <= maxReconnectAttempts) {
          const backoff = Math.min(30000, 1000 * 2 ** (attempt - 1));
          console.log(`Reconnecting attempt ${attempt} in ${backoff}ms`);
          setTimeout(() => connectWebSocket(name), backoff);
        } else {
          console.warn("Max reconnect attempts reached");
        }
      }
    };

    ws.current.onerror = (err) => {
      console.error("⚠️ WebSocket error:", err);
    };
  };

  const handleJoin = () => {
    if (!username.trim()) {
      alert("Please enter a username!");
      return;
    }
    reconnectAttemptsRef.current = 0;
    shouldReconnect.current = true;
    connectWebSocket(username);
  };

  const sendMessage = () => {
    if (!text.trim()) return;
    const out = JSON.stringify({ type: "MESSAGE", payload: { text } });
    try {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(out);
        setText("");
      } else {
        console.warn("WebSocket not open, message not sent");
        // Optionally show a UI notice to the user
        alert("Not connected. Message not sent.");
      }
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

  const handleDisconnect = () => {
    shouldReconnect.current = false;
    if (ws.current) {
      try {
        ws.current.close();
      } catch (e) {
        console.warn(e);
      }
      ws.current = null;
    }
    setIsConnected(false);
  };

  // Cleanup connection when leaving the page
  useEffect(() => {
    return () => {
      if (ws.current) ws.current.close();
    };
  }, []);

  // autoscroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!isConnected) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h2>💬 Welcome to WebSocket Chat</h2>
          <p className="subtitle">Enter your username to join</p>
          <input
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
            className="login-input"
            autoFocus
          />
          <button onClick={handleJoin} className="join-button">
            Join Chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>💬 WebSocket Chat Room</h2>
        <div className="header-info">
          <div className="username-badge">
            Connected as: <strong>{username}</strong>
          </div>
          <button onClick={handleDisconnect} className="disconnect-button">
            Disconnect
          </button>
        </div>
      </div>

      <div className="chat-main">
        <div className="users-panel">
          <h4>Users Online</h4>
          <div className="users-list">
            {users.length === 0 ? (
              <div className="no-users">No users</div>
            ) : (
              users.map((u) => (
                <div 
                  key={u} 
                  className={`user-item ${u === username ? 'current-user' : ''}`}
                >
                  <span className="user-status">●</span>
                  {u}
                  {u === username && <span className="you-badge">(You)</span>}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="messages-panel">
          <div className="messages-container">
            {messages.map((msg, i) => {
              const isOwnMessage = msg.payload?.username === username;
              const isSystem = msg.type === "SYSTEM";

              return (
                <div
                  key={i}
                  className={`message-wrapper ${
                    isSystem ? 'system' : isOwnMessage ? 'own' : 'other'
                  }`}
                >
                  <div className="message-bubble">
                    {isSystem ? (
                      <span className="message-text">{msg.payload?.text}</span>
                    ) : (
                      <>
                        {!isOwnMessage && (
                          <div className="message-sender">
                            {msg.payload?.username}
                          </div>
                        )}
                        <div className="message-text">{msg.payload?.text}</div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="message-input-container">
            <input
              type="text"
              placeholder="Type a message..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              className="message-input"
            />
            <button
              onClick={sendMessage}
              disabled={!text.trim()}
              className="send-button"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
