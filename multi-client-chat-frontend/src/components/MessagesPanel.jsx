import { Download, File, Mic } from 'lucide-react';

function MessageBubble({ message, currentUsername }) {
  const isOwnMessage = message.payload?.username === currentUsername;
  const isSystem = message.type === 'SYSTEM';
  const isFile = message.type === 'FILE_UPLOAD';
  const isVoice = message.type === 'VOICE_MESSAGE';

  function formatTime(timestamp) {
    if (!timestamp) return '';
    const [hour, minute] = timestamp.split(':');
    const date = new Date();
    date.setHours(hour, minute);
    return date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  // --- Extract file info ---
  const filename = message.payload?.filename || 'Unknown file';
  const filesize = message.payload?.filesize || '—';
  const fileUrl = message.payload?.url || '#';
  const duration = message.payload?.duration || '0:00';
  const extension = filename.split('.').pop()?.toUpperCase() || 'FILE';

  // --- Base bubble styles ---
  const baseClasses = 'max-w-md px-4 rounded-2xl';
  const systemStyles =
    'bg-gray-700/50 py-1 text-gray-300 text-sm rounded-lg border border-gray-600';
  const ownMessageStyles =
    'bg-gradient-to-r from-green-700 to-green-600 py-2 text-white rounded-br-sm shadow-lg shadow-green-900/50';
  const otherMessageStyles =
    'bg-gradient-to-r from-gray-800 to-gray-700 py-2 text-gray-100 rounded-bl-sm shadow-lg border border-gray-600';

  let bubbleClasses = '';
  let alignmentClasses = '';

  if (isSystem) {
    bubbleClasses = `${baseClasses} ${systemStyles}`;
    alignmentClasses = 'justify-center';
  } else if (isOwnMessage) {
    bubbleClasses = `${baseClasses} ${ownMessageStyles}`;
    alignmentClasses = 'justify-end';
  } else {
    bubbleClasses = `${baseClasses} ${otherMessageStyles}`;
    alignmentClasses = 'justify-start';
  }

  return (
    <div className={`flex ${alignmentClasses} my-1`}>
      <div className={bubbleClasses}>
        {/* Username for other users */}
        {!isSystem && !isOwnMessage && (
          <div className="text-xs font-semibold text-red-400 mb-1">
            {message.payload?.username}
          </div>
        )}

        {/* File message display */}
        {isFile ? (
          <div
            className={`flex items-center gap-3 p-3 rounded-xl shadow-inner ${
              isOwnMessage ? 'bg-green-900/30' : 'bg-gray-900/50'
            }`}
          >
            <File className="text-white w-8 h-8" />

            {/* File info */}
            <div className="flex-1 mr-10">
              <div className="font-medium text-gray-100 truncate">
                {filename}
              </div>
              <div className="text-xs text-gray-300 truncate">
                {extension} {filesize}
              </div>
            </div>

            {/* Download button */}
            <a
              href={fileUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-400 hover:text-green-300 transition-colors"
            >
              <Download />
            </a>
          </div>
        ) : isVoice ? (
          /* Voice message display */
          <div className="flex items-center gap-3 p-2">
            <div className="flex items-center justify-center w-10 h-10 bg-red-600 rounded-full shadow-lg">
              <Mic className="text-white w-5 h-5" />
            </div>

            {/* Voice player */}
            <div className="flex-1">
              <audio
                controls
                src={fileUrl}
                className="w-full max-w-xs"
                style={{
                  height: '32px',
                  filter: 'invert(0.9) hue-rotate(180deg)',
                }}
              />
              <div
                className={`text-xs mt-1 ${
                  isOwnMessage ? 'text-green-300' : 'text-gray-400'
                }`}
              >
                {duration}
              </div>
            </div>
          </div>
        ) : (
          /* Regular text message */
          <div className="text-sm">{message.payload?.text}</div>
        )}

        {/* Timestamp (not shown on system messages) */}
        {!isSystem && message.timestamp && (
          <div
            className={`text-xs mt-1 ${
              isOwnMessage ? 'text-green-300' : 'text-gray-400'
            }`}
          >
            {formatTime(message.timestamp)}
          </div>
        )}

        {/* Timestamp (not shown on system messages) */}
        {!isSystem && message.timestamp && (
          <div
            className={`text-xs mt-1 ${
              isOwnMessage ? 'text-blue-100' : 'text-gray-500'
            }`}
          >
            {formatTime(message.timestamp)}
          </div>
        )}
      </div>
    </div>
  );
}

function TypingIndicator({ typingUsers }) {
  if (typingUsers.length === 0) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-green-400 ml-2">
      <span>
        {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'}{' '}
        typing
      </span>
      <span className="flex gap-1">
        <span className="animate-bounce" style={{ animationDelay: '0ms' }}>
          .
        </span>
        <span className="animate-bounce" style={{ animationDelay: '150ms' }}>
          .
        </span>
        <span className="animate-bounce" style={{ animationDelay: '300ms' }}>
          .
        </span>
      </span>
    </div>
  );
}

export default function MessagesPanel({
  messages,
  typingUsers,
  currentUsername,
  messagesEndRef,
}) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-900">
      {messages.map((msg, i) => (
        <MessageBubble
          key={i}
          message={msg}
          currentUsername={currentUsername}
        />
      ))}
      <TypingIndicator typingUsers={typingUsers} />
      <div ref={messagesEndRef} />
    </div>
  );
}
