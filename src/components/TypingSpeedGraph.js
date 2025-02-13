import React from 'react';

export function TypingSpeedGraph({ graphCanvasRef }) {
    return (
        <canvas
            ref={graphCanvasRef}
            className="graph-canvas"
            width={800}
            height={80}
        />
    );
} 