import { Upload, X, File, Image } from 'lucide-react';

export default function UploadModal({
  show,
  selectedFile,
  uploadMessage,
  isUploading,
  onClose,
  onFileSelect,
  onUpload,
  fileInputRef,
}) {
  if (!show) return null;

  const getFileIcon = () => {
    if (!selectedFile) return <File className="w-12 h-12 text-gray-500" />;

    const type = selectedFile.type;
    if (type.startsWith('image/')) {
      return <Image className="w-12 h-12 text-green-500" />;
    }
    return <File className="w-12 h-12 text-red-500" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 border-2 border-red-900/50 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-red-900">
          <h3 className="text-xl font-bold text-green-400">📁 Upload File</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400 hover:text-red-400" />
          </button>
        </div>

        <div className="p-6">
          <div className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center mb-4 bg-gray-900/50">
            <div className="flex justify-center mb-4">{getFileIcon()}</div>

            {selectedFile ? (
              <div>
                <p className="font-medium text-gray-200 mb-1">
                  {selectedFile.name}
                </p>
                <p className="text-sm text-gray-400">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-gray-400 mb-2">Click to select a file</p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              onChange={onFileSelect}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors text-sm font-medium"
            >
              Choose File
            </button>
          </div>

          {uploadMessage && (
            <div
              className={`mb-4 px-4 py-3 rounded-lg text-sm ${
                uploadMessage.startsWith('✅')
                  ? 'bg-green-900/50 border border-green-600 text-green-200'
                  : 'bg-red-900/50 border border-red-600 text-red-200'
              }`}
            >
              {uploadMessage}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={onUpload}
              disabled={!selectedFile || isUploading}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-all font-medium flex items-center justify-center gap-2 shadow-lg disabled:shadow-none"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
