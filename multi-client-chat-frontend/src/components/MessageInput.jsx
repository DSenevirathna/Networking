import { Paperclip, SendHorizontal, Mic } from 'lucide-react';

export default function MessageInput({
  text,
  onTextChange,
  onSend,
  onKeyDown,
  onBlur,
  onUploadClick,
  onVoiceClick,
}) {
  return (
    <div className="bg-gray-800 border-t border-red-900 p-4">
      <div className="flex items-center gap-2">
        <button
          onClick={onUploadClick}
          className="p-2 hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-green-500"
          title="Upload file"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <button
          onClick={onVoiceClick}
          className="p-2 hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-red-500"
          title="Send voice message"
        >
          <Mic className="w-5 h-5" />
        </button>

        <input
          type="text"
          placeholder="Type a message..."
          value={text}
          onChange={onTextChange}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          className="flex-1 px-4 py-2 border-2 border-gray-700 bg-gray-900 text-gray-100 rounded-full focus:border-green-500 focus:outline-none placeholder-gray-500"
        />

        <button
          onClick={onSend}
          disabled={!text.trim()}
          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white px-3 py-3 rounded-full font-medium transition-all shadow-lg disabled:shadow-none"
        >
          <SendHorizontal />
        </button>
      </div>
    </div>
  );
}
