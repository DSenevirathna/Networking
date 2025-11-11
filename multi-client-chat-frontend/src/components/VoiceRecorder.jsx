import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Send } from 'lucide-react';

export default function VoiceRecorder({ onSendVoice, onClose, username }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Use webm format with opus codec for better compatibility
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const deleteRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
  };

  const sendVoiceMessage = async () => {
    if (!audioBlob) return;

    const formData = new FormData();
    formData.append('file', audioBlob, 'voice-message.webm');
    formData.append('username', username);
    formData.append('duration', formatTime(recordingTime));

    try {
      const response = await fetch('http://localhost:7070/upload-voice', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        console.log('Voice message sent successfully');
        onSendVoice();
        onClose();
      } else {
        const error = await response.text();
        alert('Failed to send voice message: ' + error);
      }
    } catch (error) {
      console.error('Error sending voice message:', error);
      alert('Failed to send voice message');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-gray-800 border-2 border-red-900/50 rounded-lg p-6 w-96 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-red-400">
            🎤 Voice Message
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-red-400 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Recording Status */}
        <div className="flex flex-col items-center space-y-4">
          {isRecording && (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-600 font-medium">Recording...</span>
            </div>
          )}

          {/* Timer */}
          <div className="text-4xl font-mono text-green-400">
            {formatTime(recordingTime)}
          </div>

          {/* Audio Player */}
          {audioUrl && !isRecording && (
            <audio
              controls
              src={audioUrl}
              className="w-full"
              style={{ filter: 'invert(0.9) hue-rotate(180deg)' }}
            />
          )}

          {/* Controls */}
          <div className="flex space-x-3 mt-6">
            {!isRecording && !audioBlob && (
              <button
                onClick={startRecording}
                className="bg-red-600 hover:bg-red-700 text-white p-4 rounded-full transition-all shadow-lg hover:shadow-red-500/50"
                title="Start Recording"
              >
                <Mic className="w-6 h-6" />
              </button>
            )}

            {isRecording && (
              <button
                onClick={stopRecording}
                className="bg-gray-700 hover:bg-gray-600 text-white p-4 rounded-full transition-colors"
                title="Stop Recording"
              >
                <Square className="w-6 h-6" />
              </button>
            )}

            {audioBlob && !isRecording && (
              <>
                <button
                  onClick={deleteRecording}
                  className="bg-red-600 hover:bg-red-700 text-white p-4 rounded-full transition-all shadow-lg hover:shadow-red-500/50"
                  title="Delete Recording"
                >
                  <Trash2 className="w-6 h-6" />
                </button>
                <button
                  onClick={sendVoiceMessage}
                  className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-full transition-all shadow-lg hover:shadow-green-500/50"
                  title="Send Voice Message"
                >
                  <Send className="w-6 h-6" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 text-xs text-gray-400 text-center">
          {!isRecording &&
            !audioBlob &&
            'Click the microphone to start recording'}
          {isRecording && 'Click stop when finished'}
          {audioBlob && !isRecording && 'Preview your message or send it'}
        </div>
      </div>
    </div>
  );
}
