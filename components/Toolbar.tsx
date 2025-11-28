import React from 'react';
import { 
  Pencil, Eraser, Square, Circle, Minus, Type, 
  Hand, MousePointer2, Settings2 
} from 'lucide-react';
import { ToolType } from '../types';

interface ToolbarProps {
  selectedTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  isPropertyPanelOpen: boolean;
  togglePropertyPanel: () => void;
}

const tools: { id: ToolType; icon: React.ElementType; label: string }[] = [
  { id: 'pen', icon: Pencil, label: 'Pen' },
  { id: 'eraser', icon: Eraser, label: 'Eraser' },
  { id: 'rectangle', icon: Square, label: 'Rect' },
  { id: 'circle', icon: Circle, label: 'Circle' },
  { id: 'line', icon: Minus, label: 'Line' },
  { id: 'text', icon: Type, label: 'Text' },
  { id: 'move', icon: Hand, label: 'Pan' },
];

export const Toolbar: React.FC<ToolbarProps> = ({ 
  selectedTool, 
  onSelectTool,
  isPropertyPanelOpen,
  togglePropertyPanel
}) => {
  return (
    <div className="fixed left-4 top-1/2 -translate-y-1/2 bg-white shadow-xl rounded-2xl flex flex-col p-2 gap-2 z-50 border border-gray-200">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => onSelectTool(tool.id)}
          className={`p-3 rounded-xl transition-all duration-200 group relative ${
            selectedTool === tool.id
              ? 'bg-blue-600 text-white shadow-lg scale-105'
              : 'text-gray-500 hover:bg-gray-100 hover:text-blue-600'
          }`}
          title={tool.label}
        >
          <tool.icon size={24} />
          {/* Tooltip */}
          <span className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
            {tool.label}
          </span>
        </button>
      ))}
      
      <div className="h-px bg-gray-200 my-1" />
      
      <button
        onClick={togglePropertyPanel}
        className={`p-3 rounded-xl transition-all duration-200 ${
            isPropertyPanelOpen ? 'bg-gray-200 text-gray-800' : 'text-gray-500 hover:bg-gray-100'
        }`}
      >
        <Settings2 size={24} />
      </button>
    </div>
  );
};