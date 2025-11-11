import { useEffect, useRef, useState } from 'react';
import { Eraser, Trash2, Download, Palette, X } from 'lucide-react';

export default function Whiteboard({ show, onClose, ws, username }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#22C55E'); // Green default
  const [lineWidth, setLineWidth] = useState(3);
  const [tool, setTool] = useState('pen'); // 'pen' or 'eraser'
  const [showColorPicker, setShowColorPicker] = useState(false);
  const lastPointRef = useRef({ x: 0, y: 0 });
  const pathRef = useRef([]);

  const colors = [
    '#22C55E', // Green
    '#DC2626', // Red
    '#FFFFFF', // White
    '#FACC15', // Yellow
    '#3B82F6', // Blue
    '#A855F7', // Purple
    '#F97316', // Orange
    '#EC4899', // Pink
  ];

  useEffect(() => {
    if (!show) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Fill with dark background
    ctx.fillStyle = '#1F2937';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Set drawing properties for smooth lines
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  }, [show]);

  useEffect(() => {
    if (!ws || !show) return;

    const handleWhiteboardMessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'WHITEBOARD_DRAW') {
          const drawData = msg.payload.drawData;
          if (drawData.points) {
            drawSmoothPath(drawData);
          }
        } else if (msg.type === 'WHITEBOARD_CLEAR') {
          clearCanvas();
        }
      } catch (error) {
        console.error('Error handling whiteboard message:', error);
      }
    };

    ws.addEventListener('message', handleWhiteboardMessage);

    return () => {
      ws.removeEventListener('message', handleWhiteboardMessage);
    };
  }, [ws, show]);

  const drawSmoothPath = (drawData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { points, color, lineWidth, tool } = drawData;

    if (!points || points.length < 2) return;

    ctx.strokeStyle = tool === 'eraser' ? '#1F2937' : color;
    ctx.lineWidth = tool === 'eraser' ? lineWidth * 3 : lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    // Use quadratic curves for smooth drawing
    for (let i = 1; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }

    // Draw last segment
    if (points.length > 1) {
      const lastPoint = points[points.length - 1];
      const secondLastPoint = points[points.length - 2];
      ctx.quadraticCurveTo(
        secondLastPoint.x,
        secondLastPoint.y,
        lastPoint.x,
        lastPoint.y
      );
    }

    ctx.stroke();
  };

  const startDrawing = (e) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    lastPointRef.current = { x, y };
    pathRef.current = [{ x, y }];

    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = tool === 'eraser' ? '#1F2937' : color;
    ctx.lineWidth = tool === 'eraser' ? lineWidth * 3 : lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const draw = (e) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Add point to path
    pathRef.current.push({ x, y });

    // Draw locally with smooth curve
    const ctx = canvas.getContext('2d');
    const points = pathRef.current;

    if (points.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(points[points.length - 2].x, points[points.length - 2].y);

    if (points.length >= 3) {
      // Use quadratic curve for smoother drawing
      const xc = (points[points.length - 2].x + x) / 2;
      const yc = (points[points.length - 2].y + y) / 2;
      ctx.quadraticCurveTo(
        points[points.length - 2].x,
        points[points.length - 2].y,
        xc,
        yc
      );
    } else {
      ctx.lineTo(x, y);
    }

    ctx.stroke();

    lastPointRef.current = { x, y };
  };

  const stopDrawing = () => {
    if (!isDrawing) return;

    setIsDrawing(false);

    // Send the complete smooth path to other clients
    if (ws && ws.readyState === WebSocket.OPEN && pathRef.current.length > 1) {
      ws.send(
        JSON.stringify({
          type: 'WHITEBOARD_DRAW',
          payload: {
            username,
            drawData: {
              points: pathRef.current,
              color,
              lineWidth,
              tool,
            },
          },
        })
      );
    }

    pathRef.current = [];
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1F2937';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleClear = () => {
    clearCanvas();

    // Send clear command to other clients
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'WHITEBOARD_CLEAR',
          payload: { username },
        })
      );
    }
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `whiteboard-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border-2 border-red-900/50 rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-red-900">
          <h3 className="text-xl font-bold text-green-400 flex items-center gap-2">
            🎨 Shared Whiteboard
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400 hover:text-red-400" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-4 px-6 py-3 border-b border-gray-700 bg-gray-900">
          {/* Tool Selection */}
          <div className="flex gap-2">
            <button
              onClick={() => setTool('pen')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                tool === 'pen'
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              ✏️ Pen
            </button>
            <button
              onClick={() => setTool('eraser')}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                tool === 'eraser'
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Eraser className="w-4 h-4" />
              Eraser
            </button>
          </div>

          <div className="h-6 w-px bg-gray-600"></div>

          {/* Color Picker */}
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              <Palette className="w-4 h-4 text-gray-300" />
              <div
                className="w-6 h-6 rounded border-2 border-gray-500"
                style={{ backgroundColor: color }}
              ></div>
            </button>

            {showColorPicker && (
              <div className="absolute top-12 left-0 bg-gray-700 p-3 rounded-lg shadow-xl z-10 grid grid-cols-4 gap-2">
                {colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setColor(c);
                      setShowColorPicker(false);
                    }}
                    className="w-8 h-8 rounded border-2 border-gray-500 hover:scale-110 transition-transform"
                    style={{ backgroundColor: c }}
                  ></button>
                ))}
              </div>
            )}
          </div>

          {/* Line Width */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Size:</span>
            <input
              type="range"
              min="1"
              max="20"
              value={lineWidth}
              onChange={(e) => setLineWidth(Number(e.target.value))}
              className="w-24 accent-green-500"
            />
            <span className="text-gray-300 text-sm w-8">{lineWidth}px</span>
          </div>

          <div className="flex-1"></div>

          {/* Actions */}
          <button
            onClick={handleClear}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all flex items-center gap-2 shadow-lg"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
          <button
            onClick={downloadCanvas}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all flex items-center gap-2 shadow-lg"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>

        {/* Canvas */}
        <div className="flex-1 p-4 overflow-hidden">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className="w-full h-full rounded-lg cursor-crosshair shadow-xl"
          ></canvas>
        </div>
      </div>
    </div>
  );
}
