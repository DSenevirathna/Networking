import { useEffect, useRef, useState } from 'react';
import LoginScreen from './components/Login.jsx';
import MessagesPanel from './components/MessagesPanel.jsx';
import MessageInput from './components/MessageInput.jsx';
import UploadModal from './components/UploadModal.jsx';
import VoiceRecorder from './components/VoiceRecorder.jsx';
import Whiteboard from './components/Whiteboard.jsx';

export default function App() {
  const [messages, setMessages] = useState([]);
  const [username, setUsername] = useState('');
  const [text, setText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [users, setUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [error, setError] = useState(null);
  const [useSSL, setUseSSL] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const ws = useRef(null);
  const messagesEndRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const shouldReconnect = useRef(false);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const maxReconnectAttempts = 6;

  const getWebSocketUrl = () => {
    const protocol = useSSL ? 'wss' : 'ws';
    const port = useSSL ? '7443' : '7070';
    return `${protocol}://localhost:${port}/chat`;
  };

  const connectWebSocket = (name) => {
    // Close previous connection if present
    if (ws.current) {
      try {
        ws.current.close();
      } catch (e) {
        console.warn('Error closing existing websocket:', e);
      }
      ws.current = null;
    }

    const wsUrl = getWebSocketUrl();
    console.log(`Connecting to ${wsUrl}...`);

    try {
      ws.current = new WebSocket(wsUrl);
    } catch (err) {
      setError(`Failed to connect: ${err.message}`);
      return;
    }

    ws.current.onopen = () => {
      console.log('Connected to WebSocket');
      reconnectAttemptsRef.current = 0;
      setIsConnected(true);
      setError(null);
      shouldReconnect.current = true;

      try {
        ws.current.send(
          JSON.stringify({
            type: 'JOIN',
            payload: { username: name },
          })
        );
      } catch (err) {
        console.error('Failed to send JOIN:', err);
        setError('Failed to join chat');
      }
    };

    ws.current.onmessage = (event) => {
      let msg = null;
      try {
        msg = JSON.parse(event.data);
      } catch (err) {
        console.error('Invalid JSON from server:', event.data, err);
        return;
      }

      switch (msg.type) {
        case 'USER_LIST_UPDATE':
          setUsers(Array.isArray(msg.payload?.users) ? msg.payload.users : []);
          break;

        case 'TYPING':
          handleTypingIndicator(msg.payload?.username, true);
          break;

        case 'STOP_TYPING':
          handleTypingIndicator(msg.payload?.username, false);
          break;

        case 'ERROR':
          setError(msg.payload?.text || 'An error occurred');
          break;

        case 'FILE_UPLOAD':
          setMessages((prev) => [
            ...prev,
            {
              type: 'FILE_UPLOAD',
              payload: {
                filename: msg.payload.filename,
                username: msg.payload.username,
                url: msg.payload.url,
                filesize: msg.payload.filesize,
              },
              timestamp: msg.timestamp || new Date().toLocaleTimeString(),
            },
          ]);
          break;

        case 'VOICE_MESSAGE':
          setMessages((prev) => [
            ...prev,
            {
              type: 'VOICE_MESSAGE',
              payload: {
                filename: msg.payload.filename,
                username: msg.payload.username,
                url: msg.payload.url,
                filesize: msg.payload.filesize,
                duration: msg.payload.duration,
              },
              timestamp: msg.timestamp || new Date().toLocaleTimeString(),
            },
          ]);
          break;

        default:
          setMessages((prev) => [...prev, msg]);
          break;
      }
    };

    ws.current.onclose = (ev) => {
      console.log('Disconnected from WebSocket', ev.code, ev.reason);
      setIsConnected(false);

      if (shouldReconnect.current) {
        const attempt = reconnectAttemptsRef.current + 1;
        reconnectAttemptsRef.current = attempt;
        if (attempt <= maxReconnectAttempts) {
          const backoff = Math.min(30000, 1000 * 2 ** (attempt - 1));
          console.log(`Reconnecting attempt ${attempt} in ${backoff}ms`);
          setTimeout(() => connectWebSocket(name), backoff);
        } else {
          setError('Max reconnect attempts reached. Please refresh the page.');
        }
      }
    };

    ws.current.onerror = (err) => {
      console.error('WebSocket error:', err);
      setError('WebSocket connection error');
    };
  };

  const handleTypingIndicator = (user, isTyping) => {
    if (user === username) return;

    setTypingUsers((prev) => {
      if (isTyping) {
        return prev.includes(user) ? prev : [...prev, user];
      } else {
        return prev.filter((u) => u !== user);
      }
    });
  };

  const handleJoin = () => {
    if (!username.trim()) {
      alert('Please enter a username!');
      return;
    }
    reconnectAttemptsRef.current = 0;
    shouldReconnect.current = true;
    setError(null);
    connectWebSocket(username);
  };

  const sendMessage = () => {
    if (!text.trim()) return;

    const out = JSON.stringify({ type: 'MESSAGE', payload: { text } });
    try {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(out);
        setText('');
        sendStopTyping();
      } else {
        setError('Not connected. Message not sent.');
      }
    } catch (err) {
      console.error('Failed to send message', err);
      setError('Failed to send message');
    }
  };

  const handleTextChange = (e) => {
    setText(e.target.value);

    if (
      e.target.value &&
      ws.current &&
      ws.current.readyState === WebSocket.OPEN
    ) {
      sendTyping();
    }
  };

  const sendTyping = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
      ws.current.send(JSON.stringify({ type: 'TYPING', payload: {} }));
    } catch (err) {
      console.error('Failed to send typing indicator', err);
    }

    typingTimeoutRef.current = setTimeout(() => {
      sendStopTyping();
    }, 3000);
  };

  const sendStopTyping = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    try {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({ type: 'STOP_TYPING', payload: {} }));
      }
    } catch (err) {
      console.error('Failed to send stop typing indicator', err);
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
    setMessages([]);
    setUsers([]);
    setTypingUsers([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleUploadClick = () => {
    setShowUploadModal(true);
    setUploadMessage('');
    setSelectedFile(null);
  };

  const handleVoiceClick = () => {
    setShowVoiceRecorder(true);
  };

  const handleVoiceSent = () => {
    // Voice message sent successfully
    console.log('Voice message sent');
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setUploadMessage('');
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setUploadMessage('Please select a file!');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('username', username);
    formData.append('file', selectedFile);

    try {
      const protocol = useSSL ? 'https' : 'http';
      const port = useSSL ? '7443' : '7070';
      const response = await fetch(`${protocol}://localhost:${port}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setUploadMessage(`✅ ${data.message}`);
        setTimeout(() => {
          setShowUploadModal(false);
          setSelectedFile(null);
        }, 1500);
      } else {
        const errorText = await response.text();
        setUploadMessage(`❌ Upload failed: ${errorText}`);
      }
    } catch (error) {
      setUploadMessage(`❌ Error: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const closeModal = () => {
    setShowUploadModal(false);
    setSelectedFile(null);
    setUploadMessage('');
  };

  useEffect(() => {
    return () => {
      if (ws.current) ws.current.close();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isConnected) {
    return (
      <LoginScreen
        username={username}
        setUsername={setUsername}
        useSSL={useSSL}
        setUseSSL={setUseSSL}
        error={error}
        onJoin={handleJoin}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 100%)' }}>
      {/* Chat Header */}
      <div 
        className="text-white px-6 py-4 shadow-2xl"
        style={{
          background: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: '1px solid rgba(77, 168, 255, 0.2)'
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-wider" style={{ color: '#4da8ff' }}>
            💬 Chat
          </h2>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowWhiteboard(true)}
              className="px-5 py-2 rounded-full text-sm font-bold transition-all shadow-lg flex items-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
                boxShadow: '0 4px 15px 0 rgba(33, 150, 243, 0.4)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 25px 0 rgba(33, 150, 243, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 15px 0 rgba(33, 150, 243, 0.4)';
              }}
              title="Open Whiteboard"
            >
              🎨 Whiteboard
            </button>
            <span 
              className="px-4 py-2 rounded-full text-sm font-medium"
              style={{
                background: 'rgba(77, 168, 255, 0.15)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(77, 168, 255, 0.3)',
                color: '#4da8ff'
              }}
            >
              👤 {username}
            </span>
            <span 
              className="px-4 py-2 rounded-full text-sm font-medium"
              style={{
                background: 'rgba(77, 168, 255, 0.15)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(77, 168, 255, 0.3)',
                color: '#4da8ff'
              }}
            >
              {useSSL ? '🔒 SSL' : '🔓 No SSL'}
            </span>
            <button
              onClick={handleDisconnect}
              className="px-5 py-2 rounded-full text-sm font-bold transition-all shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                boxShadow: '0 2px 10px rgba(231, 76, 60, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(231, 76, 60, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 2px 10px rgba(231, 76, 60, 0.3)';
              }}
            >
              Disconnect
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div 
          className="px-6 py-3 text-sm"
          style={{
            background: 'rgba(231, 76, 60, 0.2)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(231, 76, 60, 0.4)',
            color: '#ff6b6b'
          }}
        >
          ⚠️ {error}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          <MessagesPanel
            messages={messages}
            typingUsers={typingUsers}
            currentUsername={username}
            messagesEndRef={messagesEndRef}
          />

          <MessageInput
            text={text}
            onTextChange={handleTextChange}
            onSend={sendMessage}
            onKeyDown={handleKeyDown}
            onBlur={sendStopTyping}
            onUploadClick={handleUploadClick}
            onVoiceClick={handleVoiceClick}
          />
        </div>

        {/* Users Panel - Moved to Right */}
        <div 
          className="w-64 flex flex-col"
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            borderLeft: '1px solid rgba(77, 168, 255, 0.2)'
          }}
        >
          <div 
            className="px-4 py-3"
            style={{
              background: 'rgba(0, 0, 0, 0.2)',
              borderBottom: '1px solid rgba(77, 168, 255, 0.2)'
            }}
          >
            <h4 className="font-bold flex items-center gap-2" style={{ color: '#4da8ff', fontSize: '13px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              <span style={{ color: '#4ade80', filter: 'drop-shadow(0 0 2px #4ade80)' }}>●</span>
              Online Users ({users.length})
            </h4>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {users.length === 0 ? (
              <div className="text-center text-sm py-4" style={{ color: '#666', fontStyle: 'italic' }}>
                No users online
              </div>
            ) : (
              users.map((u) => (
                <div
                  key={u}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg mb-1 transition-all cursor-pointer"
                  style={
                    u === username
                      ? {
                          background: 'rgba(33, 150, 243, 0.2)',
                          border: '1.5px solid rgba(77, 168, 255, 0.4)',
                          color: '#64b5f6',
                          fontWeight: 600,
                          boxShadow: '0 2px 10px rgba(77, 168, 255, 0.2)'
                        }
                      : {
                          background: 'rgba(77, 168, 255, 0.08)',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(77, 168, 255, 0.2)',
                          color: '#4da8ff'
                        }
                  }
                  onMouseEnter={(e) => {
                    if (u !== username) {
                      e.currentTarget.style.background = 'rgba(77, 168, 255, 0.15)';
                      e.currentTarget.style.transform = 'translateX(4px)';
                      e.currentTarget.style.borderColor = 'rgba(77, 168, 255, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (u !== username) {
                      e.currentTarget.style.background = 'rgba(77, 168, 255, 0.08)';
                      e.currentTarget.style.transform = 'translateX(0)';
                      e.currentTarget.style.borderColor = 'rgba(77, 168, 255, 0.2)';
                    }
                  }}
                >
                  <span style={{ color: '#4ade80', fontSize: '10px', filter: 'drop-shadow(0 0 2px #4ade80)' }}>●</span>
                  <span className="text-sm font-medium">{u}</span>
                  {u === username && (
                    <span 
                      className="ml-auto text-xs font-medium px-2 py-1 rounded"
                      style={{
                        color: '#4da8ff',
                        background: 'rgba(77, 168, 255, 0.15)',
                        fontSize: '10px',
                        fontWeight: 600
                      }}
                    >
                      You
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <UploadModal
        show={showUploadModal}
        selectedFile={selectedFile}
        uploadMessage={uploadMessage}
        isUploading={isUploading}
        onClose={closeModal}
        onFileSelect={handleFileSelect}
        onUpload={handleFileUpload}
        fileInputRef={fileInputRef}
      />

      {showVoiceRecorder && (
        <VoiceRecorder
          onSendVoice={handleVoiceSent}
          onClose={() => setShowVoiceRecorder(false)}
          username={username}
        />
      )}

      <Whiteboard
        show={showWhiteboard}
        onClose={() => setShowWhiteboard(false)}
        ws={ws.current}
        username={username}
      />
    </div>
  );
}
