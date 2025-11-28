import React from 'react';
import { Eye, EyeOff, Lock, Unlock, Plus, Trash2, GripVertical } from 'lucide-react';
import { Layer } from '../types';

interface LayerManagerProps {
  layers: Layer[];
  activeLayerId: string;
  onSetActive: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onToggleVisible: (id: string) => void;
  onToggleLock: (id: string) => void;
  isOpen: boolean;
}

export const LayerManager: React.FC<LayerManagerProps> = ({
  layers, activeLayerId, onSetActive, onAdd, onDelete, onToggleVisible, onToggleLock, isOpen
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed right-4 top-24 w-64 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-40 animate-in slide-in-from-right-10 fade-in duration-200">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-semibold text-gray-700">Layers</h3>
        <button 
            onClick={onAdd}
            className="p-1 hover:bg-blue-100 text-blue-600 rounded transition-colors"
        >
            <Plus size={18} />
        </button>
      </div>
      
      <div className="max-h-64 overflow-y-auto">
        {layers.slice().reverse().map((layer) => (
          <div 
            key={layer.id}
            onClick={() => onSetActive(layer.id)}
            className={`flex items-center px-3 py-2 border-b border-gray-100 cursor-pointer transition-colors ${
                activeLayerId === layer.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'hover:bg-gray-50 border-l-4 border-l-transparent'
            }`}
          >
            <GripVertical size={14} className="text-gray-300 mr-2 cursor-grab" />
            
            <span className={`flex-1 text-sm truncate select-none ${activeLayerId === layer.id ? 'font-medium text-gray-800' : 'text-gray-600'}`}>
                {layer.name}
            </span>

            <div className="flex gap-1">
                <button 
                    onClick={(e) => { e.stopPropagation(); onToggleVisible(layer.id); }}
                    className="p-1 text-gray-400 hover:text-gray-700"
                >
                    {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); onToggleLock(layer.id); }}
                    className="p-1 text-gray-400 hover:text-gray-700"
                >
                    {layer.locked ? <Lock size={14} /> : <Unlock size={14} />}
                </button>
                {layers.length > 1 && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(layer.id); }}
                        className="p-1 text-gray-300 hover:text-red-500"
                    >
                        <Trash2 size={14} />
                    </button>
                )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};