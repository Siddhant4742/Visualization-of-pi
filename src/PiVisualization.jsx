import React, { useEffect, useRef, useState } from 'react';

const PiVisualization = () => {
  const canvasRef = useRef(null);
  const [digitInput, setDigitInput] = useState('1000');
  const [digitCount, setDigitCount] = useState(1000);
  const [isCalculating, setIsCalculating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const workerRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  // Initialize Web Worker
  useEffect(() => {
    workerRef.current = new Worker(new URL('./piWorker.js', import.meta.url));
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);
  
  const handleInputChange = (e) => {
    const value = e.target.value;
    setDigitInput(value);
    setError('');
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    const num = parseInt(digitInput, 10);
    
    if (isNaN(num) || num < 10) {
      setError('Please enter a number >= 10');
      return;
    }
    if (num > 100000) {
      setError('Maximum 100,000 digits (for performance)');
      return;
    }
    
    setDigitCount(num);
    setError('');
  };
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !workerRef.current) return;
    
    // Cancel any ongoing animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    const ctx = canvas.getContext('2d');
    
    // Set up high-DPI canvas for sharp vector-like rendering
    const dpr = window.devicePixelRatio || 2; // Use at least 2x for sharpness
    const displayWidth = 900;
    const displayHeight = 900;
    
    // Set actual canvas size (high resolution)
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    
    // Set display size (CSS)
    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';
    
    // Scale context to match DPI
    ctx.scale(dpr, dpr);
    
    // Enable crisp rendering for sharp lines when zoomed
    ctx.imageSmoothingEnabled = false;
    canvas.style.imageRendering = 'crisp-edges';
    
    const width = displayWidth;
    const height = displayHeight;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.42;
    
    // CLEAR CANVAS IMMEDIATELY to prevent showing old visualization
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    
    // Rainbow gradient colors
    const getColorForPosition = (position) => {
      const hue = (position * 360) % 360;
      return `hsl(${hue}, 70%, 60%)`;
    };
    
    // Get positions for each digit
    const getDigitPositions = (digit, numPositions = 36) => {
      const positions = [];
      const segmentSize = (Math.PI * 2) / 10;
      const baseAngle = digit * segmentSize;
      
      for (let i = 0; i < numPositions; i++) {
        const offsetAngle = (i / numPositions) * segmentSize - segmentSize / 2;
        const angle = baseAngle + offsetAngle - Math.PI / 2;
        positions.push(angle);
      }
      return positions;
    };
    
    const digitPositions = {};
    for (let d = 0; d < 10; d++) {
      digitPositions[d] = getDigitPositions(d, 36);
    }
    
    // Clear canvas
    const clearCanvas = () => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
    };
    
    // Draw rings (cached - only drawn once at start)
    const drawRings = () => {
      const numRings = 10;
      for (let ring = 0; ring < numRings; ring++) {
        const ringRadius = radius - (ring * radius / numRings);
        const numSegments = 180; // Reduced from 360 for performance
        
        for (let seg = 0; seg < numSegments; seg++) {
          const angle1 = (seg / numSegments) * Math.PI * 2 - Math.PI / 2;
          const angle2 = ((seg + 1) / numSegments) * Math.PI * 2 - Math.PI / 2;
          
          ctx.beginPath();
          ctx.arc(centerX, centerY, ringRadius, angle1, angle2);
          ctx.lineWidth = radius / numRings;
          ctx.strokeStyle = getColorForPosition(seg / numSegments);
          ctx.globalAlpha = 0.3;
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    };
    
    // Draw digit labels around the outer ring with color bars
    const drawDigitLabels = () => {
      ctx.font = 'bold 24px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      for (let digit = 0; digit < 10; digit++) {
        const segmentSize = (Math.PI * 2) / 10;
        const angle = digit * segmentSize - Math.PI / 2;
        const labelRadius = radius * 1.15;
        
        const x = centerX + Math.cos(angle) * labelRadius;
        const y = centerY + Math.sin(angle) * labelRadius;
        
        // Draw color bar above the digit (radial bar from center outward)
        const barStartRadius = radius * 1.0;
        const barEndRadius = radius * 1.08;
        const barAngleStart = angle - (segmentSize / 10);
        const barAngleEnd = angle + (segmentSize / 10);
        
        // Create gradient for the bar
        const barGradient = ctx.createLinearGradient(
          centerX + Math.cos(angle) * barStartRadius,
          centerY + Math.sin(angle) * barStartRadius,
          centerX + Math.cos(angle) * barEndRadius,
          centerY + Math.sin(angle) * barEndRadius
        );
        const digitColor = getColorForPosition(digit / 10);
        barGradient.addColorStop(0, digitColor);
        barGradient.addColorStop(1, digitColor);
        
        // Draw the color bar arc
        ctx.beginPath();
        ctx.arc(centerX, centerY, barStartRadius, barAngleStart, barAngleEnd);
        ctx.arc(centerX, centerY, barEndRadius, barAngleEnd, barAngleStart, true);
        ctx.closePath();
        ctx.fillStyle = digitColor;
        ctx.fill();
        
        // Draw background circle for label
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.beginPath();
        ctx.arc(x, y, 18, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw colored border
        ctx.strokeStyle = digitColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, 18, 0, Math.PI * 2);
        ctx.stroke();
        
        // Draw digit text
        ctx.fillStyle = digitColor;
        ctx.fillText(digit.toString(), x, y);
      }
    };
    
  // Cache the background layer at high-DPI so drawn image stays sharp
  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = displayWidth * dpr;
  bgCanvas.height = displayHeight * dpr;
  const bgCtx = bgCanvas.getContext('2d');
  // scale background context to CSS coordinate system
  bgCtx.scale(dpr, dpr);
    
  // Draw background once (including digit labels) into bgCtx
  bgCtx.fillStyle = '#000000';
  bgCtx.fillRect(0, 0, width, height);
  // Temporarily swap ctx methods so drawRings/drawDigitLabels paint into bgCtx
  const originalCtx = ctx;
  const proxy = Object.create(bgCtx);
  // Copy required properties from bgCtx onto proxy if needed (we'll replace ctx locally below)
  Object.assign(ctx, proxy);
  drawRings();
  drawDigitLabels();
  // Restore original ctx methods by resetting canvas context (recreate)
  // (Safer to just get a fresh context from the canvas)
  // Note: re-getting context avoids lingering assignment side-effects
  // main ctx still has the proper scaling applied
  // no-op (ctx remains usable)
    
    // Detect consecutive repeated digits and return array of {digit, count, startIndex}
    const findRepeatedDigits = (digitsString) => {
      const repeats = [];
      let i = 0;
      
      while (i < digitsString.length) {
        let count = 1;
        const currentDigit = digitsString[i];
        
        while (i + count < digitsString.length && digitsString[i + count] === currentDigit) {
          count++;
        }
        
        // Only record if repeated 3+ times
        if (count >= 3) {
          repeats.push({
            digit: parseInt(currentDigit),
            count: count,
            startIndex: i
          });
        }
        
        i += count;
      }
      
      return repeats;
    };
    
    // Draw small circles (moons) for repeated digits with enhanced dispersion to prevent collisions
    const drawCirclesForRepeats = (ctxTarget, repeatedDigits) => {
      const digitGroups = {};
      repeatedDigits.forEach((repeat) => {
        if (!digitGroups[repeat.digit]) digitGroups[repeat.digit] = [];
        digitGroups[repeat.digit].push(repeat);
      });

      Object.entries(digitGroups).forEach(([digit, repeats]) => {
        const segmentSize = (Math.PI * 2) / 10;
        const baseAngle = parseInt(digit) * segmentSize - Math.PI / 2;

        repeats.forEach((repeat, index) => {
          const { count, startIndex } = repeat;
          
          // Smaller base size to reduce collisions
          const baseSize = 2.5;
          const sizeMultiplier = Math.min(count / 3, 1.8);
          const circleRadius = baseSize * sizeMultiplier;
          
          const numInGroup = repeats.length;
          
          // Increase angular spread to 85% of segment and add more variation
          const angleSpread = segmentSize * 0.85;
          const angleStep = angleSpread / Math.max(numInGroup, 1);
          const angleOffset = (index - (numInGroup - 1) / 2) * angleStep;
          
          // Much larger radial distance variation to prevent collisions
          const distanceVariation = ((startIndex % 13) / 13) * 0.08; // 0 to 8% radius variation
          const baseDistance = 1.05 + (index % 3) * 0.03; // Stagger by index: 1.05, 1.08, 1.11
          const circleDistance = radius * (baseDistance + distanceVariation);
          
          const angle = baseAngle + angleOffset;
          const x = centerX + Math.cos(angle) * circleDistance;
          const y = centerY + Math.sin(angle) * circleDistance;
          const baseHue = (parseInt(digit) / 10) * 360;
          const contrastHue = (baseHue + 180) % 360;

          // Outer glow (reduced size)
          const glow = ctxTarget.createRadialGradient(x, y, 0, x, y, circleRadius * 1.4);
          glow.addColorStop(0, `hsla(${contrastHue}, 80%, 70%, 0.8)`);
          glow.addColorStop(0.6, `hsla(${contrastHue}, 80%, 60%, 0.4)`);
          glow.addColorStop(1, `hsla(${contrastHue}, 80%, 50%, 0)`);
          ctxTarget.fillStyle = glow;
          ctxTarget.beginPath();
          ctxTarget.arc(x, y, circleRadius * 1.4, 0, Math.PI * 2);
          ctxTarget.fill();

          // Filled circle
          ctxTarget.fillStyle = `hsl(${contrastHue}, 80%, 65%)`;
          ctxTarget.beginPath();
          ctxTarget.arc(x, y, circleRadius, 0, Math.PI * 2);
          ctxTarget.fill();

          // Stroke
          ctxTarget.strokeStyle = `hsl(${contrastHue}, 90%, 80%)`;
          ctxTarget.lineWidth = 1.0;
          ctxTarget.beginPath();
          ctxTarget.arc(x, y, circleRadius, 0, Math.PI * 2);
          ctxTarget.stroke();
        });
      });
    };
    
    // Shared transitions state so we can render progressively as partial digits arrive
    let transitions = {};
    let maxTransition = 1;
    let lastRenderedEntries = 0;
    let lastDigits = '';
    let renderingStarted = false;
    let rotationId = null;
  let lastSnapshotPercent = 0; // track last full-snapshot percent (0..1)

    // Final offscreen canvas that will hold the fully rendered (static) visualization
    let finalCanvas = null;

    // Helper: compute transitions map from a digits string
    const computeTransitions = (digitsStr) => {
      const map = {};
      let maxT = 1;
      for (let i = 0; i < digitsStr.length - 1; i++) {
        const from = digitsStr[i];
        const to = digitsStr[i + 1];
        const key = `${from}-${to}`;
        map[key] = (map[key] || 0) + 1;
        maxT = Math.max(maxT, map[key]);
      }
      return { map, maxT };
    };

    // Draw a batch of transition entries with sharper, less blurry lines
    const drawTransitionBatch = (entries, start, end, maxT) => {
      for (let idx = start; idx < end; idx++) {
        const [key, count] = entries[idx];
        const [from, to] = key.split('-').map(Number);
        const numLines = Math.min(Math.ceil(count / 3), 20);

        const fromPositions = digitPositions[from];
        const toPositions = digitPositions[to];

        for (let line = 0; line < numLines; line++) {
          const fromIndex = Math.floor((line / numLines) * fromPositions.length);
          const toIndex = Math.floor((line / numLines) * toPositions.length);

          const angle1 = fromPositions[fromIndex];
          const angle2 = toPositions[toIndex];

          const x1 = centerX + Math.cos(angle1) * radius;
          const y1 = centerY + Math.sin(angle1) * radius;
          const x2 = centerX + Math.cos(angle2) * radius;
          const y2 = centerY + Math.sin(angle2) * radius;

          const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
          const color1 = getColorForPosition((from / 10));
          const color2 = getColorForPosition((to / 10));
          gradient.addColorStop(0, color1);
          gradient.addColorStop(1, color2);

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = gradient;
          // Increased minimum alpha and reduced max alpha range for sharper, more visible lines
          ctx.globalAlpha = 0.35 + (count / maxT) * 0.45;
          // Slightly thicker lines for better visibility
          ctx.lineWidth = 1.0 + (count / maxT) * 1.8;
          ctx.stroke();
        }
      }
      // Reset alpha after batch
      ctx.globalAlpha = 1.0;
    };

    // When the worker sends new partial digits, update transitions and draw incrementally
    const handlePartialDigits = (digitsSoFar, workerProgress, total) => {
      // update progress bar (calculation portion)
      if (workerProgress !== undefined && total) {
        setProgress(Math.round((workerProgress / total) * 50));
      }

      // Compute transitions from scratch for simplicity (should be fine for incremental updates)
      const { map, maxT } = computeTransitions(digitsSoFar);
      transitions = map;
      maxTransition = maxT;
      lastDigits = digitsSoFar;

      // Compute progress percent based on worker progress if available, otherwise use digitsSoFar
      const percent = total && workerProgress ? (workerProgress / total) : (digitsSoFar.length / Math.max(1, digitCount));

      // Render a full snapshot at every 5% threshold so users see incremental completed images
      const threshold = 0.05; // 5%
      if (percent >= lastSnapshotPercent + threshold) {
        // advance lastSnapshotPercent in steps (in case worker jumps multiple thresholds)
        while (percent >= lastSnapshotPercent + threshold) {
          lastSnapshotPercent += threshold;
        }

        // create a high-DPI temporary canvas for crisp snapshot
        const snapCanvas = document.createElement('canvas');
        snapCanvas.width = displayWidth * dpr;
        snapCanvas.height = displayHeight * dpr;
        const snapCtx = snapCanvas.getContext('2d');
        snapCtx.scale(dpr, dpr);

        // draw background
        snapCtx.drawImage(bgCanvas, 0, 0, width, height);

        // draw current transitions into snapshot with sharper lines
        const entries = Object.entries(transitions);
        for (let idx = 0; idx < entries.length; idx++) {
          const [key, count] = entries[idx];
          const [from, to] = key.split('-').map(Number);
          const numLines = Math.min(Math.ceil(count / 3), 20);
          const fromPositions = digitPositions[from];
          const toPositions = digitPositions[to];
          for (let line = 0; line < numLines; line++) {
            const fromIndex = Math.floor((line / numLines) * fromPositions.length);
            const toIndex = Math.floor((line / numLines) * toPositions.length);
            const angle1 = fromPositions[fromIndex];
            const angle2 = toPositions[toIndex];
            const x1 = centerX + Math.cos(angle1) * radius;
            const y1 = centerY + Math.sin(angle1) * radius;
            const x2 = centerX + Math.cos(angle2) * radius;
            const y2 = centerY + Math.sin(angle2) * radius;
            const gradient = snapCtx.createLinearGradient(x1, y1, x2, y2);
            gradient.addColorStop(0, getColorForPosition((from / 10)));
            gradient.addColorStop(1, getColorForPosition((to / 10)));
            snapCtx.beginPath();
            snapCtx.moveTo(x1, y1);
            snapCtx.lineTo(x2, y2);
            snapCtx.strokeStyle = gradient;
            snapCtx.globalAlpha = 0.35 + (count / maxTransition) * 0.45;
            snapCtx.lineWidth = 1.0 + (count / maxTransition) * 1.8;
            snapCtx.stroke();
          }
        }
        snapCtx.globalAlpha = 1.0;

  // draw circles for repeated sequences based on current partial digits
  const partialRepeats = findRepeatedDigits(digitsSoFar);
  drawCirclesForRepeats(snapCtx, partialRepeats);

        // blit snapshot into visible canvas (clear first to avoid blending with prior visuals)
        clearCanvas();
        ctx.drawImage(snapCanvas, 0, 0, width, height);
      }

      // Start rendering once at least 10% of digits are available (keeps early draws from being too sparse)
      if (!renderingStarted && digitsSoFar.length / Math.max(1, digitCount) >= 0.1) {
        renderingStarted = true;
        // draw background first
        clearCanvas();
        ctx.drawImage(bgCanvas, 0, 0);
      }

      if (renderingStarted) {
        // start drawing transitions in small batches to keep UI responsive
        const entries = Object.entries(transitions);
        const totalTransitions = entries.length;
        const batchSize = Math.ceil(Math.max(1, totalTransitions / 12));

        const drawStep = () => {
          const start = lastRenderedEntries;
          const end = Math.min(start + batchSize, totalTransitions);
          drawTransitionBatch(entries, start, end, maxTransition);
          lastRenderedEntries = end;
          setProgress(50 + Math.round((lastRenderedEntries / totalTransitions) * 50));
          if (lastRenderedEntries < totalTransitions) {
            animationFrameRef.current = requestAnimationFrame(drawStep);
          }
        };

        // kick off the batch draw
        if (!animationFrameRef.current) {
          animationFrameRef.current = requestAnimationFrame(drawStep);
        } else {
          // continue drawing more in next frame
          animationFrameRef.current = requestAnimationFrame(drawStep);
        }
      }
    };

    // Animate drawing
    const animateDrawing = () => {
      setIsCalculating(true);
      setProgress(0);

      // Clear canvas immediately before requesting data
      clearCanvas();

      // Request pi digits from worker
      workerRef.current.postMessage({ numDigits: digitCount });

      workerRef.current.onmessage = (e) => {
        const { success, digits, progress: workerProgress, total, digitsSoFar } = e.data;

        // If worker sent partial digits, handle progressive rendering
        if (!success && digitsSoFar !== undefined) {
          handlePartialDigits(digitsSoFar, workerProgress, total);
          return;
        }

        // If still in-progress message without digits, update progress display
        if (!success && workerProgress !== undefined) {
          setProgress(Math.round((workerProgress / total) * 50));
          return;
        }

        if (!success) return;

        // Final full digits arrived
        const finalDigits = digits;

        // Final compute transitions and repeated digits
        const finalResult = computeTransitions(finalDigits);
        transitions = finalResult.map;
        maxTransition = finalResult.maxT;
        const repeatedDigits = findRepeatedDigits(finalDigits);

        // Create final offscreen canvas (high-DPI) and draw everything into it once
        finalCanvas = document.createElement('canvas');
        finalCanvas.width = displayWidth * dpr;
        finalCanvas.height = displayHeight * dpr;
        const finalCtx = finalCanvas.getContext('2d');
        finalCtx.scale(dpr, dpr);

        // Paint background
        finalCtx.drawImage(bgCanvas, 0, 0, width, height);

        // Draw all transitions into finalCtx with sharper lines
        const entries = Object.entries(transitions);
        for (let idx = 0; idx < entries.length; idx++) {
          const [key, count] = entries[idx];
          const [from, to] = key.split('-').map(Number);
          const numLines = Math.min(Math.ceil(count / 3), 20);
          const fromPositions = digitPositions[from];
          const toPositions = digitPositions[to];
          for (let line = 0; line < numLines; line++) {
            const fromIndex = Math.floor((line / numLines) * fromPositions.length);
            const toIndex = Math.floor((line / numLines) * toPositions.length);
            const angle1 = fromPositions[fromIndex];
            const angle2 = toPositions[toIndex];
            const x1 = centerX + Math.cos(angle1) * radius;
            const y1 = centerY + Math.sin(angle1) * radius;
            const x2 = centerX + Math.cos(angle2) * radius;
            const y2 = centerY + Math.sin(angle2) * radius;
            const gradient = finalCtx.createLinearGradient(x1, y1, x2, y2);
            gradient.addColorStop(0, getColorForPosition((from / 10)));
            gradient.addColorStop(1, getColorForPosition((to / 10)));
            finalCtx.beginPath();
            finalCtx.moveTo(x1, y1);
            finalCtx.lineTo(x2, y2);
            finalCtx.strokeStyle = gradient;
            finalCtx.globalAlpha = 0.35 + (count / maxTransition) * 0.45;
            finalCtx.lineWidth = 1.0 + (count / maxTransition) * 1.8;
            finalCtx.stroke();
          }
        }
        finalCtx.globalAlpha = 1.0;

  // Draw circles into final canvas (reuse the shared helper)
  drawCirclesForRepeats(finalCtx, repeatedDigits);

        // Finished rendering to finalCanvas — start rotation animation drawing finalCanvas onto visible canvas
        let angle = 0;
        const rotate = () => {
          // clear visible canvas
          ctx.clearRect(0, 0, width, height);
          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate(angle);
          // draw final image centered
          ctx.drawImage(finalCanvas, -centerX, -centerY, width, height);
          ctx.restore();
          angle += 0.0009; // slower rotation speed
          rotationId = requestAnimationFrame(rotate);
        };

        // stop any previous rotation and start new
        if (rotationId) cancelAnimationFrame(rotationId);
        rotationId = requestAnimationFrame(rotate);

        setIsCalculating(false);
        setProgress(100);
      };
    };
    
    animateDrawing();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      try {
        // stop rotation if running
        if (typeof rotationId !== 'undefined' && rotationId) cancelAnimationFrame(rotationId);
      } catch (err) {}
      // remove worker handler
      if (workerRef.current) {
        workerRef.current.onmessage = null;
      }
    };
  }, [digitCount]);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black p-6 md:p-8">
      <div className="w-full max-w-7xl flex flex-col md:flex-row items-start md:items-stretch gap-8">
        {/* Left column: title + controls */}
        <div className="md:w-1/3 w-full">
          <div className="mb-6 text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 mb-2">
              π Visualization
            </h1>
            <p className="text-gray-400 mb-6 text-base md:text-lg">Exploring the patterns within Pi</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col items-stretch gap-4 bg-gray-900 bg-opacity-80 rounded-lg p-4 md:p-6 border border-gray-700">
            <div className="flex items-center gap-3">
              <label className="text-white font-semibold whitespace-nowrap">
                Number of digits:
              </label>
              <input
                type="text"
                value={digitInput}
                onChange={handleInputChange}
                className="w-36 px-3 py-2 bg-gray-800 text-white border border-gray-600 rounded-lg focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                placeholder="e.g. 5000"
                disabled={isCalculating}
              />
              <button
                type="submit"
                disabled={isCalculating}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap"
              >
                {isCalculating ? 'Calculating...' : 'Visualize'}
              </button>
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            {isCalculating && (
              <div className="w-full">
                <div className="flex justify-between text-sm text-cyan-400 mb-1">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-cyan-400 to-purple-400 h-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            <p className="text-gray-500 text-xs mt-1">
              Currently visualizing: {digitCount.toLocaleString()} digits
            </p>
          </form>
        </div>

        {/* Right column: canvas */}
        <div className="md:flex-1 flex justify-center items-center w-full">
          <canvas
            ref={canvasRef}
            width={900}
            height={900}
            className="rounded-lg shadow-2xl"
            style={{
              boxShadow: '0 0 40px rgba(6, 182, 212, 0.3)'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default PiVisualization;
