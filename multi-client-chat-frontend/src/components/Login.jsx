export default function LoginScreen({ username, setUsername, error, onJoin }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-950 to-black flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl border-2 border-red-900/50 p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h2 className="text-5xl font-bold mb-2">
            <span className="text-red-500">Chat</span>
            <span className="text-green-500">IT</span>
          </h2>
          <p className="text-gray-400">Enter your username to join the chat</p>
        </div>

        <input
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && onJoin()}
          className="w-full px-4 py-3 border-2 border-gray-700 bg-gray-900 text-gray-100 rounded-lg focus:border-green-500 focus:outline-none mb-4 placeholder-gray-500"
          autoFocus
        />

        {error && (
          <div className="bg-red-900/50 border border-red-600 text-red-200 px-4 py-3 rounded-lg mb-4 text-sm">
            ⚠️ {error}
          </div>
        )}

        <button
          onClick={onJoin}
          className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3 rounded-lg transition-all shadow-lg hover:shadow-green-500/50"
        >
          Join Chat
        </button>
      </div>
    </div>
  );
}
