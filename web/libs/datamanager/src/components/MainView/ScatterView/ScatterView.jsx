import { observer } from "mobx-react";
import { useEffect, useRef, useState } from "react";
import { Block } from "../../../utils/bem";
import { getRoot } from "mobx-state-tree";

import "./ScatterView.scss";

import { drawScatter } from "./draw-scatter";
import { useScatterInteractions } from "./use-scatter-interactions";

/**
 * Minimal scatter plot view.
 * Expects each task to have numeric `x` and `y` properties under the data object (e.g. task.data.x, task.data.y).
 * Tasks missing coordinates are ignored.
 *
 * Props:
 *   data: Task[] – array of tasks
 *   view: Tab model with selected state
 *   loadMore: () => Promise – called when we reach near edge (TODO)
 *   onChange: (taskID) => void – selection callback
 */
export const ScatterView = observer(({ data = [], view, onChange }) => {
  const canvasRef = useRef(null);
  const [hoveredId, setHoveredId] = useState(null);

  // Re-draw whenever data changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const points = (data.filter(
      (t) => t.data && typeof t.data.x === "number" && typeof t.data.y === "number"
    ) ?? []);

    const palette = {
      animal: "#ff6b6b",
      vehicle: "#48dbfb",
      landscape: "#1dd1a1",
      interior: "#feca57",
      people: "#5f27cd",
      food: "#ff9ff3",
      default: "#3b82f6",
    };

    drawScatter({
      canvas,
      points,
      hoveredId,
      selectedIds: new Set(view.selected ? data.filter(d=>view.selected.isSelected(d.id)).map(d=>d.id) : []),
      palette,
    });
  }, [data, hoveredId, view.selected]);

  // keep pointsRef for interaction
  const pointsRef = useRef([]);

  // After each draw we need to fill pointsRef with canvas coordinates used by drawScatter. For brevity we compute quickly (not ideal perf)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // replicate scale logic quickly to get canvas positions for interactions
    const pts = data.filter((t) => t.data && typeof t.data.x === "number" && typeof t.data.y === "number");
    if (pts.length === 0) { pointsRef.current = []; return; }
    const xs = pts.map(p=>p.data.x);
    const ys = pts.map(p=>p.data.y);
    const minX=Math.min(...xs), maxX=Math.max(...xs);
    const minY=Math.min(...ys), maxY=Math.max(...ys);
    const width = canvas.clientWidth; const height=canvas.clientHeight; const pad=20;
    const sx=(v)=>((v-minX)/(maxX-minX||1))*(width-pad*2)+pad;
    const sy=(v)=>((v-minY)/(maxY-minY||1))*(height-pad*2)+pad;
    pointsRef.current = pts.map(p=>({
      id:p.id,
      canvasX:sx(p.data.x),
      canvasY:height-sy(p.data.y),
      category:p.data.category||"default",
      text:p.data.text,
    }));
  }, [data]);

  useScatterInteractions({
    canvasRef,
    pointsRef,
    onHover: setHoveredId,
    onSelect: (id) => {
      // First toggle selection via parent callback
      onChange?.(id);

      // Find full task object by id
      const item = data.find((t) => t.id === id);
      if (item) {
        // Mimic Table's behavior – open labeling editor
        const root = getRoot(view);
        if (root?.startLabeling) {
          root.startLabeling(item);
        }
      }
    },
  });

  const hoveredPointDetails = hoveredId ? pointsRef.current.find(p=>p.id===hoveredId) : null;

  return (
    <Block name="scatter-view">
      <canvas 
        ref={canvasRef} 
        style={{ width: "100%", height: "100%" }}
        /* interaction handled by hook */
      />
      
      {/* Controls - placeholders for future zoom/pan functionality */}
      <Block name="scatter-view" elem="controls">
        <div 
          style={{ 
            padding: '4px 6px', 
            background: 'white', 
            borderRadius: '4px',
            cursor: 'default',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            fontSize: '12px',
            userSelect: 'none',
          }}
        >
          {pointsRef.current.length} points
        </div>
      </Block>
      
      {/* No data message */}
      {pointsRef.current.length === 0 && (
        <Block name="scatter-view" elem="no-data">
          No coordinate data found! Tasks should have x and y values in their data object.<br/>
          {data.length > 0 ? `Found ${data.length} tasks but none have coordinates.` : 'No tasks available.'}
        </Block>
      )}
      
      {/* Tooltip for hovered point */}
      {hoveredPointDetails && (
        <Block name="scatter-view" elem="tooltip" style={{
          bottom: '10px',
          left: '10px',
        }}>
          {hoveredPointDetails.text || `Task ${hoveredPointDetails.id}`}<br/>
          {hoveredPointDetails.category && <span>Category: {hoveredPointDetails.category}</span>}
        </Block>
      )}
    </Block>
  );
}); 