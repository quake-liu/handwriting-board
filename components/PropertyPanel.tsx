import React, { useRef } from 'react';
import { Undo2, Redo2, Save, FolderOpen, ImageDown, Layers, Trash2, ZoomIn, ZoomOut } from 'lucide-react';

interface PropertyPanelProps {
  color: string;
  setColor: (c: string) => void;
  size: number;
  setSize: (s: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onSave: () => void;
  onLoad: () => void;
  onExport: () => void;
  toggleLayerPanel: () => void;
  isLayerPanelOpen: boolean;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

const PRESET_COLORS = [
  '#000000', '#EF4444', '#3B82F6', '#10B981', 
  '#F59E0B', '#8B5CF6', '#EC4899', '#6B7280'
];

export const PropertyPanel: React.FC<PropertyPanelProps> = ({
  color, setColor, size, setSize,
  canUndo, canRedo, onUndo, onRedo,
  onClear, onSave, onLoad, onExport,
  toggleLayerPanel, isLayerPanelOpen,
  zoom, onZoomIn, onZoomOut
}) => {
  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <div className="fixed top-4 left-4 right-4 h-16 bg-white shadow-md rounded-2xl flex items-center justify-between px-4 z-40 border border-gray-100 overflow-x-auto">
      
      {/* Left: Branding & History */}
      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mr-2 hidden lg:block">
          ZenFlow
        </h1>
        
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button 
            disabled={!canUndo}
            onClick={(e) => handleAction(e, onUndo)}
            className={`p-2 rounded-md transition-colors ${!canUndo ? 'text-gray-300' : 'hover:bg-white hover:shadow-sm text-gray-700'}`}
            title="Undo"
          >
            <Undo2 size={20} />
          </button>
          <button 
            disabled={!canRedo}
            onClick={(e) => handleAction(e, onRedo)}
            className={`p-2 rounded-md transition-colors ${!canRedo ? 'text-gray-300' : 'hover:bg-white hover:shadow-sm text-gray-700'}`}
            title="Redo"
          >
            <Redo2 size={20} />
          </button>
        </div>
        
        {/* Zoom Controls */}
        <div className="flex bg-gray-100 rounded-lg p-1 items-center">
            <button onClick={(e) => handleAction(e, onZoomOut)} className="p-2 hover:bg-white hover:shadow-sm rounded-md text-gray-700" title="Zoom Out">
                <ZoomOut size={18} />
            </button>
            <span className="text-xs font-medium w-12 text-center select-none">{Math.round(zoom * 100)}%</span>
            <button onClick={(e) => handleAction(e, onZoomIn)} className="p-2 hover:bg-white hover:shadow-sm rounded-md text-gray-700" title="Zoom In">
                <ZoomIn size={18} />
            </button>
        </div>
      </div>

      {/* Center: Style Controls */}
      <div className="flex items-center gap-4 shrink-0 mx-4">
        {/* Color Picker */}
        <div className="flex items-center gap-2">
            <div className="flex gap-1 hidden sm:flex">
                {PRESET_COLORS.map(c => (
                    <button
                        key={c}
                        onClick={(e) => handleAction(e, () => setColor(c))}
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${color === c ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-110'}`}
                        style={{ backgroundColor: c }}
                        title={c}
                    />
                ))}
            </div>
            <input 
                type="color" 
                value={color}
                onChange={(e) => setColor(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-8 h-8 rounded cursor-pointer overflow-hidden border-0 p-0"
                title="Custom Color"
            />
        </div>

        <div className="w-px h-8 bg-gray-200" />

        {/* Size Slider */}
        <div className="flex items-center gap-3">
            <div 
                className="rounded-full bg-black transition-all flex-shrink-0"
                style={{ width: Math.min(24, size), height: Math.min(24, size), backgroundColor: color }}
            />
            <input 
                type="range" 
                min="1" 
                max="50" 
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                onClick={(e) => e.stopPropagation()}
                className="w-24 md:w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                title={`Brush Size: ${size}px`}
            />
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button 
            onClick={(e) => handleAction(e, toggleLayerPanel)}
            className={`p-2 rounded-lg flex items-center gap-2 transition-colors ${isLayerPanelOpen ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-700'}`}
            title="Layers"
        >
            <Layers size={20} />
            <span className="text-sm font-medium hidden sm:block">Layers</span>
        </button>

        <div className="w-px h-8 bg-gray-200" />

        <button onClick={(e) => handleAction(e, onLoad)} className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Open Project (JSON)">
            <FolderOpen size={20} />
        </button>
        <button onClick={(e) => handleAction(e, onSave)} className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Save Project (JSON)">
            <Save size={20} />
        </button>
        <button onClick={(e) => handleAction(e, onExport)} className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg" title="Export PNG">
            <ImageDown size={20} />
        </button>
        <button onClick={(e) => handleAction(e, onClear)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Clear Canvas">
            <Trash2 size={20} />
        </button>
      </div>
    </div>
  );
};