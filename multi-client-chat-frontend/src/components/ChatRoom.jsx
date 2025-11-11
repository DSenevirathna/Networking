import React, { useEffect, useRef, useState } from "react";

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
      <div style={{ padding: 20, fontFamily: "Arial" }}>
        <h2>💬 Welcome to WebSocket Chat</h2>
        <input
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ marginRight: 10 }}
        />
        <button onClick={handleJoin}>Join Chat</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h2>💬 WebSocket Chat Room</h2>
      <p>
        Connected as: <strong>{username}</strong>
      </p>

      <div style={{ display: "flex", gap: 20 }}>
        <div style={{ minWidth: 150 }}>
          <h4>Users</h4>
          <div
            style={{
              border: "1px solid #ccc",
              padding: 8,
              height: 200,
              overflowY: "auto",
              background: "#ffffffaa",
            }}
          >
            {users.length === 0 ? (
              <div style={{ color: "#666" }}>No users</div>
            ) : (
              users.map((u) => (
                <div key={u} style={{ padding: "4px 0" }}>
                  {u}
                </div>
              ))
            )}
          </div>
          <div style={{ marginTop: 8 }}>
            <button
              onClick={handleDisconnect}
              disabled={!isConnected}
              style={{ marginRight: 8 }}
            >
              Disconnect
            </button>
            {!isConnected && (
              <button
                onClick={() => {
                  if (!username.trim())
                    return alert("Enter username to reconnect");
                  shouldReconnect.current = true;
                  connectWebSocket(username);
                }}
              >
                Reconnect
              </button>
            )}
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div
            style={{
              border: "1px solid #ccc",
              padding: 10,
              height: 400,
              overflowY: "auto",
              marginBottom: 10,
              backgroundColor: "#181717ff",
            }}
          >
            {messages.map((msg, i) => {
              const isOwnMessage = msg.payload?.username === username;
              const isSystem = msg.type === "SYSTEM";

              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: isSystem
                      ? "center"
                      : isOwnMessage
                      ? "flex-end"
                      : "flex-start",
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      maxWidth: "70%",
                      backgroundColor: isSystem
                        ? "transparent"
                        : isOwnMessage
                        ? "#6dd41fff"
                        : "#181717ff",
                      border: isSystem ? "none" : "1px solid #ccc",
                      borderRadius: 10,
                      padding: "8px 12px",
                      textAlign: isSystem ? "center" : "left",
                      boxShadow: isSystem
                        ? "none"
                        : "0 1px 3px rgba(0, 0, 0, 0.1)",
                    }}
                  >
                    {isSystem ? (
                      <i>{msg.payload?.text}</i>
                    ) : (
                      <>
                        {!isOwnMessage && (
                          <div
                            style={{
                              fontWeight: "bold",
                              color: "#007bff",
                              marginBottom: 4,
                            }}
                          >
                            {msg.payload?.username}
                          </div>
                        )}
                        <div>{msg.payload?.text}</div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      <div style={{ display: "flex" }}>
        <input
          type="text"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{
            flex: 1,
            marginRight: 10,
            padding: 10,
            borderRadius: 5,
            border: "1px solid #ccc",
          }}
        />
        <button
          onClick={sendMessage}
          style={{
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: 5,
            padding: "10px 20px",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
