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
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Chat Header */}
      <div className="bg-gradient-to-r from-red-900 via-red-800 to-gray-900 text-white px-6 py-4 shadow-2xl border-b border-red-700">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-wider">
            <span className="text-red-500">Chat</span>
            <span className="text-green-500">IT</span>
          </h2>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowWhiteboard(true)}
              className="bg-green-600 hover:bg-green-700 px-5 py-2 rounded-full text-sm font-bold transition-all shadow-lg hover:shadow-green-500/50 flex items-center gap-2"
              title="Open Whiteboard"
            >
              🎨 Whiteboard
            </button>
            <span className="bg-gray-800/80 px-4 py-2 rounded-full text-sm font-medium border border-green-500/30">
              👤 {username}
            </span>
            <span className="bg-gray-800/80 px-4 py-2 rounded-full text-sm font-medium border border-red-500/30">
              {useSSL ? '🔒 SSL' : '🔓 No SSL'}
            </span>
            <button
              onClick={handleDisconnect}
              className="bg-red-600 hover:bg-red-700 px-5 py-2 rounded-full text-sm font-bold transition-all shadow-lg hover:shadow-red-500/50"
            >
              Disconnect
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 border-b border-red-600 text-red-200 px-6 py-3 text-sm">
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
        <div className="w-64 bg-gray-800 border-l border-red-900 flex flex-col">
          <div className="px-4 py-3 border-b border-red-900 bg-gradient-to-r from-gray-900 to-gray-800">
            <h4 className="font-bold text-green-400 flex items-center gap-2">
              <span className="text-green-500">●</span>
              Online Users ({users.length})
            </h4>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {users.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-4">
                No users online
              </div>
            ) : (
              users.map((u) => (
                <div
                  key={u}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 transition-all ${
                    u === username
                      ? 'bg-green-900/30 border border-green-500/50'
                      : 'hover:bg-gray-700/50'
                  }`}
                >
                  <span className="text-green-500 text-lg">●</span>
                  <span className="text-sm font-medium text-gray-200">{u}</span>
                  {u === username && (
                    <span className="ml-auto text-xs text-green-400 font-medium bg-green-900/50 px-2 py-1 rounded">
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
