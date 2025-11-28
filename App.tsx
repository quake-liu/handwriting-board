import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Toolbar } from './components/Toolbar';
import { PropertyPanel } from './components/PropertyPanel';
import { LayerManager } from './components/LayerManager';
import { AppState, Point, CanvasElement, Layer, ToolType, ElementType } from './types';
import { renderStroke, renderShape, getSplinePoints, distanceToSegment } from './utils/geometry';

// Utility to generate IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

function App() {
  // --- Refs ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastPointerPosRef = useRef<{ x: number, y: number } | null>(null);

  // --- State ---
  const [state, setState] = useState<AppState>({
    elements: [],
    layers: [{ id: 'layer-1', name: 'Layer 1', visible: true, locked: false }],
    activeLayerId: 'layer-1',
    selectedTool: 'pen',
    currentColor: '#000000',
    currentSize: 4,
    zoom: 1,
    pan: { x: 0, y: 0 },
    history: [[]],
    historyStep: 0,
  });

  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [textInput, setTextInput] = useState<{ x: number, y: number, value: string } | null>(null);
  
  // UI State
  const [isPropertyPanelOpen, setIsPropertyPanelOpen] = useState(true);
  const [isLayerPanelOpen, setIsLayerPanelOpen] = useState(false);

  // --- Helpers ---
  
  // Convert Screen (Client) coordinates to World (Canvas) coordinates
  const screenToWorld = useCallback((clientX: number, clientY: number): Point => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (clientX - rect.left - state.pan.x) / state.zoom;
    const y = (clientY - rect.top - state.pan.y) / state.zoom;
    return { x, y };
  }, [state.pan, state.zoom]);

  // Convert World coordinates to Screen coordinates (for overlays)
  const worldToScreen = useCallback((x: number, y: number) => {
    return {
        x: x * state.zoom + state.pan.x,
        y: y * state.zoom + state.pan.y
    };
  }, [state.pan, state.zoom]);

  const getPointerPos = (e: React.PointerEvent | PointerEvent): Point => {
    const worldPos = screenToWorld(e.clientX, e.clientY);
    return {
      ...worldPos,
      pressure: e.pressure || 0.5,
    };
  };

  const getActiveLayer = () => state.layers.find(l => l.id === state.activeLayerId);

  // --- History Management ---
  const saveHistory = useCallback((newElements: CanvasElement[]) => {
    setState(prev => {
      const newHistory = prev.history.slice(0, prev.historyStep + 1);
      newHistory.push(newElements);
      // Limit history to 50 steps
      if (newHistory.length > 50) newHistory.shift();
      
      return {
        ...prev,
        elements: newElements,
        history: newHistory,
        historyStep: newHistory.length - 1
      };
    });
  }, []);

  const undo = () => {
    if (state.historyStep > 0) {
      setState(prev => ({
        ...prev,
        historyStep: prev.historyStep - 1,
        elements: prev.history[prev.historyStep - 1]
      }));
    }
  };

  const redo = () => {
    if (state.historyStep < state.history.length - 1) {
      setState(prev => ({
        ...prev,
        historyStep: prev.historyStep + 1,
        elements: prev.history[prev.historyStep + 1]
      }));
    }
  };

  // --- Rendering ---
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset transform to clear entire screen
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Background Color
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    
    // Apply Infinite Canvas Transform
    // Translate then Scale
    ctx.translate(state.pan.x, state.pan.y);
    ctx.scale(state.zoom, state.zoom);
    
    // Render Layers
    [...state.layers].forEach(layer => {
      if (!layer.visible) return;

      const layerElements = state.elements.filter(el => el.layerId === layer.id);
      
      layerElements.forEach(el => {
        if (el.type === 'stroke' && el.points) {
          renderStroke(ctx, el.points, el.style);
        } else if (['rectangle', 'circle', 'line'].includes(el.type)) {
          renderShape(ctx, el.type as any, el.x!, el.y!, el.width!, el.height!, el.style);
        } else if (el.type === 'text' && el.text) {
          const fontSize = Math.max(12, el.style.size * 5);
          ctx.font = `${fontSize}px sans-serif`;
          ctx.fillStyle = el.style.color;
          ctx.textBaseline = 'top';
          
          const lines = el.text.split('\n');
          const lineHeight = fontSize * 1.2;
          lines.forEach((line, i) => {
              ctx.fillText(line, el.x!, el.y! + i * lineHeight);
          });
        }
      });
    });

    // Render Current Action
    if (isDrawing && currentPoints.length > 0) {
      if (state.selectedTool === 'pen') {
         // Smoothen the current stroke visually
         const smoothPoints = getSplinePoints(currentPoints);
         renderStroke(ctx, smoothPoints, { 
           color: state.currentColor, 
           size: state.currentSize 
         });
      } else if (['rectangle', 'circle', 'line'].includes(state.selectedTool) && dragStart) {
        const current = currentPoints[currentPoints.length - 1];
        const w = current.x - dragStart.x;
        const h = current.y - dragStart.y;
        renderShape(ctx, state.selectedTool as any, dragStart.x, dragStart.y, w, h, {
          color: state.currentColor,
          size: state.currentSize
        });
      } else if (state.selectedTool === 'eraser') {
         // Render eraser cursor
         const current = currentPoints[currentPoints.length - 1];
         ctx.beginPath();
         ctx.arc(current.x, current.y, state.currentSize * 2, 0, Math.PI * 2);
         ctx.fillStyle = 'rgba(255, 200, 200, 0.5)';
         ctx.fill();
         ctx.strokeStyle = 'red';
         ctx.lineWidth = 1 / state.zoom; // Keep outline consistent width in screen space
         ctx.stroke();
      }
    }

    ctx.restore();
  }, [state.elements, state.layers, state.zoom, state.pan, state.currentColor, state.currentSize, isDrawing, currentPoints, dragStart, state.selectedTool]);

  useEffect(() => {
    // Animation loop for smooth rendering
    let animationId: number;
    const renderLoop = () => {
      drawCanvas();
      animationId = requestAnimationFrame(renderLoop);
    };
    renderLoop();
    return () => cancelAnimationFrame(animationId);
  }, [drawCanvas]);
  
  useEffect(() => {
      // Clean up text input if tool changes
      if (state.selectedTool !== 'text' && textInput) {
          handleTextSubmit();
      }
  }, [state.selectedTool]);

  // --- Handlers ---

  const handlePointerDown = (e: React.PointerEvent) => {
    // Canvas Panning (Move Tool) logic
    if (state.selectedTool === 'move') {
        setIsDrawing(true);
        lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
        canvasRef.current?.setPointerCapture(e.pointerId);
        return;
    }

    const layer = getActiveLayer();
    if (!layer || layer.locked) return;

    const pos = getPointerPos(e);
    
    // Text Tool Logic
    if (state.selectedTool === 'text') {
      // If clicking while text input is open, submit it first
      if (textInput) {
        handleTextSubmit();
      }
      // Create new text input at clicked location
      setTextInput({ x: pos.x, y: pos.y, value: '' });
      return; 
    }

    // Drawing Logic
    setIsDrawing(true);
    setDragStart(pos);
    setCurrentPoints([pos]);
    canvasRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    
    e.preventDefault(); 
    
    // Canvas Panning Logic
    if (state.selectedTool === 'move' && lastPointerPosRef.current) {
        const dx = e.clientX - lastPointerPosRef.current.x;
        const dy = e.clientY - lastPointerPosRef.current.y;
        
        setState(prev => ({
            ...prev,
            pan: { x: prev.pan.x + dx, y: prev.pan.y + dy }
        }));
        
        lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
        return;
    }

    // Drawing Tools Logic
    const pos = getPointerPos(e);

    if (state.selectedTool === 'pen') {
      setCurrentPoints(prev => [...prev, pos]);
    } else if (state.selectedTool === 'eraser') {
      setCurrentPoints([pos]); // Track cursor for rendering
      
      const eraserRadius = state.currentSize * 2;
      
      // Filter elements
      const elementsToKeep = state.elements.filter(el => {
        if (el.layerId !== state.activeLayerId) return true; // Only erase active layer
        
        if (el.type === 'stroke' && el.points) {
          return !el.points.some(p => Math.hypot(p.x - pos.x, p.y - pos.y) < eraserRadius);
        }
        if (['rectangle', 'circle'].includes(el.type) && el.x !== undefined) {
             const cx = el.x! + el.width!/2;
             const cy = el.y! + el.height!/2;
             // Naive hit test for shapes
             return Math.hypot(cx - pos.x, cy - pos.y) > Math.max(Math.abs(el.width!), Math.abs(el.height!))/2 + eraserRadius;
        }
        // Specific logic for Lines
        if (el.type === 'line' && el.x !== undefined && el.width !== undefined && el.height !== undefined) {
             const x1 = el.x;
             const y1 = el.y;
             const x2 = el.x + el.width;
             const y2 = el.y + el.height;
             const dist = distanceToSegment(pos, {x: x1, y: y1}, {x: x2, y: y2});
             // Remove if distance to line is less than eraser radius (plus small margin)
             return dist > Math.max(5, state.currentSize) + 5; 
        }
        if (el.type === 'text' && el.x !== undefined) {
             const dist = Math.hypot(el.x - pos.x, el.y - pos.y);
             return dist > 20; // Rough text eraser
        }
        return true;
      });

      if (elementsToKeep.length !== state.elements.length) {
        setState(prev => ({ ...prev, elements: elementsToKeep }));
      }

    } else {
      // Shapes: just update current point for preview
      setCurrentPoints(prev => [...prev, pos]);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    lastPointerPosRef.current = null;
    canvasRef.current?.releasePointerCapture(e.pointerId);
    containerRef.current?.releasePointerCapture(e.pointerId);

    if (state.selectedTool === 'move') return;

    const layer = getActiveLayer();
    if (!layer || layer.locked) return;

    const endPos = getPointerPos(e);
    
    if (state.selectedTool === 'pen') {
      const finalPoints = getSplinePoints(currentPoints);
      const newElement: CanvasElement = {
        id: generateId(),
        type: 'stroke',
        layerId: layer.id,
        points: finalPoints,
        style: { color: state.currentColor, size: state.currentSize }
      };
      saveHistory([...state.elements, newElement]);
    } 
    else if (['rectangle', 'circle', 'line'].includes(state.selectedTool) && dragStart) {
      const w = endPos.x - dragStart.x;
      const h = endPos.y - dragStart.y;
      
      if (Math.abs(w) > 5 || Math.abs(h) > 5) { 
        const newElement: CanvasElement = {
            id: generateId(),
            type: state.selectedTool as ElementType,
            layerId: layer.id,
            x: dragStart.x,
            y: dragStart.y,
            width: w,
            height: h,
            style: { color: state.currentColor, size: state.currentSize }
        };
        saveHistory([...state.elements, newElement]);
      }
    }
    else if (state.selectedTool === 'eraser') {
        saveHistory(state.elements);
    }
    
    setCurrentPoints([]);
    setDragStart(null);
  };

  const handleTextSubmit = () => {
    if (textInput && textInput.value.trim() !== '') {
       const newElement: CanvasElement = {
        id: generateId(),
        type: 'text',
        layerId: state.activeLayerId,
        x: textInput.x,
        y: textInput.y,
        text: textInput.value,
        style: { color: state.currentColor, size: state.currentSize }
      };
      saveHistory([...state.elements, newElement]);
    }
    setTextInput(null);
  };

  // --- Zoom Logic ---
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const zoomIntensity = 0.1;
        const direction = e.deltaY > 0 ? -1 : 1;
        const newZoom = Math.min(Math.max(0.1, state.zoom + direction * zoomIntensity), 5);
        
        // Zoom towards pointer
        const rect = canvasRef.current!.getBoundingClientRect();
        const pointerX = e.clientX - rect.left;
        const pointerY = e.clientY - rect.top;
        
        // Calculate world position of pointer before zoom
        const worldX = (pointerX - state.pan.x) / state.zoom;
        const worldY = (pointerY - state.pan.y) / state.zoom;
        
        // Calculate new pan to keep world position at pointer
        const newPanX = pointerX - worldX * newZoom;
        const newPanY = pointerY - worldY * newZoom;

        setState(prev => ({ ...prev, zoom: newZoom, pan: { x: newPanX, y: newPanY } }));
    }
  };

  const changeZoom = (delta: number) => {
      const newZoom = Math.min(Math.max(0.1, state.zoom + delta), 5);
      // Zoom to center
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const worldX = (centerX - state.pan.x) / state.zoom;
      const worldY = (centerY - state.pan.y) / state.zoom;
      const newPanX = centerX - worldX * newZoom;
      const newPanY = centerY - worldY * newZoom;

      setState(prev => ({ ...prev, zoom: newZoom, pan: { x: newPanX, y: newPanY } }));
  };

  // --- File Operations ---
  const handleSave = () => {
    const data = JSON.stringify({ elements: state.elements, layers: state.layers, version: 1 });
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zenflow-project-${Date.now()}.json`;
    a.click();
  };

  const handleLoadClick = () => {
    // Directly trigger file input click to avoid browser security blocking (popup blockers)
    // We defer the "unsaved changes" confirmation to when the user actually picks a file
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
        fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check for unsaved changes HERE, after file selection
    if (state.elements.length > 0) {
        if (!window.confirm('Loading a new file will replace the current canvas. Any unsaved changes will be lost. Continue?')) {
            // Reset input so change event fires next time even for same file
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const result = event.target?.result as string;
            if (!result) return;
            const data = JSON.parse(result);
            
            // Validate basic structure
            if (data.elements && Array.isArray(data.elements)) {
                // Ensure layers exist, default to one if missing
                const newLayers = (data.layers && Array.isArray(data.layers) && data.layers.length > 0) 
                    ? data.layers 
                    : [{ id: 'layer-1', name: 'Layer 1', visible: true, locked: false }];
                
                // IMPORTANT: activeLayerId must exist in the new layers list
                const newActiveLayerId = newLayers[0].id;

                setState(prev => ({
                    ...prev,
                    elements: data.elements,
                    layers: newLayers,
                    activeLayerId: newActiveLayerId,
                    // Reset view
                    zoom: 1,
                    pan: { x: 0, y: 0 },
                    // Reset history
                    history: [data.elements],
                    historyStep: 0
                }));
            } else {
                alert('Invalid project file format.');
            }
        } catch (err) {
            console.error(err);
            alert('Failed to load project file.');
        }
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `zenflow-export-${Date.now()}.png`;
    a.click();
  };

  const handleClear = () => {
    if (state.elements.length === 0) return;

    // Use setTimeout to ensure the button click event finishes propagating before the alert freezes the UI
    setTimeout(() => {
        if (window.confirm('Are you sure you want to clear the canvas?')) {
            saveHistory([]);
        }
    }, 50);
  };

  // --- Layer Operations ---
  const addLayer = () => {
    const newLayer: Layer = { 
        id: generateId(), 
        name: `Layer ${state.layers.length + 1}`, 
        visible: true, 
        locked: false 
    };
    setState(prev => ({
        ...prev,
        layers: [...prev.layers, newLayer],
        activeLayerId: newLayer.id
    }));
  };

  // --- Resize Canvas ---
  useEffect(() => {
    const resize = () => {
        if (canvasRef.current) {
            canvasRef.current.width = window.innerWidth;
            canvasRef.current.height = window.innerHeight;
            drawCanvas();
        }
    };
    window.addEventListener('resize', resize);
    resize();
    return () => window.removeEventListener('resize', resize);
  }, [drawCanvas]);


  return (
    <div className="flex flex-col h-screen w-screen bg-gray-100 overflow-hidden font-sans">
      
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".json"
        onChange={handleFileChange}
      />

      {/* UI Components */}
      <PropertyPanel
        color={state.currentColor}
        setColor={(c) => setState(prev => ({ ...prev, currentColor: c }))}
        size={state.currentSize}
        setSize={(s) => setState(prev => ({ ...prev, currentSize: s }))}
        canUndo={state.historyStep > 0}
        canRedo={state.historyStep < state.history.length - 1}
        onUndo={undo}
        onRedo={redo}
        onClear={handleClear}
        onSave={handleSave}
        onLoad={handleLoadClick}
        onExport={handleExport}
        toggleLayerPanel={() => setIsLayerPanelOpen(!isLayerPanelOpen)}
        isLayerPanelOpen={isLayerPanelOpen}
        zoom={state.zoom}
        onZoomIn={() => changeZoom(0.1)}
        onZoomOut={() => changeZoom(-0.1)}
      />

      <Toolbar
        selectedTool={state.selectedTool}
        onSelectTool={(tool) => setState(prev => ({ ...prev, selectedTool: tool }))}
        isPropertyPanelOpen={isPropertyPanelOpen}
        togglePropertyPanel={() => setIsPropertyPanelOpen(!isPropertyPanelOpen)}
      />

      <LayerManager
        isOpen={isLayerPanelOpen}
        layers={state.layers}
        activeLayerId={state.activeLayerId}
        onSetActive={(id) => setState(prev => ({ ...prev, activeLayerId: id }))}
        onAdd={addLayer}
        onDelete={(id) => {
            setState(prev => {
                const newLayers = prev.layers.filter(l => l.id !== id);
                return { 
                    ...prev, 
                    layers: newLayers, 
                    activeLayerId: prev.activeLayerId === id ? newLayers[newLayers.length-1]?.id || '' : prev.activeLayerId 
                };
            });
        }}
        onToggleVisible={(id) => setState(prev => ({
            ...prev,
            layers: prev.layers.map(l => l.id === id ? { ...l, visible: !l.visible } : l)
        }))}
        onToggleLock={(id) => setState(prev => ({
            ...prev,
            layers: prev.layers.map(l => l.id === id ? { ...l, locked: !l.locked } : l)
        }))}
      />

      {/* Canvas Container */}
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-hidden bg-gray-200 cursor-crosshair touch-none"
        onWheel={handleWheel}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="absolute top-0 left-0 touch-none shadow-none bg-white"
          style={{ 
            width: '100%', 
            height: '100%',
            cursor: state.selectedTool === 'move' ? (isDrawing ? 'grabbing' : 'grab') : 'crosshair'
          }}
        />

        {/* Text Input Overlay */}
        {textInput && (
            <div 
                className="absolute z-50 bg-white p-2 shadow-xl rounded-lg border border-blue-500 flex flex-col gap-2"
                style={{ 
                    // Convert world coords back to screen coords for positioning
                    left: worldToScreen(textInput.x, textInput.y).x, 
                    top: worldToScreen(textInput.x, textInput.y).y,
                    transform: 'translate(0, 0)', 
                }}
            >
                <textarea
                    autoFocus
                    className="outline-none bg-transparent min-w-[200px] min-h-[50px] resize"
                    placeholder="Type text here..."
                    value={textInput.value}
                    onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
                    onKeyDown={(e) => {
                        e.stopPropagation(); // Prevent global shortcuts
                        // Enter submits, Shift+Enter new line
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleTextSubmit();
                        }
                        if (e.key === 'Escape') setTextInput(null);
                    }}
                    onPointerDown={(e) => e.stopPropagation()} // Stop canvas pointer down from firing
                    style={{ 
                        color: state.currentColor, 
                        fontSize: `${Math.max(12, state.currentSize * 5) * state.zoom}px`,
                        fontFamily: 'sans-serif'
                    }}
                />
                <div className="flex justify-end gap-2">
                    <button 
                        onClick={() => setTextInput(null)}
                        className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded"
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleTextSubmit}
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        Add
                    </button>
                </div>
            </div>
        )}
        
        {/* Helper Instructions */}
        <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur px-3 py-1 rounded-lg text-xs text-gray-500 pointer-events-none select-none">
            {state.selectedTool === 'move' ? 'Drag to pan canvas' : 
             state.selectedTool === 'text' ? 'Click to add text box' : 
             'Draw or select tools'}
        </div>
      </div>
    </div>
  );
}

export default App;