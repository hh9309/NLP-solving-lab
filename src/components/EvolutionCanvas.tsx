import React, { useRef, useEffect, useState } from "react";
import { Point, ObjectiveFunction, Constraint, IterationStep } from "../types";
import { getEigenvalues } from "../algorithms";
import { RefreshCw, RotateCcw, HelpCircle, Box, X } from "lucide-react";

interface EvolutionCanvasProps {
  func: ObjectiveFunction;
  activeConstraints: Constraint[];
  trajectory: IterationStep[];
  selectedStepIndex: number;
  onSelectStep: (idx: number) => void;
  onSetStartPoint: (pt: Point) => void;
  algId: string;
  allTrajectories?: Record<string, IterationStep[]>;
  enabledAlgs?: string[];
  showOverlay?: boolean;
}

export const EvolutionCanvas: React.FC<EvolutionCanvasProps> = ({
  func,
  activeConstraints,
  trajectory,
  selectedStepIndex,
  onSelectStep,
  onSetStartPoint,
  algId,
  allTrajectories,
  enabledAlgs,
  showOverlay = false,
}) => {
  const canvas2DRef = useRef<HTMLCanvasElement | null>(null);
  const canvas3DRef = useRef<HTMLCanvasElement | null>(null);
  const canvasMini3DRef = useRef<HTMLCanvasElement | null>(null);

  const [showMini3D, setShowMini3D] = useState<boolean>(false);

  // 3D Rotation Angles
  const [azimuth, setAzimuth] = useState<number>(-45); // in degrees
  const [elevation, setElevation] = useState<number>(30); // in degrees
  const [isDragging3D, setIsDragging3D] = useState<boolean>(false);
  const dragStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Hover Tooltip State for 2D Canvas Point inspection
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    fx: number;
    gradNorm: number;
    algName: string;
    stepIndex: number;
    canvasX: number;
    canvasY: number;
  } | null>(null);

  const bounds = func.bounds;

  // Track size of container to make canvases fully responsive
  const [dimensions, setDimensions] = useState({ width: 320, height: 320 });
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        // Keep square aspect ratio, height equal to width (capped for readability)
        const size = Math.min(width, 480);
        setDimensions({ width: size, height: size });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Recalculate and draw 2D Contour Canvas
  useEffect(() => {
    const canvas = canvas2DRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = dimensions.width;
    const height = dimensions.height;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Coordinate conversion functions with elite scientific margins
    const paddingLeft = 24;
    const paddingRight = 16;
    const paddingTop = 16;
    const paddingBottom = 24;

    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;

    const getScreenX = (x: number) => {
      return paddingLeft + ((x - bounds.xMin) / (bounds.xMax - bounds.xMin)) * plotWidth;
    };
    const getScreenY = (y: number) => {
      return height - paddingBottom - ((y - bounds.yMin) / (bounds.yMax - bounds.yMin)) * plotHeight;
    };

    // Fill overall background with soft bone white first
    ctx.fillStyle = "#fafaf9";
    ctx.fillRect(0, 0, width, height);

    // 1. Draw objective function landscape heatmap
    const gridSize = 60;
    const cellW = plotWidth / gridSize;
    const cellH = plotHeight / gridSize;

    // First pass: evaluate grid to find min/max for dynamic scaling
    const vals: number[][] = [];
    let minF = Infinity;
    let maxF = -Infinity;

    for (let i = 0; i < gridSize; i++) {
      vals[i] = [];
      const x = bounds.xMin + (i / gridSize) * (bounds.xMax - bounds.xMin);
      for (let j = 0; j < gridSize; j++) {
        const y = bounds.yMin + (j / gridSize) * (bounds.yMax - bounds.yMin);
        const val = func.evaluate(x, y);
        vals[i][j] = val;
        if (val < minF) minF = val;
        if (val > maxF) maxF = val;
      }
    }

    // Map function value to color (Pale, elegant Sage-Teal to Soft Rose)
    const getColor = (v: number) => {
      // Use log scale for highly variable functions like Rosenbrock
      const normalized = maxF === minF ? 0 : Math.log(v - minF + 1) / Math.log(maxF - minF + 1);
      // Interpolate colors:
      // High: Soft rose #fce7f3 (252, 231, 243)
      // Low: Soft mint/sage #e2ece9 (226, 236, 233)
      const r = Math.round(226 + normalized * (252 - 226));
      const g = Math.round(236 + normalized * (231 - 236));
      const b = Math.round(233 + normalized * (243 - 233));
      return `rgb(${r}, ${g}, ${b})`;
    };

    // Render cells inside the plotting area
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        ctx.fillStyle = getColor(vals[i][j]);
        // j corresponds to y, which is drawn bottom-to-top
        ctx.fillRect(paddingLeft + i * cellW, height - paddingBottom - (j + 1) * cellH, cellW + 0.5, cellH + 0.5);
      }
    }

    // 2. Draw isolines (contour lines)
    const isolineCount = 12;
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = "rgba(97, 139, 129, 0.25)";

    for (let l = 1; l <= isolineCount; l++) {
      const targetVal = minF + (l / (isolineCount + 1)) * (maxF - minF);
      ctx.beginPath();
      for (let i = 0; i < gridSize - 1; i++) {
        const x1 = bounds.xMin + (i / gridSize) * (bounds.xMax - bounds.xMin);
        const x2 = bounds.xMin + ((i + 1) / gridSize) * (bounds.xMax - bounds.xMin);
        for (let j = 0; j < gridSize - 1; j++) {
          const y1 = bounds.yMin + (j / gridSize) * (bounds.yMax - bounds.yMin);
          const y2 = bounds.yMin + ((j + 1) / gridSize) * (bounds.yMax - bounds.yMin);

          // Bilinear interpolation for isoline drawing
          const v00 = vals[i][j];
          const v10 = vals[i + 1][j];
          const v01 = vals[i][j + 1];
          const v11 = vals[i + 1][j + 1];

          // Check cell boundaries for crossings
          if ((v00 < targetVal && v10 >= targetVal) || (v00 >= targetVal && v10 < targetVal)) {
            const ratio = (targetVal - v00) / (v10 - v00);
            ctx.moveTo(getScreenX(x1 + ratio * (x2 - x1)), getScreenY(y1));
          }
          if ((v00 < targetVal && v01 >= targetVal) || (v00 >= targetVal && v01 < targetVal)) {
            const ratio = (targetVal - v00) / (v01 - v00);
            ctx.lineTo(getScreenX(x1), getScreenY(y1 + ratio * (y2 - y1)));
          }
        }
      }
      ctx.stroke();
    }

    // 3. Shade Feasible & Non-feasible region
    if (activeConstraints.length > 0) {
      ctx.save();
      // Render non-feasible area using a soft translucent diagonal strip pattern
      const pCanvas = document.createElement("canvas");
      pCanvas.width = 12;
      pCanvas.height = 12;
      const pCtx = pCanvas.getContext("2d");
      if (pCtx) {
        pCtx.strokeStyle = "rgba(225, 112, 112, 0.15)";
        pCtx.lineWidth = 1.5;
        pCtx.beginPath();
        pCtx.moveTo(0, 12);
        pCtx.lineTo(12, 0);
        pCtx.stroke();
      }
      const pattern = ctx.createPattern(pCanvas, "repeat");

      for (let i = 0; i < gridSize; i++) {
        const x = bounds.xMin + (i / gridSize) * (bounds.xMax - bounds.xMin);
        for (let j = 0; j < gridSize; j++) {
          const y = bounds.yMin + (j / gridSize) * (bounds.yMax - bounds.yMin);
          // Check if it violates any constraint
          const violated = activeConstraints.some((c) => c.evaluate(x, y) > 0);
          if (violated && pattern) {
            ctx.fillStyle = pattern;
            ctx.fillRect(paddingLeft + i * cellW, height - paddingBottom - (j + 1) * cellH, cellW + 0.5, cellH + 0.5);
          }
        }
      }
      ctx.restore();

      // Draw constraint borders
      activeConstraints.forEach((cons) => {
        ctx.strokeStyle = "rgba(190, 80, 80, 0.65)";
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        // Trace boundary where evaluate(x,y) === 0
        let isFirst = true;
        for (let i = 0; i < gridSize; i++) {
          const x = bounds.xMin + (i / gridSize) * (bounds.xMax - bounds.xMin);
          // Solve g(x,y) = 0 numerically for y to draw a clean boundary curve
          let boundaryY: number | null = null;
          // Binary search for zero-crossing along y column
          let yLow = bounds.yMin;
          let yHigh = bounds.yMax;
          const gLow = cons.evaluate(x, yLow);
          const gHigh = cons.evaluate(x, yHigh);

          if (gLow * gHigh < 0) {
            for (let iter = 0; iter < 10; iter++) {
              const midY = (yLow + yHigh) / 2;
              const gMid = cons.evaluate(x, midY);
              if (gMid * gLow < 0) {
                yHigh = midY;
              } else {
                yLow = midY;
              }
            }
            boundaryY = (yLow + yHigh) / 2;
          }

          if (boundaryY !== null) {
            const sx = getScreenX(x);
            const sy = getScreenY(boundaryY);
            if (isFirst) {
              ctx.moveTo(sx, sy);
              isFirst = false;
            } else {
              ctx.lineTo(sx, sy);
            }
          }
        }
        ctx.stroke();

        // Label constraints (safely positioned within padding-padded view)
        ctx.fillStyle = "rgba(160, 60, 60, 0.9)";
        ctx.font = "italic 9px font-sans";
        ctx.fillText(cons.name, getScreenX(bounds.xMin + 0.15), getScreenY(bounds.yMax - 0.4) + 12);
      });
    }

    // Draw a neat bounding border around the scientific plotting area
    ctx.strokeStyle = "rgba(148, 163, 184, 0.45)";
    ctx.lineWidth = 1;
    ctx.strokeRect(paddingLeft, paddingTop, plotWidth, plotHeight);

    // 4. Draw Trajectory path
    if (showOverlay && allTrajectories && enabledAlgs) {
      enabledAlgs.forEach((id) => {
        const path = allTrajectories[id];
        if (!path || path.length === 0) return;

        const isMain = id === algId;
        const color = id === "gd" ? "#eab308" : id === "newton" ? "#10b981" : id === "bfgs" ? "#3b82f6" : "#ec4899";

        ctx.strokeStyle = color;
        ctx.lineWidth = isMain ? 2.8 : id === "newton" ? 2.5 : 1.8;
        
        // Custom line dash styles
        if (id === "gd") {
          ctx.setLineDash([4, 3]);
        } else if (id === "penalty") {
          ctx.setLineDash([2, 2]);
        } else {
          ctx.setLineDash([]);
        }

        ctx.beginPath();
        path.forEach((step, idx) => {
          const sx = getScreenX(step.x);
          const sy = getScreenY(step.y);
          if (idx === 0) {
            ctx.moveTo(sx, sy);
          } else {
            ctx.lineTo(sx, sy);
          }
        });
        ctx.stroke();
        ctx.setLineDash([]); // Reset line dash

        // Draw iteration nodes
        path.forEach((step, idx) => {
          const sx = getScreenX(step.x);
          const sy = getScreenY(step.y);

          const isSelected = isMain && idx === selectedStepIndex;
          const isStart = idx === 0;
          const isEnd = idx === path.length - 1;

          if (isStart) {
            ctx.fillStyle = "#ec4899"; // Start is pink
            ctx.beginPath();
            ctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 1.0;
            ctx.stroke();
          } else if (isEnd) {
            ctx.fillStyle = "#10b981"; // End is emerald
            ctx.beginPath();
            ctx.arc(sx, sy, 5.0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 1.0;
            ctx.stroke();
          } else if (isSelected) {
            ctx.fillStyle = "#312e81"; // Highlight selected step for main algorithm
            ctx.beginPath();
            ctx.arc(sx, sy, 5.0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 1.2;
            ctx.stroke();
          } else {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(sx, sy, isMain ? 2.5 : 1.5, 0, Math.PI * 2);
            ctx.fill();
          }

          // Search direction arrows (only for main algorithm if active)
          if (isMain && idx > 0 && idx < path.length && (isSelected || path.length < 15)) {
            const prev = path[idx - 1];
            const px = getScreenX(prev.x);
            const py = getScreenY(prev.y);
            const angle = Math.atan2(sy - py, sx - px);
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(sx - 8 * Math.cos(angle), sy - 8 * Math.sin(angle));
            ctx.lineTo(
              sx - 8 * Math.cos(angle) - 6 * Math.cos(angle - Math.PI / 6),
              sy - 8 * Math.sin(angle) - 6 * Math.sin(angle - Math.PI / 6)
            );
            ctx.moveTo(sx - 8 * Math.cos(angle), sy - 8 * Math.sin(angle));
            ctx.lineTo(
              sx - 8 * Math.cos(angle) - 6 * Math.cos(angle + Math.PI / 6),
              sy - 8 * Math.sin(angle) - 6 * Math.sin(angle + Math.PI / 6)
            );
            ctx.stroke();
          }
        });
      });
    } else if (trajectory.length > 0) {
      // Line path with timestamp heat map gradient (Cool Blue -> Warm Orange)
      ctx.lineWidth = 2.6;
      ctx.shadowColor = "rgba(59, 130, 246, 0.25)";
      ctx.shadowBlur = 4;

      const getHeatmapColor = (index: number, total: number) => {
        if (total <= 1) return "rgb(59, 130, 246)";
        const ratio = index / (total - 1);
        const r = Math.round(59 + ratio * (249 - 59));
        const g = Math.round(130 + ratio * (115 - 130));
        const b = Math.round(246 + ratio * (22 - 246));
        return `rgb(${r}, ${g}, ${b})`;
      };

      for (let idx = 1; idx < trajectory.length; idx++) {
        const prev = trajectory[idx - 1];
        const step = trajectory[idx];
        const px = getScreenX(prev.x);
        const py = getScreenY(prev.y);
        const sx = getScreenX(step.x);
        const sy = getScreenY(step.y);

        ctx.strokeStyle = getHeatmapColor(idx, trajectory.length);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(sx, sy);
        ctx.stroke();
      }
      ctx.shadowBlur = 0; // reset shadow

      // Draw iteration nodes with heatmap colors
      trajectory.forEach((step, idx) => {
        const sx = getScreenX(step.x);
        const sy = getScreenY(step.y);

        const isSelected = idx === selectedStepIndex;
        const isStart = idx === 0;
        const isEnd = idx === trajectory.length - 1;

        const nodeColor = getHeatmapColor(idx, trajectory.length);

        if (isStart) {
          ctx.fillStyle = "rgb(59, 130, 246)"; // Cool blue start
          ctx.beginPath();
          ctx.arc(sx, sy, 6.0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Outer halo
          ctx.strokeStyle = "rgba(59, 130, 246, 0.4)";
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.arc(sx, sy, 9.0, 0, Math.PI * 2);
          ctx.stroke();
        } else if (isEnd) {
          ctx.fillStyle = "rgb(249, 115, 22)"; // Warm orange end
          ctx.beginPath();
          ctx.arc(sx, sy, 6.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Outer halo
          ctx.strokeStyle = "rgba(249, 115, 22, 0.4)";
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.arc(sx, sy, 9.5, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.fillStyle = isSelected ? "#312e81" : nodeColor;
          ctx.beginPath();
          ctx.arc(sx, sy, isSelected ? 5.0 : 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.0;
          ctx.stroke();
        }

        // Draw dynamic search arrows for highlighted/all steps
        if (idx > 0 && idx < trajectory.length && (isSelected || trajectory.length < 15)) {
          const prev = trajectory[idx - 1];
          const px = getScreenX(prev.x);
          const py = getScreenY(prev.y);
          // Angle of vector
          const angle = Math.atan2(sy - py, sx - px);
          ctx.strokeStyle = isSelected ? "#312e81" : nodeColor;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(sx - 8 * Math.cos(angle), sy - 8 * Math.sin(angle));
          ctx.lineTo(
            sx - 8 * Math.cos(angle) - 6 * Math.cos(angle - Math.PI / 6),
            sy - 8 * Math.sin(angle) - 6 * Math.sin(angle - Math.PI / 6)
          );
          ctx.moveTo(sx - 8 * Math.cos(angle), sy - 8 * Math.sin(angle));
          ctx.lineTo(
            sx - 8 * Math.cos(angle) - 6 * Math.cos(angle + Math.PI / 6),
            sy - 8 * Math.sin(angle) - 6 * Math.sin(angle + Math.PI / 6)
          );
          ctx.stroke();
        }
      });
    }

    // --- Draw Line Search Ray and Alpha Ticks/Linkage (NEW FEATURE) ---
    if (trajectory.length > 0 && selectedStepIndex < trajectory.length) {
      const step = trajectory[selectedStepIndex];
      // Only draw if we have a valid non-zero search direction dX, dY
      if (step && (Math.abs(step.dX) > 1e-9 || Math.abs(step.dY) > 1e-9)) {
        const sx0 = getScreenX(step.x);
        const sy0 = getScreenY(step.y);

        // Ray extends along the search direction
        // Let's determine the maximum alpha to draw. By default 1.5, or max alpha from lineSearchSteps
        const maxAlpha = step.lineSearchSteps && step.lineSearchSteps.length > 0
          ? Math.max(...step.lineSearchSteps.map((s) => s.alpha))
          : 1.5;

        const sxMax = getScreenX(step.x + maxAlpha * step.dX);
        const syMax = getScreenY(step.y + maxAlpha * step.dY);

        ctx.save();
        
        // 1. Draw the gradient dashed search ray
        const gradient = ctx.createLinearGradient(sx0, sy0, sxMax, syMax);
        gradient.addColorStop(0, "rgba(245, 158, 11, 0.95)"); // amber-500
        gradient.addColorStop(1, "rgba(245, 158, 11, 0.1)"); // fade out

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2.0;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(sx0, sy0);
        ctx.lineTo(sxMax, syMax);
        ctx.stroke();
        ctx.setLineDash([]); // Reset dash

        // 2. Draw trial ticks/labels
        if (step.lineSearchSteps && step.lineSearchSteps.length > 0) {
          step.lineSearchSteps.forEach((lsStep) => {
            const tx = step.x + lsStep.alpha * step.dX;
            const ty = step.y + lsStep.alpha * step.dY;
            const tsx = getScreenX(tx);
            const tsy = getScreenY(ty);

            const isChosen = Math.abs(lsStep.alpha - step.alpha) < 1e-4;

            if (isChosen) {
              // Highlighting the chosen step size
              ctx.fillStyle = "#10b981"; // Emerald-500
              ctx.strokeStyle = "#ffffff";
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.arc(tsx, tsy, 5.5, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();

              // Pulsing glow
              ctx.strokeStyle = "rgba(16, 185, 129, 0.4)";
              ctx.lineWidth = 1.0;
              ctx.beginPath();
              ctx.arc(tsx, tsy, 9.0, 0, Math.PI * 2);
              ctx.stroke();

              // Label
              ctx.fillStyle = "#065f46";
              ctx.font = "bold 9px font-sans";
              ctx.fillText(`α* = ${lsStep.alpha.toFixed(3)}`, tsx + 8, tsy - 4);
            } else {
              // Backtracking trial points (failed descent or not chosen)
              ctx.fillStyle = "rgba(239, 68, 68, 0.85)"; // rose/red-500
              ctx.strokeStyle = "#ffffff";
              ctx.lineWidth = 0.75;
              ctx.beginPath();
              ctx.arc(tsx, tsy, 3.0, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();

              // Small label for trial alphas
              ctx.fillStyle = "rgba(127, 29, 29, 0.75)";
              ctx.font = "7px font-mono";
              ctx.fillText(`α:${lsStep.alpha.toFixed(2)}`, tsx + 5, tsy + 8);
            }
          });
        }

        // Draw directional arrow at the end of the ray
        const angle = Math.atan2(syMax - sy0, sxMax - sx0);
        ctx.strokeStyle = "rgba(245, 158, 11, 0.85)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sxMax, syMax);
        ctx.lineTo(
          sxMax - 8 * Math.cos(angle - Math.PI / 6),
          syMax - 8 * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(sxMax, syMax);
        ctx.lineTo(
          sxMax - 8 * Math.cos(angle + Math.PI / 6),
          syMax - 8 * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();

        ctx.restore();
      }
    }

    // X/Y scale label overlays perfectly sitting outside or matching the borders
    ctx.fillStyle = "rgba(71, 85, 105, 0.85)";
    ctx.font = "9px font-mono";
    ctx.fillText(`x: [${bounds.xMin.toFixed(1)}, ${bounds.xMax.toFixed(1)}]`, paddingLeft, height - 8);
    ctx.fillText(`y: [${bounds.yMin.toFixed(1)}, ${bounds.yMax.toFixed(1)}]`, width - paddingRight - 85, height - 8);

    // Label on start point
    if (trajectory.length > 0) {
      ctx.fillStyle = "#be185d";
      ctx.font = "bold 9px font-sans";
      ctx.fillText("初始点 x₀", getScreenX(trajectory[0].x) + 7, getScreenY(trajectory[0].y) - 5);
      const last = trajectory[trajectory.length - 1];
      ctx.fillStyle = "#047857";
      ctx.fillText("收敛点 x*", getScreenX(last.x) + 8, getScreenY(last.y) + 12);
    }
  }, [dimensions, func, activeConstraints, trajectory, selectedStepIndex, showOverlay, allTrajectories, enabledAlgs, algId]);

  // Recalculate and draw 3D Perspective Projection Canvas
  useEffect(() => {
    const renderToCanvas = (canvas: HTMLCanvasElement | null, isMini: boolean) => {
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const w = isMini ? 144 : dimensions.width;
      const h = isMini ? 144 : dimensions.height;

      canvas.width = w * window.devicePixelRatio;
      canvas.height = h * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      // Clear with soft background
      ctx.fillStyle = "#fafaf9";
      ctx.fillRect(0, 0, w, h);

      // Grid details for 3D surface
      const gridRes = isMini ? 18 : 24;
      const points: { x: number; y: number; z: number; sx: number; sy: number; projZ: number }[][] = [];

      // Evaluate 3D values and project
      const radA = (azimuth * Math.PI) / 180;
      const radE = (elevation * Math.PI) / 180;

      const cosA = Math.cos(radA);
      const sinA = Math.sin(radA);
      const cosE = Math.cos(radE);
      const sinE = Math.sin(radE);

      // Scale factors
      const xRange = bounds.xMax - bounds.xMin;
      const yRange = bounds.yMax - bounds.yMin;

      // Evaluate values to map height properly
      let maxZ = -Infinity;
      let minZ = Infinity;
      const zVals: number[][] = [];

      for (let i = 0; i <= gridRes; i++) {
        zVals[i] = [];
        const x = bounds.xMin + (i / gridRes) * xRange;
        for (let j = 0; j <= gridRes; j++) {
          const y = bounds.yMin + (j / gridRes) * yRange;
          let z = func.evaluate(x, y);

          // Cap very high Rosenbrock values for readable 3D plot scaling
          if (z > 500) z = 500 + Math.log(z - 500 + 1) * 20;

          zVals[i][j] = z;
          if (z < minZ) minZ = z;
          if (z > maxZ) maxZ = z;
        }
      }

      const zRange = maxZ - minZ === 0 ? 1 : maxZ - minZ;

      // Proportional offsets
      const scale3D = w * (isMini ? 0.42 : 0.45);
      const cx = w / 2;
      const cy = h / 2 + h * 0.05;

      const project = (xVal: number, yVal: number, zVal: number) => {
        // Normalize to [-0.5, 0.5] range
        const nx = (xVal - bounds.xMin) / xRange - 0.5;
        const ny = (yVal - bounds.yMin) / yRange - 0.5;
        const nz = (zVal - minZ) / zRange - 0.4; // shift slightly lower in space

        // Rotate around Z axis (Azimuth)
        const xRot = nx * cosA - ny * sinA;
        const yRot = nx * sinA + ny * cosA;

        // Rotate around X axis (Elevation)
        const zRot = nz * cosE - yRot * sinE;
        const projDepth = nz * sinE + yRot * cosE;

        // Projection to screen
        const sx = cx + xRot * scale3D;
        const sy = cy - zRot * scale3D * 0.75; // zRot is vertical on screen

        return { sx, sy, depth: projDepth };
      };

      // Calculate all grid points
      for (let i = 0; i <= gridRes; i++) {
        points[i] = [];
        const x = bounds.xMin + (i / gridRes) * xRange;
        for (let j = 0; j <= gridRes; j++) {
          const y = bounds.yMin + (j / gridRes) * yRange;
          const z = zVals[i][j];
          const proj = project(x, y, z);
          points[i][j] = {
            x,
            y,
            z,
            sx: proj.sx,
            sy: proj.sy,
            projZ: proj.depth,
          };
        }
      }

      // Painter's algorithm: Render 3D quadrilaterals by average depth (projZ)
      interface Cell {
        i: number;
        j: number;
        avgDepth: number;
      }
      const cells: Cell[] = [];
      for (let i = 0; i < gridRes; i++) {
        for (let j = 0; j < gridRes; j++) {
          const d1 = points[i][j].projZ;
          const d2 = points[i + 1][j].projZ;
          const d3 = points[i][j + 1].projZ;
          const d4 = points[i + 1][j + 1].projZ;
          cells.push({
            i,
            j,
            avgDepth: (d1 + d2 + d3 + d4) / 4,
          });
        }
      }

      // Sort cells back-to-front (smaller values are further away)
      cells.sort((a, b) => a.avgDepth - b.avgDepth);

      // Draw cells
      cells.forEach((cell) => {
        const { i, j } = cell;
        const p00 = points[i][j];
        const p10 = points[i + 1][j];
        const p11 = points[i + 1][j + 1];
        const p01 = points[i][j + 1];

        // Soft Sage to Rose coloring based on height
        const avgZ = (p00.z + p10.z + p11.z + p01.z) / 4;
        const normalizedHeight = maxZ === minZ ? 0 : (avgZ - minZ) / zRange;

        const r = Math.round(226 + normalizedHeight * (250 - 226));
        const g = Math.round(236 + normalizedHeight * (228 - 236));
        const b = Math.round(233 + normalizedHeight * (235 - 233));

        // Draw filled quad with thin wireframe border
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.7)`;
        ctx.strokeStyle = "rgba(97, 139, 129, 0.15)";
        ctx.lineWidth = 0.5;

        ctx.beginPath();
        ctx.moveTo(p00.sx, p00.sy);
        ctx.lineTo(p10.sx, p10.sy);
        ctx.lineTo(p11.sx, p11.sy);
        ctx.lineTo(p01.sx, p01.sy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // If penalty method is active, shade constraint violating faces slightly differently
        if (activeConstraints.length > 0) {
          const avgX = (p00.x + p10.x + p11.x + p01.x) / 4;
          const avgY = (p00.y + p10.y + p11.y + p01.y) / 4;
          const isViolated = activeConstraints.some((c) => c.evaluate(avgX, avgY) > 0);
          if (isViolated) {
            ctx.fillStyle = "rgba(239, 68, 68, 0.08)";
            ctx.beginPath();
            ctx.moveTo(p00.sx, p00.sy);
            ctx.lineTo(p10.sx, p10.sy);
            ctx.lineTo(p11.sx, p11.sy);
            ctx.lineTo(p01.sx, p01.sy);
            ctx.closePath();
            ctx.fill();
          }
        }
      });

      // 5. Draw 3D optimization trajectory
      if (showOverlay && allTrajectories && enabledAlgs) {
        enabledAlgs.forEach((id) => {
          const path = allTrajectories[id];
          if (!path || path.length === 0) return;

          const isMain = id === algId;
          const color = id === "gd" ? "#eab308" : id === "newton" ? "#10b981" : id === "bfgs" ? "#3b82f6" : "#ec4899";

          ctx.save();
          ctx.lineWidth = isMini ? (isMain ? 2.5 : 1.2) : (isMain ? 3.5 : 1.8);
          ctx.strokeStyle = color;
          ctx.beginPath();

          path.forEach((step, idx) => {
            let stepZ = func.evaluate(step.x, step.y);
            if (stepZ > 500) stepZ = 500 + Math.log(stepZ - 500 + 1) * 20;

            const proj = project(step.x, step.y, stepZ);

            if (idx === 0) {
              ctx.moveTo(proj.sx, proj.sy);
            } else {
              ctx.lineTo(proj.sx, proj.sy);
            }
          });
          ctx.stroke();
          ctx.restore();

          // Node markers on 3D path
          path.forEach((step, idx) => {
            let stepZ = func.evaluate(step.x, step.y);
            if (stepZ > 500) stepZ = 500 + Math.log(stepZ - 500 + 1) * 20;

            const proj = project(step.x, step.y, stepZ);
            const isSelected = isMain && idx === selectedStepIndex;
            const isStart = idx === 0;
            const isEnd = idx === path.length - 1;

            if (isStart) {
              ctx.fillStyle = "#ec4899";
              ctx.beginPath();
              ctx.arc(proj.sx, proj.sy, isMini ? 3.0 : 4.5, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = "#fff";
              ctx.lineWidth = 1;
              ctx.stroke();
            } else if (isEnd) {
              ctx.fillStyle = "#10b981";
              ctx.beginPath();
              ctx.arc(proj.sx, proj.sy, isMini ? 3.5 : 5.0, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = "#fff";
              ctx.lineWidth = 1;
              ctx.stroke();
            } else if (isSelected) {
              ctx.fillStyle = "#4f46e5";
              ctx.beginPath();
              ctx.arc(proj.sx, proj.sy, isMini ? 3.0 : 4.5, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = "#fff";
              ctx.lineWidth = 1;
              ctx.stroke();
            } else {
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(proj.sx, proj.sy, isMini ? (isMain ? 1.5 : 0.8) : (isMain ? 2 : 1), 0, Math.PI * 2);
              ctx.fill();
            }
          });
        });
      } else if (trajectory.length > 0) {
        // 3D Line path with timestamp heat map gradient
        ctx.save();
        ctx.lineWidth = isMini ? 2.5 : 3.5;
        ctx.shadowColor = "rgba(59, 130, 246, 0.3)";
        ctx.shadowBlur = isMini ? 4 : 6;

        const getHeatmapColor = (index: number, total: number) => {
          if (total <= 1) return "rgb(59, 130, 246)";
          const ratio = index / (total - 1);
          const r = Math.round(59 + ratio * (249 - 59));
          const g = Math.round(130 + ratio * (115 - 130));
          const b = Math.round(246 + ratio * (22 - 246));
          return `rgb(${r}, ${g}, ${b})`;
        };

        for (let idx = 1; idx < trajectory.length; idx++) {
          const prev = trajectory[idx - 1];
          const step = trajectory[idx];

          let prevZ = func.evaluate(prev.x, prev.y);
          if (prevZ > 500) prevZ = 500 + Math.log(prevZ - 500 + 1) * 20;
          const pProj = project(prev.x, prev.y, prevZ);

          let stepZ = func.evaluate(step.x, step.y);
          if (stepZ > 500) stepZ = 500 + Math.log(stepZ - 500 + 1) * 20;
          const sProj = project(step.x, step.y, stepZ);

          ctx.strokeStyle = getHeatmapColor(idx, trajectory.length);
          ctx.beginPath();
          ctx.moveTo(pProj.sx, pProj.sy);
          ctx.lineTo(sProj.sx, sProj.sy);
          ctx.stroke();
        }
        ctx.restore();

        // Node markers on 3D path with heatmap colors
        trajectory.forEach((step, idx) => {
          let stepZ = func.evaluate(step.x, step.y);
          if (stepZ > 500) stepZ = 500 + Math.log(stepZ - 500 + 1) * 20;

          const proj = project(step.x, step.y, stepZ);
          const isSelected = idx === selectedStepIndex;
          const isStart = idx === 0;
          const isEnd = idx === trajectory.length - 1;
          const nodeColor = getHeatmapColor(idx, trajectory.length);

          if (isStart) {
            ctx.fillStyle = "rgb(59, 130, 246)";
            ctx.beginPath();
            ctx.arc(proj.sx, proj.sy, isMini ? 3.5 : 5.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1.0;
            ctx.stroke();
          } else if (isEnd) {
            ctx.fillStyle = "rgb(249, 115, 22)";
            ctx.beginPath();
            ctx.arc(proj.sx, proj.sy, isMini ? 4.0 : 6.0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1.0;
            ctx.stroke();
          } else if (isSelected) {
            ctx.fillStyle = "#312e81";
            ctx.beginPath();
            ctx.arc(proj.sx, proj.sy, isMini ? 3.5 : 5.0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1.2;
            ctx.stroke();
          } else {
            ctx.fillStyle = nodeColor;
            ctx.beginPath();
            ctx.arc(proj.sx, proj.sy, isMini ? 1.5 : 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      }

      // Label 3D compass axis representation
      ctx.strokeStyle = "rgba(100, 116, 139, 0.4)";
      ctx.lineWidth = 1.0;
      // Origin axes projections
      const axOrigin = project(bounds.xMin, bounds.yMin, minZ);
      const axX = project(bounds.xMax, bounds.yMin, minZ);
      const axY = project(bounds.xMin, bounds.yMax, minZ);
      const axZ = project(bounds.xMin, bounds.yMin, maxZ);

      // X Axis
      ctx.beginPath();
      ctx.moveTo(axOrigin.sx, axOrigin.sy);
      ctx.lineTo(axX.sx, axX.sy);
      ctx.stroke();
      ctx.fillStyle = "#64748b";
      ctx.font = isMini ? "6px font-mono" : "8px font-mono";
      ctx.fillText("X", axX.sx + (isMini ? 2 : 5), axX.sy + (isMini ? 2 : 5));

      // Y Axis
      ctx.beginPath();
      ctx.moveTo(axOrigin.sx, axOrigin.sy);
      ctx.lineTo(axY.sx, axY.sy);
      ctx.stroke();
      ctx.fillText("Y", axY.sx - (isMini ? 6 : 10), axY.sy + (isMini ? 2 : 5));

      // Z Axis (Vertical)
      ctx.beginPath();
      ctx.moveTo(axOrigin.sx, axOrigin.sy);
      ctx.lineTo(axZ.sx, axZ.sy);
      ctx.stroke();
      ctx.fillText("Z", axZ.sx - (isMini ? 6 : 10), axZ.sy - (isMini ? 4 : 8));
    };

    renderToCanvas(canvas3DRef.current, false);
    if (showMini3D) {
      renderToCanvas(canvasMini3DRef.current, true);
    }
  }, [dimensions, azimuth, elevation, func, activeConstraints, trajectory, selectedStepIndex, showOverlay, allTrajectories, enabledAlgs, algId, showMini3D]);

  // Click handler on 2D Contour Canvas to set x0
  const handleContourClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvas2DRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const xPixel = e.clientX - rect.left;
    const yPixel = e.clientY - rect.top;

    // Use same margins as the rendering logic
    const paddingLeft = 24;
    const paddingRight = 16;
    const paddingTop = 16;
    const paddingBottom = 24;

    const plotWidth = rect.width - paddingLeft - paddingRight;
    const plotHeight = rect.height - paddingTop - paddingBottom;

    // Convert pixel to mathematical coordinates
    const scaleX = (xPixel - paddingLeft) / plotWidth;
    const scaleY = 1.0 - (yPixel - paddingTop) / plotHeight; // y-axis is inverted

    // Clamp scales to [0, 1] to prevent clicking outside from breaking math bounds
    const clampedScaleX = Math.max(0, Math.min(1, scaleX));
    const clampedScaleY = Math.max(0, Math.min(1, scaleY));

    const mathX = bounds.xMin + clampedScaleX * (bounds.xMax - bounds.xMin);
    const mathY = bounds.yMin + clampedScaleY * (bounds.yMax - bounds.yMin);

    onSetStartPoint({ x: mathX, y: mathY });
  };

  // 2D Contour Hover handlers for point inspection Tooltip
  const handleMouseMoveContour = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvas2DRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const paddingLeft = 24;
    const paddingRight = 16;
    const paddingTop = 16;
    const paddingBottom = 24;
    const plotWidth = rect.width - paddingLeft - paddingRight;
    const plotHeight = rect.height - paddingTop - paddingBottom;

    const getScreenX = (valX: number) => {
      return paddingLeft + ((valX - bounds.xMin) / (bounds.xMax - bounds.xMin)) * plotWidth;
    };
    const getScreenY = (valY: number) => {
      return rect.height - paddingBottom - ((valY - bounds.yMin) / (bounds.yMax - bounds.yMin)) * plotHeight;
    };

    let closestStep: IterationStep | null = null;
    let closestDist = Infinity;
    let closestAlgName = "";
    let closestStepIndex = -1;

    const activePaths: { name: string; path: IterationStep[] }[] = [];
    if (showOverlay && allTrajectories && enabledAlgs) {
      enabledAlgs.forEach((id) => {
        const name = id === "gd" ? "最速下降法" : id === "newton" ? "阻尼牛顿法" : id === "bfgs" ? "拟牛顿法" : "外罚函数法";
        const path = allTrajectories[id];
        if (path) {
          activePaths.push({ name, path });
        }
      });
    } else {
      const name = algId === "gd" ? "最速下降法" : algId === "newton" ? "阻尼牛顿法" : algId === "bfgs" ? "拟牛顿法" : "外罚函数法";
      activePaths.push({ name, path: trajectory });
    }

    activePaths.forEach(({ name, path }) => {
      path.forEach((step, idx) => {
        const sx = getScreenX(step.x);
        const sy = getScreenY(step.y);
        const dist = Math.hypot(mouseX - sx, mouseY - sy);
        if (dist < closestDist) {
          closestDist = dist;
          closestStep = step;
          closestAlgName = name;
          closestStepIndex = idx;
        }
      });
    });

    if (closestStep && closestDist < 10) {
      const step: IterationStep = closestStep;
      const gradNorm = Math.sqrt(step.gradX * step.gradX + step.gradY * step.gradY);
      const sx = getScreenX(step.x);
      const sy = getScreenY(step.y);

      setHoveredPoint({
        x: step.x,
        y: step.y,
        fx: step.fx,
        gradNorm,
        algName: closestAlgName,
        stepIndex: closestStepIndex,
        canvasX: sx,
        canvasY: sy,
      });
    } else {
      setHoveredPoint(null);
    }
  };

  const handleMouseLeaveContour = () => {
    setHoveredPoint(null);
  };

  // 3D Drag Rotation Handlers
  const handleMouseDown3D = (e: React.MouseEvent<HTMLDivElement | HTMLCanvasElement>) => {
    setIsDragging3D(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove3D = (e: React.MouseEvent<HTMLDivElement | HTMLCanvasElement>) => {
    if (!isDragging3D) return;
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;

    setAzimuth((prev) => (prev + dx * 0.75) % 360);
    // restrict elevation to avoid flipping upside down
    setElevation((prev) => Math.max(-80, Math.min(80, prev - dy * 0.75)));

    dragStartPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp3D = () => {
    setIsDragging3D(false);
  };

  return (
    <div ref={containerRef} className="w-full flex flex-col items-center gap-4">
      {/* Visual Canvas Card */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 2D Contour Section */}
        <div className="flex flex-col items-center bg-white/70 backdrop-blur-sm p-3.5 rounded-2xl border border-slate-100 shadow-sm relative group">
          <div className="w-full flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-indigo-800 flex items-center gap-1.5">
              <span>2D 等高线与可行域</span>
              <span className="text-[9px] bg-slate-100 text-slate-500 font-normal px-1 py-0.2 rounded">
                点击曲面任意处设定 $x_0$
              </span>
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowMini3D(!showMini3D)}
                title="3D 轨迹透视切换"
                className={`flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-semibold border transition-all duration-150 ${
                  showMini3D
                    ? "bg-indigo-50 text-indigo-600 border-indigo-200 shadow-sm"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-500 border-slate-200"
                }`}
              >
                <Box size={11} className={showMini3D ? "text-indigo-500 animate-pulse" : "text-slate-400"} />
                <span>3D 透视浮窗</span>
              </button>
              <button
                onClick={() => onSetStartPoint(func.defaultStart)}
                title="重置初始点"
                className="p-1 hover:bg-slate-50 rounded text-slate-400 hover:text-slate-600 transition"
              >
                <RotateCcw size={12} />
              </button>
            </div>
          </div>

          <div
            className="relative cursor-crosshair border border-slate-100 rounded-lg overflow-hidden bg-stone-50"
            style={{ width: dimensions.width, height: dimensions.height }}
          >
            <canvas
              ref={canvas2DRef}
              onClick={handleContourClick}
              onMouseMove={handleMouseMoveContour}
              onMouseLeave={handleMouseLeaveContour}
              style={{ width: "100%", height: "100%", display: "block" }}
            />
            {/* Tooltip Hover Overlay */}
            {hoveredPoint && (
              <div
                className="absolute z-10 bg-slate-950/95 text-white p-2.5 rounded-xl text-[10px] shadow-lg border border-slate-800 pointer-events-none font-mono flex flex-col gap-1 select-none backdrop-blur-xs transition-all duration-150"
                style={{
                  left: `${Math.min(dimensions.width - 130, Math.max(10, hoveredPoint.canvasX - 55))}px`,
                  top: `${Math.max(10, hoveredPoint.canvasY - 75)}px`,
                }}
              >
                <div className="flex items-center justify-between gap-1.5 border-b border-slate-800 pb-1 mb-0.5">
                  <span className="font-sans font-bold text-indigo-400">{hoveredPoint.algName}</span>
                  <span className="bg-slate-800 text-slate-300 px-1 py-0.2 rounded text-[8px] font-semibold">
                    第 {hoveredPoint.stepIndex} 步
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <div>
                    <span className="text-slate-400">x :</span>{" "}
                    <span className="text-emerald-400 font-semibold">{hoveredPoint.x.toFixed(4)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">y :</span>{" "}
                    <span className="text-emerald-400 font-semibold">{hoveredPoint.y.toFixed(4)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">f :</span>{" "}
                    <span className="text-amber-400 font-semibold">{hoveredPoint.fx.toFixed(5)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">‖∇f‖:</span>{" "}
                    <span className="text-cyan-400 font-semibold">
                      {hoveredPoint.gradNorm === 0 ? "0.000e+0" : hoveredPoint.gradNorm.toExponential(3)}
                    </span>
                  </div>
                </div>
              </div>
            )}
            {/* Legend for Start / End */}
            <div className="absolute left-2.5 top-2.5 flex flex-col gap-1 text-[8px] bg-white/80 backdrop-blur-sm p-1.5 rounded-lg border border-slate-100 pointer-events-none scale-90 origin-top-left shadow-sm">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full border border-white ${!showOverlay ? "bg-blue-500" : "bg-pink-500"}`} />
                <span className="text-slate-600 font-medium">初始点 x₀</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full border border-white ${!showOverlay ? "bg-orange-500" : "bg-emerald-500"}`} />
                <span className="text-slate-600 font-medium">极值收敛点 x*</span>
              </div>
              {!showOverlay && (
                <div className="flex flex-col gap-1 mt-1 pt-1 border-t border-slate-100">
                  <span className="text-slate-400 font-semibold mb-0.5">时间戳热度 (迭代进度)</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1.5 rounded bg-gradient-to-r from-blue-500 to-orange-500" />
                    <span className="text-slate-500 font-medium scale-90 origin-left">0% → 100%</span>
                  </div>
                </div>
              )}
              {activeConstraints.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-1 bg-red-400 inline-block rounded" />
                  <span className="text-rose-700 font-medium">非线性约束边界 g_i(x)=0</span>
                </div>
              )}
            </div>
            {/* Floating Mini 3D Perspective Window */}
            {showMini3D && (
              <div
                onMouseDown={handleMouseDown3D}
                onMouseMove={handleMouseMove3D}
                onMouseUp={handleMouseUp3D}
                onMouseLeave={handleMouseUp3D}
                className="absolute bottom-2.5 right-2.5 z-20 bg-white/95 backdrop-blur-md border border-indigo-100 shadow-xl rounded-xl p-1.5 transition-all duration-300 w-[156px] select-none"
              >
                <div className="flex items-center justify-between gap-1 mb-1 border-b border-indigo-50/50 pb-1 px-0.5">
                  <span className="text-[9px] font-semibold text-indigo-800 flex items-center gap-1">
                    <Box size={9} className="text-indigo-500" />
                    <span>3D 空间轨迹</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[7px] text-slate-400 font-mono">
                      {Math.round(azimuth)}°, {Math.round(elevation)}°
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMini3D(false);
                      }}
                      className="p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition"
                    >
                      <X size={9} />
                    </button>
                  </div>
                </div>
                <div className="relative border border-slate-100 rounded bg-stone-50 overflow-hidden">
                  <canvas
                    ref={canvasMini3DRef}
                    style={{ width: "144px", height: "144px", display: "block" }}
                    className="cursor-grab active:cursor-grabbing"
                  />
                  {/* Subtle drag cue indicator */}
                  <div className="absolute bottom-1 left-1 pointer-events-none text-[6px] text-slate-400 bg-white/70 px-1 py-0.2 rounded font-sans">
                    按住并拖拽旋转
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3D Wireframe Section */}
        <div className="flex flex-col items-center bg-white/70 backdrop-blur-sm p-3.5 rounded-2xl border border-slate-100 shadow-sm relative group">
          <div className="w-full flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-indigo-800 flex items-center gap-1.5">
              <span>3D 目标函数立体曲面</span>
              <span className="text-[9px] bg-slate-100 text-slate-500 font-normal px-1 py-0.2 rounded">
                拖拽可自由旋转视图
              </span>
            </h3>
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
              <span>A: {Math.round(azimuth)}°</span>
              <span>E: {Math.round(elevation)}°</span>
            </div>
          </div>

          <div
            className="relative cursor-grab active:cursor-grabbing border border-slate-100 rounded-lg overflow-hidden bg-stone-50"
            style={{ width: dimensions.width, height: dimensions.height }}
            onMouseDown={handleMouseDown3D}
            onMouseMove={handleMouseMove3D}
            onMouseUp={handleMouseUp3D}
            onMouseLeave={handleMouseUp3D}
          >
            <canvas ref={canvas3DRef} style={{ width: "100%", height: "100%", display: "block" }} />
          </div>
        </div>
      </div>
    </div>
  );
};
