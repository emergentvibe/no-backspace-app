import React from 'react';
import { TypingSpeedGraph } from './TypingSpeedGraph';
import './SpeedMonitor.css';

export const SpeedMonitor = ({ stats, graphComponent, elapsedTime }) => {
    return (
        <div className="speed-monitor">
            <div className="speed-stats">
                <div className="current-speed">
                    <span className="label">Current:</span>
                    <span className="value">{stats.current} WPM</span>
                </div>
                <div className="peak-speed">
                    <span className="label">Peak:</span>
                    <span className="value">{stats.peak} WPM</span>
                </div>
                <div className="elapsed-time">
                    <span className="label">Time:</span>
                    <span className="value">{elapsedTime}</span>
                </div>
            </div>
            <div className="graph-container">
                {graphComponent}
            </div>
        </div>
    );
}; 