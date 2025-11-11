export default function LoginScreen({ username, setUsername, error, onJoin, useSSL, setUseSSL }) {
  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Animated background glow effects */}
      <div
        style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, #4da8ff 0%, transparent 70%)',
          opacity: 0.1,
          top: '-250px',
          right: '-250px',
          animation: 'pulse 8s ease-in-out infinite'
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, #2196F3 0%, transparent 70%)',
          opacity: 0.08,
          bottom: '-200px',
          left: '-200px',
          animation: 'pulse 10s ease-in-out infinite reverse'
        }}
      />

      <style>
        {`
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 0.1; }
            50% { transform: scale(1.1); opacity: 0.15; }
          }
        `}
      </style>

      <div 
        className="rounded-2xl shadow-2xl p-8 w-full max-w-md"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(77, 168, 255, 0.2)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
          position: 'relative',
          zIndex: 1,
          animation: 'fadeInUp 0.6s ease-out'
        }}
      >
        <style>
          {`
            @keyframes fadeInUp {
              from {
                opacity: 0;
                transform: translateY(30px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}
        </style>

        <div className="text-center mb-8">
          <h2 
            className="text-5xl font-bold mb-2"
            style={{
              background: 'linear-gradient(135deg, #4da8ff 0%, #64b5f6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.5px'
            }}
          >
            💬 Connect & Collaborate
          </h2>
          <p style={{ color: '#aaa', fontSize: '14px' }}>Enter your username to join the chat</p>
        </div>

        <input
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && onJoin()}
          className="w-full px-4 py-3 rounded-lg mb-4 focus:outline-none"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            border: '1.5px solid rgba(77, 168, 255, 0.3)',
            color: '#fff',
            fontSize: '16px',
            transition: 'all 0.2s ease'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#4da8ff';
            e.target.style.boxShadow = '0 0 0 3px rgba(77, 168, 255, 0.15)';
            e.target.style.background = 'rgba(255, 255, 255, 0.08)';
            e.target.style.transform = 'translateY(-1px)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgba(77, 168, 255, 0.3)';
            e.target.style.boxShadow = 'none';
            e.target.style.background = 'rgba(255, 255, 255, 0.05)';
            e.target.style.transform = 'translateY(0)';
          }}
          autoFocus
        />

        {/* SSL Toggle */}
        {setUseSSL && (
          <div className="mb-4">
            <label 
              className="flex items-center cursor-pointer"
              style={{ color: '#aaa', fontSize: '14px' }}
            >
              <input
                type="checkbox"
                checked={useSSL}
                onChange={(e) => setUseSSL(e.target.checked)}
                className="mr-3"
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span>Use SSL/TLS Connection</span>
            </label>
          </div>
        )}

        {error && (
          <div 
            className="px-4 py-3 rounded-lg mb-4 text-sm"
            style={{
              background: 'rgba(231, 76, 60, 0.2)',
              border: '1px solid rgba(231, 76, 60, 0.4)',
              color: '#ff6b6b',
              backdropFilter: 'blur(10px)'
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <button
          onClick={onJoin}
          className="w-full font-bold py-3 rounded-lg transition-all shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
            color: 'white',
            fontSize: '16px',
            fontWeight: 600,
            boxShadow: '0 4px 15px 0 rgba(33, 150, 243, 0.4)',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-3px)';
            e.target.style.boxShadow = '0 8px 25px 0 rgba(33, 150, 243, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 15px 0 rgba(33, 150, 243, 0.4)';
          }}
          onMouseDown={(e) => {
            e.target.style.transform = 'translateY(-1px)';
          }}
          onMouseUp={(e) => {
            e.target.style.transform = 'translateY(-3px)';
          }}
        >
          Join Chat
        </button>
      </div>
    </div>
  );
}
