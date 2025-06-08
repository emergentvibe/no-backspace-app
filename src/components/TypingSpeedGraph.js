import React, { useEffect, useRef } from 'react';

// Constants
const WINDOW_SIZE = 10 * 1000;  // 10 second window for current speed calculation
const GRAPH_WINDOW = 600 * 1000; // 10 minute window for graph display
const MAX_WPM = 250;            // Cap WPM at 250

class SpeedTracker {
    constructor() {
        this.samples = [];
    }

    // Add a new speed sample
    addSample(speed, time) {
        // Cap speed at MAX_WPM
        const cappedSpeed = Math.min(speed, MAX_WPM);
        this.samples.push({ speed: cappedSpeed, time });
        
        // Keep only last 10 minutes of data
        const cutoff = time - GRAPH_WINDOW;
        this.samples = this.samples.filter(s => s.time > cutoff);
    }

    // Get average speed for a time window
    getAverage(currentTime, windowSize) {
        const cutoff = currentTime - windowSize;
        const windowSamples = this.samples.filter(s => s.time > cutoff && s.time <= currentTime);
        
        if (windowSamples.length === 0) return 0;
        return windowSamples.reduce((sum, s) => sum + s.speed, 0) / windowSamples.length;
    }

    // Get peak of 1-second smoothed speeds over last 10 minutes
    getPeak(currentTime) {
        if (this.samples.length === 0) return 0;
        
        const cutoff = currentTime - GRAPH_WINDOW;
        let peak = 0;
        
        // Check every second in the last 10 minutes
        for (let t = cutoff; t <= currentTime; t += 1000) {
            const speed = this.getAverage(t, 1000); // 1 second smoothing
            peak = Math.max(peak, speed);
        }
        
        return peak;
    }

    // Get all samples for graphing
    getSamples() {
        return this.samples;
    }
}

export const useSpeedTracker = () => {
    const speedTracker = useRef(new SpeedTracker());
    return speedTracker;
};

export const drawSpeedGraph = (canvas, speedTracker) => {
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    const dpr = window.devicePixelRatio;
    
    // Set up canvas for proper DPI scaling
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    // Clear with dark background
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim();
    ctx.fillRect(0, 0, width, height);

    // Draw grid lines
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-border').trim();
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    // Vertical lines (time)
    for (let i = 0; i <= width; i += width / 10) {
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
    }
    
    // Horizontal lines (speed)
    for (let i = 0; i <= height; i += height / 5) {
        ctx.moveTo(0, i);
        ctx.lineTo(width, i);
    }
    ctx.stroke();

    // Draw speed line
    const samples = speedTracker.current.getSamples();
    if (samples.length > 1) {
        const now = Date.now();
        const timeWindow = GRAPH_WINDOW; // 10 minutes
        const minTime = now - timeWindow;
        
        // Draw glow effect
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim();
        ctx.lineWidth = 3;
        ctx.shadowColor = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim();
        ctx.shadowBlur = 15;
        ctx.beginPath();

        // Draw smooth averaged line
        for (let i = 0; i <= width; i += 2) {
            const timeAtPoint = now - ((width - i) / width) * GRAPH_WINDOW;
            const speed = speedTracker.current.getAverage(timeAtPoint, 60000); // Use 1-minute window for smoother averaging
            const y = height * (1 - Math.min(speed, MAX_WPM) / MAX_WPM);
            
            if (i === 0) {
                ctx.moveTo(i, y);
            } else {
                ctx.lineTo(i, y);
            }
        }
        ctx.stroke();

        // Draw main line without glow
        ctx.shadowBlur = 0;
        ctx.lineWidth = 2;
        ctx.stroke();
    }
};

export const TypingSpeedGraph = ({ speedTracker }) => {
    const canvasRef = useRef(null);
    const animationFrameRef = useRef(null);
    const resizeObserverRef = useRef(null);

    // Handle canvas resizing
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const resizeCanvas = () => {
            const parent = canvas.parentElement;
            if (!parent) return;

            const rect = parent.getBoundingClientRect();
            const dpr = window.devicePixelRatio;
            
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            canvas.style.width = `${rect.width}px`;
            canvas.style.height = `${rect.height}px`;
        };

        // Create a ResizeObserver to watch the parent element
        resizeObserverRef.current = new ResizeObserver(() => {
            requestAnimationFrame(resizeCanvas);
        });

        // Start observing the parent element
        if (canvas.parentElement) {
            resizeObserverRef.current.observe(canvas.parentElement);
            resizeCanvas(); // Initial size
        }

        return () => {
            if (resizeObserverRef.current) {
                resizeObserverRef.current.disconnect();
            }
        };
    }, []);

    // Handle animation
    useEffect(() => {
        const animate = () => {
            drawSpeedGraph(canvasRef.current, speedTracker);
            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animate();
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [speedTracker]);

    return (
        <canvas
            ref={canvasRef}
            className="typing-speed-graph"
            style={{ width: '100%', height: '100%' }}
        />
    );
};

export { WINDOW_SIZE, GRAPH_WINDOW, MAX_WPM }; 