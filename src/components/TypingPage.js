import React, { useState, useEffect, useRef } from 'react';
import { createSession, checkSessionStatus, updateSession } from '../services/sessionService';
import { useNavigate } from 'react-router-dom';
import './TypingPage.css';
import '../globalStyles.css';
import { FaSave, FaPlus } from 'react-icons/fa';

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

function TypingPage() {
    // Add currentSessionId to track active session
    const [input, setInput] = useState(() => localStorage.getItem('currentText') || '');
    const [currentSessionId, setCurrentSessionId] = useState(() => localStorage.getItem('currentSessionId') || null);
    const [staleIndex, setStaleIndex] = useState(-1);
    const [showInactivityWarning, setShowInactivityWarning] = useState(false);
    const [savingStatus, setSavingStatus] = useState('');
    
    // Refs
    const inactivityTimeout = useRef(null);
    const typingTimeout = useRef(null);
    const saveTimeout = useRef(null);
    const inputRef = useRef(null);
    const currentTextRef = useRef(input);
    const navigate = useNavigate();
    const isSaving = useRef(false);

    // Add new state and refs for typing speed with timestamps
    const [typingSpeed, setTypingSpeed] = useState([]);
    const lastTypedTime = useRef(Date.now());
    const graphCanvasRef = useRef(null);
    const animationFrameRef = useRef(null);
    const speedUpdateRef = useRef(null);
    const TEN_MINUTES = 10 * 60 * 1000;

    // Constants for graph
    const SMOOTHING_WINDOWS = {
        short: 10000,    // 10 second window
        medium: 60000,   // 1 minute window
        long: 600000     // 10 minute window
    };
    const DISPLAY_WINDOW = 10 * 60 * 1000;  // 10 minutes in milliseconds
    const SAMPLE_INTERVAL = 1000;  // Sample every second
    const CHARS_PER_WORD = 5;  // Standard WPM calculation

    // Constants for optimization and smoothing
    const GRAPH_FPS = 20;  // Reduced from 30 to 20 for better performance
    const STATS_UPDATE_INTERVAL = 1000;  // Increased to 1 second
    const FRAME_INTERVAL = 1000 / GRAPH_FPS;
    const MIN_SPEED_CHANGE = 1;  // Only update if speed changes by more than 1 WPM

    // Exponential Moving Average weights
    const EMA_WEIGHTS = {
        short: 0.3,    // 10-second EMA: more responsive
        medium: 0.09,   // 30-second EMA: balanced
        long: 0.02     // 2-minute EMA: stable
    };

    const speedTracker = useRef(new SpeedTracker());
    const [stats, setStats] = useState({
        current: 0,
        peak: 0
    });

    // Update stats periodically
    useEffect(() => {
        const updateStats = () => {
            const now = Date.now();
            const newStats = {
                current: Math.round(speedTracker.current.getAverage(now, WINDOW_SIZE)),
                peak: Math.round(speedTracker.current.getPeak(now))
            };
            setStats(newStats);
        };

        const intervalId = setInterval(updateStats, 1000);
        return () => clearInterval(intervalId);
    }, []);

    const handleInputChange = (e) => {
        const newText = e.target.value;
        setInput(newText);
        
        const now = Date.now();
        const timeDiff = now - lastTypedTime.current;
        const charsTyped = Math.max(0, newText.length - (currentTextRef.current?.length || 0));
        
        if (timeDiff > 0 && charsTyped > 0) {
            // Calculate WPM: (characters/5) / minutes
            const wordsTyped = charsTyped / 5;
            const minutesFraction = timeDiff / 60000;
            const instantWPM = Math.min(wordsTyped / minutesFraction, MAX_WPM); // Cap at MAX_WPM

            // Add sample
            speedTracker.current.addSample(instantWPM, now);
        }
        
        lastTypedTime.current = now;
        currentTextRef.current = newText;

        setShowInactivityWarning(false);
        setSavingStatus('');

        // Reset typing timeout (for fading)
        if (typingTimeout.current) {
            clearTimeout(typingTimeout.current);
        }
        typingTimeout.current = setTimeout(() => {
            setStaleIndex(newText.length);
        }, 5000);

        // Reset inactivity timer
        if (inactivityTimeout.current) {
            clearTimeout(inactivityTimeout.current);
        }
        if (saveTimeout.current) {
            clearTimeout(saveTimeout.current);
        }

        // Show warning after 20s, save after 2m
        inactivityTimeout.current = setTimeout(() => {
            setShowInactivityWarning(true);
            
            // Schedule save
            saveTimeout.current = setTimeout(() => {
                debouncedSave(newText, false);
            }, 100000); // 100s more after warning
        }, 20000);
    };

    // Draw graph
    const drawGraph = () => {
        const canvas = graphCanvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: false });
        const dpr = window.devicePixelRatio;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
        
        const width = canvas.displayWidth;
        const height = canvas.displayHeight - 20;
        const now = Date.now();

        // Clear and draw background
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, width, height + 20);

        // Draw grid
        ctx.beginPath();
        ctx.strokeStyle = '#e1e1e1';
        ctx.lineWidth = 1;

        // Vertical lines (time)
        for (let i = 0; i <= 10; i++) {
            const x = width - (i * width / 10);
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
        }

        // Horizontal lines (speed)
        for (let wpm = 0; wpm <= MAX_WPM; wpm += 50) {
            const y = height * (1 - wpm / MAX_WPM);
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
        }
        ctx.stroke();

        // Draw labels
        ctx.fillStyle = '#666666';
        ctx.font = '10px var(--font-mono)';
        for (let i = 0; i <= 10; i++) {
            const x = width - (i * width / 10);
            ctx.fillText(i === 0 ? 'now' : `-${i}m`, x - 10, height + 15);
        }
        for (let wpm = 0; wpm <= MAX_WPM; wpm += 50) {
            const y = height * (1 - wpm / MAX_WPM);
            ctx.fillText(`${wpm}`, 5, y - 2);
        }

        // Draw speed line
        const samples = speedTracker.current.getSamples();
        if (samples.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = '#4CAF50';
            ctx.lineWidth = 2;

            for (let i = 0; i <= width; i += 2) {
                const timeAtPoint = now - ((width - i) / width) * GRAPH_WINDOW;
                const speed = speedTracker.current.getAverage(timeAtPoint, WINDOW_SIZE);
                const y = height * (1 - Math.min(speed, MAX_WPM) / MAX_WPM);
                
                if (i === 0) {
                    ctx.moveTo(i, y);
                } else {
                    ctx.lineTo(i, y);
                }
            }
            ctx.stroke();
        }

        animationFrameRef.current = requestAnimationFrame(drawGraph);
    };

    // Start/stop graph animation
    useEffect(() => {
        drawGraph();
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    // Keep session info in sync with localStorage
    useEffect(() => {
        currentTextRef.current = input;
        localStorage.setItem('currentText', input);
        if (currentSessionId) {
            localStorage.setItem('currentSessionId', currentSessionId);
        } else {
            localStorage.removeItem('currentSessionId');
        }
    }, [input, currentSessionId]);

    // Remove state clearing on mount
    useEffect(() => {
        console.log('🔄 TypingPage mounted, preserving state');
    }, []);

    // Remove the cleanup save
    useEffect(() => {
        return () => {
            if (inactivityTimeout.current) clearTimeout(inactivityTimeout.current);
            if (typingTimeout.current) clearTimeout(typingTimeout.current);
            if (saveTimeout.current) clearTimeout(saveTimeout.current);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (speedUpdateRef.current) {
                clearTimeout(speedUpdateRef.current);
            }
        };
    }, []);

    // Update typing speed calculation
    const updateTypingSpeed = (newText) => {
        const now = Date.now();
        const timeDiff = now - lastTypedTime.current;
        const charsTyped = Math.max(0, newText.length - (currentTextRef.current?.length || 0));
        
        if (timeDiff > 0 && charsTyped > 0) {
            // Calculate WPM: (characters/5) / minutes
            const wordsTyped = charsTyped / 5;
            const minutesFraction = timeDiff / 60000;
            const instantWPM = Math.min(wordsTyped / minutesFraction, MAX_WPM); // Cap at MAX_WPM

            // Update all trackers
            Object.values(speedTrackers).forEach(tracker => 
                tracker.current.addSample(instantWPM, now)
            );

            // Update typing speed array for graph
            setTypingSpeed(prev => {
                const cutoffTime = now - (10 * 60 * 1000); // 10 minutes
                const recentSamples = prev.filter(s => s.time > cutoffTime);
                return [...recentSamples, { speed: instantWPM, time: now }];
            });
        }
        
        lastTypedTime.current = now;
        currentTextRef.current = newText;
    };

    // Initialize canvas size on mount and resize
    useEffect(() => {
        const resizeCanvas = () => {
            const canvas = graphCanvasRef.current;
            if (!canvas) return;
            
            const rect = canvas.parentElement.getBoundingClientRect();
            const dpr = window.devicePixelRatio;
            
            // Set actual size in memory
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            
            // Set display size
            canvas.style.width = `${rect.width}px`;
            canvas.style.height = `${rect.height}px`;
            
            // Store dimensions for drawing
            canvas.displayWidth = rect.width;
            canvas.displayHeight = rect.height;
        };

        // Initial size
        resizeCanvas();

        // Handle window resizes
        window.addEventListener('resize', resizeCanvas);
        return () => window.removeEventListener('resize', resizeCanvas);
    }, []);

    // Debounced save function
    const debouncedSave = async (text, shouldClose = false) => {
        if (isSaving.current || !text.trim()) return;
        
        isSaving.current = true;
        try {
            setSavingStatus('Saving...');
            let result;
            
            if (currentSessionId) {
                // Update existing session
                result = await updateSession(currentSessionId, text, shouldClose);
                console.log('📝 Updating session:', currentSessionId);
            } else {
                // Create new session
                result = await createSession(text, shouldClose);
                console.log('✨ Creating new session');
                if (!shouldClose) {
                    // Store session ID for future updates
                    setCurrentSessionId(result.session._id);
                }
            }
            
            // If session is closed, wait for processing
            if (shouldClose) {
                setSavingStatus('Processing...');
                const pollInterval = setInterval(async () => {
                    const { status } = await checkSessionStatus(result.session._id);
                    if (status.hasTitle && status.hasSummary) {
                        setSavingStatus('Generated summary and title...');
                    }
                    if (status.hasAtomicIdeas) {
                        setSavingStatus('Extracted atomic ideas...');
                    }
                    if (status.hasChunks) {
                        setSavingStatus('Generated embeddings...');
                    }
                    if (!status.isProcessing) {
                        clearInterval(pollInterval);
                        setSavingStatus('Complete!');
                        setTimeout(() => setSavingStatus(''), 2000);
                    }
                }, 2000);
            } else {
                setSavingStatus('Saved!');
                setTimeout(() => setSavingStatus(''), 2000);
            }
            
            return result;
        } catch (error) {
            console.error('Error saving:', error);
            setSavingStatus('Error saving');
            setTimeout(() => setSavingStatus(''), 2000);
        } finally {
            setTimeout(() => {
                isSaving.current = false;
            }, 1000);
        }
    };

    const checkAndUpdateSession = async (text, shouldClose = false) => {
        if (currentSessionId) {
            try {
                // Check if session is still open
                const { status } = await checkSessionStatus(currentSessionId);
                if (status.isClosed) {
                    // Session is closed, create new one
                    console.log('⚠️ Session closed, creating new one');
                    const result = await createSession(text, shouldClose);
                    setCurrentSessionId(result.session._id);
                    localStorage.setItem('currentSessionId', result.session._id);
                    return result;
                } else {
                    // Session is open, update it
                    return await updateSession(currentSessionId, text, shouldClose);
                }
            } catch (error) {
                // If any error occurs, create new session
                console.log('⚠️ Error checking session, creating new one');
                const result = await createSession(text, shouldClose);
                setCurrentSessionId(result.session._id);
                localStorage.setItem('currentSessionId', result.session._id);
                return result;
            }
        } else {
            // No current session, create new one
            const result = await createSession(text, shouldClose);
            if (!shouldClose) {
                setCurrentSessionId(result.session._id);
                localStorage.setItem('currentSessionId', result.session._id);
            }
            return result;
        }
    };

    const handleSave = async () => {
        const textToSave = currentTextRef.current;
        if (!textToSave.trim() || isSaving.current) return;
        
        try {
            isSaving.current = true;
            setSavingStatus('Saving...');
            
            let result;
            if (currentSessionId) {
                // Try to update existing session
                console.log('📝 Attempting to update session:', currentSessionId);
                result = await updateSession(currentSessionId, textToSave, false);
            } else {
                // Create new session
                console.log('✨ Creating new session');
                result = await createSession(textToSave, false);
            }

            // Always update session ID from result
            if (result?.session?._id) {
                console.log('📌 Setting session ID:', result.session._id);
                setCurrentSessionId(result.session._id);
                localStorage.setItem('currentSessionId', result.session._id);
            }
            
            setSavingStatus('Saved!');
            setTimeout(() => setSavingStatus(''), 2000);
        } catch (error) {
            console.error('Error:', error);
            setSavingStatus('Error saving');
            setTimeout(() => setSavingStatus(''), 2000);
            // Clear session ID on error
            setCurrentSessionId(null);
            localStorage.removeItem('currentSessionId');
        } finally {
            setTimeout(() => {
                isSaving.current = false;
            }, 1000);
        }
    };

    const handleStartNew = async () => {
        const textToSave = currentTextRef.current;
        if (!textToSave.trim() || isSaving.current) return;
        
        try {
            isSaving.current = true;
            setSavingStatus('Saving and closing session...');
            
            let result;
            if (currentSessionId) {
                // Close existing session
                console.log('🔒 Closing session:', currentSessionId);
                result = await updateSession(currentSessionId, textToSave, true);
            } else {
                // Create new closed session
                console.log('✨ Creating closed session');
                result = await createSession(textToSave, true);
            }
            
            // Wait for processing
            if (result?.session?._id) {
                setSavingStatus('Processing...');
                const pollInterval = setInterval(async () => {
                    const { status } = await checkSessionStatus(result.session._id);
                    if (status.hasTitle && status.hasSummary) {
                        setSavingStatus('Generated summary and title...');
                    }
                    if (status.hasAtomicIdeas) {
                        setSavingStatus('Extracted atomic ideas...');
                    }
                    if (status.hasChunks) {
                        setSavingStatus('Generated embeddings...');
                    }
                    if (!status.isProcessing) {
                        clearInterval(pollInterval);
                        setSavingStatus('Complete!');
                        setTimeout(() => setSavingStatus(''), 2000);
                        
                        // Clear state and storage
                        setInput('');
                        setCurrentSessionId(null);
                        localStorage.removeItem('currentText');
                        localStorage.removeItem('currentSessionId');
                        currentTextRef.current = '';
                        setStaleIndex(-1);
                    }
                }, 2000);
            }
        } catch (error) {
            console.error('Error:', error);
            setSavingStatus('Error saving');
            setTimeout(() => setSavingStatus(''), 2000);
            // Clear session ID on error
            setCurrentSessionId(null);
            localStorage.removeItem('currentSessionId');
        } finally {
            setTimeout(() => {
                isSaving.current = false;
            }, 1000);
        }
    };

    const handleKeyDown = (e) => {
        // Only prevent backspace and delete
        if (e.key === 'Backspace' || e.key === 'Delete') {
            e.preventDefault();
            return false;
        }
        // Allow all other keys
        return true;
    };

    const handleContainerClick = () => {
        inputRef.current.focus();
    };

    // Add navigation handler
    const handleNavigate = async (path) => {
        navigate(path);
    };

    // Update speed trackers
    useEffect(() => {
        const updateSpeed = () => {
            const now = Date.now();
            
            // Calculate current speed
            const recentSamples = speedTracker.current.getSamples().filter(s => now - s.time <= 1000);
            const currentSpeed = recentSamples.length > 0
                ? recentSamples.reduce((sum, s) => sum + s.speed, 0) / recentSamples.length
                : 0;

            // Add sample
            speedTracker.current.addSample(currentSpeed, now);

            // Schedule next update
            speedUpdateRef.current = setTimeout(updateSpeed, 1000);
        };

        updateSpeed();
        return () => {
            if (speedUpdateRef.current) {
                clearTimeout(speedUpdateRef.current);
            }
        };
    }, []);

    return (
        <div className="typing-page">
            <style>{`
                :root {
                    --button-bar-height: 56px;
                }
                .button-container {
                    position: fixed;
                    top: calc(var(--navbar-height, 60px) + var(--spacing-md, 12px));
                    left: 0;
                    right: 0;
                    height: var(--button-bar-height);
                    padding: var(--spacing-md, 12px) var(--spacing-lg, 20px);
                    background: var(--color-background);
                    display: flex;
                    justify-content: flex-end;
                    align-items: center;
                    gap: var(--spacing-sm, 10px);
                    z-index: 100;
                    border-bottom: 1px solid var(--color-border);
                    box-sizing: border-box;
                }
                .editor-container {
                    margin-top: calc(var(--navbar-height, 60px) + var(--button-bar-height) + var(--spacing-xl, 24px));
                }
                .icon-button {
                    width: 36px;
                    height: 36px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: none;
                    border-radius: 6px;
                    color: white;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    background: var(--color-background-light);
                }
                .icon-button:hover:not(:disabled) {
                    transform: translateY(-1px);
                }
                .icon-button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
            `}</style>
            <div className="button-container">
                <button 
                    onClick={handleSave}
                    style={{
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#2196F3',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'white',
                        cursor: input.trim() ? 'pointer' : 'not-allowed',
                        opacity: input.trim() ? 1 : 0.5,
                        transition: 'all 0.2s ease'
                    }}
                    disabled={!input.trim()}
                    title="Save"
                >
                    <FaSave size={16} />
                </button>
                <button 
                    onClick={handleStartNew}
                    style={{
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#4CAF50',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'white',
                        cursor: input.trim() ? 'pointer' : 'not-allowed',
                        opacity: input.trim() ? 1 : 0.5,
                        transition: 'all 0.2s ease'
                    }}
                    disabled={!input.trim()}
                    title="New"
                >
                    <FaPlus size={16} />
                </button>
            </div>
            
            <div 
                className="inactivity-indicator" 
                style={{ 
                    opacity: showInactivityWarning || savingStatus ? 1 : 0,
                    transform: showInactivityWarning || savingStatus ? 'translateY(0)' : 'translateY(10px)'
                }}
            >
                <span>
                    {savingStatus || (showInactivityWarning && 'Inactivity detected, session will be auto-saved soon')}
                </span>
                {showInactivityWarning && !savingStatus && <div className="countdown-circle" />}
            </div>
            
            <div
                onClick={handleContainerClick}
                className="editor-container"
            >
                <div className="text-container mono">
                    {input.split('').map((char, index) => (
                        <span key={index} style={{ opacity: index < staleIndex ? 0 : 1 }}>
                            {char === ' ' ? '\u00A0' : char}
                        </span>
                    ))}
                    <span className="blink">|</span>
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    className="editor-input"
                    autoFocus
                />
                <div className="gradient-overlay"></div>
                
                <div style={{
                    position: 'fixed',
                    bottom: 'var(--spacing-md)',
                    left: 'var(--spacing-md)',
                    fontSize: 'var(--font-size-small)',
                    color: 'var(--color-text-light)',
                    fontFamily: 'var(--font-mono)',
                    zIndex: 10
                }}>
                    {input.length} characters
                </div>
            </div>

            <div className="typing-speed-graph">
                <div className="stats-bar">
                    {stats && (
                        <>
                            <div className="stat-item" style={{ color: '#4CAF50' }}>
                                <span className="stat-value">{stats.current}</span>
                                <span className="stat-label">Current WPM</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-value">{stats.peak}</span>
                                <span className="stat-label">10min Peak</span>
                            </div>
                        </>
                    )}
                </div>
                <canvas
                    ref={graphCanvasRef}
                    className="graph-canvas"
                    width={800}
                    height={80}
                />
            </div>
        </div>
    );
}

export default TypingPage;
