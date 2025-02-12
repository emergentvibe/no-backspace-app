import React, { useState, useEffect, useRef } from 'react';
import { createSession, checkSessionStatus, updateSession, closeSession } from '../services/sessionService';
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

const TypingPage = ({ userName }) => {
    // Add currentSessionId to track active session
    const [input, setInput] = useState(() => localStorage.getItem('currentText') || '');
    const [currentSessionId, setCurrentSessionId] = useState(() => localStorage.getItem('currentSessionId') || null);
    const [staleIndex, setStaleIndex] = useState(-1);
    const [showInactivityWarning, setShowInactivityWarning] = useState(false);
    const [savingStatus, setSavingStatus] = useState('');
    const [sessionInfo, setSessionInfo] = useState('');  // New state for session info
    
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

    // Add session start time state
    const [sessionStartTime] = useState(Date.now());
    const [elapsedTime, setElapsedTime] = useState('0:00');
    
    // Add time formatting function
    const formatElapsedTime = (startTime) => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };
    
    // Add timer effect
    useEffect(() => {
        const timer = setInterval(() => {
            setElapsedTime(formatElapsedTime(sessionStartTime));
        }, 1000);
        
        return () => clearInterval(timer);
    }, [sessionStartTime]);

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
        
        // Show session info when user starts typing
        if (!sessionInfo && newText.length === 1) {
            setSessionInfo('Started new writing session');
            setTimeout(() => {
                const infoEl = document.querySelector('.session-info');
                if (infoEl) infoEl.classList.add('hiding');
                setTimeout(() => setSessionInfo(''), 300);
            }, 2700);
        }
        
        // Show autosave info every 500 characters
        if (newText.length > 0 && newText.length % 500 === 0) {
            setSessionInfo('Auto-saving in progress...');
            setTimeout(() => {
                const infoEl = document.querySelector('.session-info');
                if (infoEl) infoEl.classList.add('hiding');
                setTimeout(() => setSessionInfo(''), 300);
            }, 1700);
        }
        
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
                handleSave();
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

    // Add autosave interval
    useEffect(() => {
        const interval = setInterval(async () => {
            if (input && !isSaving) {
                await handleSave();
            }
        }, 30000); // Autosave every 30 seconds

        return () => clearInterval(interval);
    }, [input, isSaving]);

    const handleSave = async () => {
        const textToSave = currentTextRef.current;
        if (!textToSave.trim() || isSaving.current) return;
        
        try {
            console.log('\n=== Manual Save Started ===');
            console.log('Current state:', {
                sessionId: currentSessionId,
                textLength: textToSave.length,
                isSaving: isSaving.current,
                userName
            });
            
            isSaving.current = true;
            setSavingStatus('Saving...');
            
            // Just save the current session without closing it
            const result = await checkAndUpdateSession(textToSave, false);
            console.log('Save result:', result);
            
            setSavingStatus('Saved!');
            setTimeout(() => {
                const statusEl = document.querySelector('.status-message');
                if (statusEl) statusEl.classList.add('hiding');
                setTimeout(() => setSavingStatus(''), 300);
            }, 1700);
            
            return result;
        } catch (error) {
            console.error('Error in handleSave:', error);
            setSavingStatus('Error saving');
            setTimeout(() => {
                const statusEl = document.querySelector('.status-message');
                if (statusEl) statusEl.classList.add('hiding');
                setTimeout(() => setSavingStatus(''), 300);
            }, 1700);
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
            console.log('\n=== Starting New Session ===');
            console.log('Current state:', {
                currentSessionId,
                textLength: textToSave.length,
                isSaving: isSaving.current,
                userName
            });
            
            isSaving.current = true;
            setSessionInfo('Saving current session...');
            
            // First, close the current session
            let result;
            if (currentSessionId) {
                console.log('Closing existing session:', currentSessionId);
                result = await closeSession(currentSessionId);
            } else {
                console.log('Creating new closed session');
                const response = await createSession(textToSave, true, userName);
                result = response.session;
            }
            
            console.log('Session close/create result:', result);
            
            // Clear current session state
            setCurrentSessionId(null);
            localStorage.removeItem('currentSessionId');
            setInput('');
            currentTextRef.current = '';
            localStorage.removeItem('currentText');
            setStaleIndex(-1);
            
            setSessionInfo('Starting new session...');
            setTimeout(() => {
                const infoEl = document.querySelector('.session-info');
                if (infoEl) infoEl.classList.add('hiding');
                setTimeout(() => setSessionInfo(''), 300);
            }, 1700);
            
            // Wait for processing
            if (result?._id) {
                console.log('Starting processing poll for session:', result._id);
                const pollInterval = setInterval(async () => {
                    const { status } = await checkSessionStatus(result._id);
                    console.log('Poll status:', { sessionId: result._id, ...status });
                    if (!status.isProcessing) {
                        clearInterval(pollInterval);
                        console.log('Session processing complete:', result._id);
                        setSavingStatus('Ready for new session');
                        setTimeout(() => {
                            const statusEl = document.querySelector('.status-message');
                            if (statusEl) statusEl.classList.add('hiding');
                            setTimeout(() => setSavingStatus(''), 300);
                        }, 1700);
                    }
                }, 2000);
            }
        } catch (error) {
            console.error('Error in handleStartNew:', error);
            setSavingStatus('Error saving');
            setSessionInfo('Failed to start new session');
            setTimeout(() => {
                const statusEl = document.querySelector('.status-message');
                const infoEl = document.querySelector('.session-info');
                if (statusEl) statusEl.classList.add('hiding');
                if (infoEl) infoEl.classList.add('hiding');
                setTimeout(() => {
                    setSavingStatus('');
                    setSessionInfo('');
                }, 300);
            }, 1700);
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

    useEffect(() => {
        console.log('TypingPage mounted with userName:', userName);
    }, [userName]);

    const checkAndUpdateSession = async (text, shouldClose = false) => {
        console.log('\n=== Check and Update Session ===');
        console.log('Parameters:', {
            textLength: text.length,
            shouldClose,
            currentSessionId,
            userName
        });
        
        if (currentSessionId) {
            try {
                // Check if session is still open
                console.log('Checking status of session:', currentSessionId);
                const { status } = await checkSessionStatus(currentSessionId);
                console.log('Session status:', status);
                
                if (status.isClosed) {
                    // Session is closed, create new one
                    console.log('⚠️ Session closed, creating new one');
                    const result = await createSession(text, shouldClose, userName);
                    console.log('New session created:', result);
                    setCurrentSessionId(result.session._id);
                    localStorage.setItem('currentSessionId', result.session._id);
                    return result;
                } else {
                    // Session is open, update it
                    console.log('Updating existing session:', currentSessionId);
                    const result = await updateSession(currentSessionId, text, shouldClose, userName);
                    console.log('Session update result:', result);
                    return result;
                }
        } catch (error) {
                console.error('Error in session check/update:', error);
                // If any error occurs, create new session
                console.log('⚠️ Error checking session, creating new one');
                const result = await createSession(text, shouldClose, userName);
                console.log('New session created:', result);
                setCurrentSessionId(result.session._id);
                localStorage.setItem('currentSessionId', result.session._id);
                return result;
            }
        } else {
            // No current session, create new one
            console.log('Creating new session (no current session)');
            const result = await createSession(text, shouldClose, userName);
            console.log('New session created:', result);
            if (!shouldClose) {
                setCurrentSessionId(result.session._id);
                localStorage.setItem('currentSessionId', result.session._id);
            }
            return result;
        }
    };

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
                .status-container {
                    position: fixed;
                    top: calc(var(--navbar-height, 60px) + var(--button-bar-height) + var(--spacing-sm, 8px));
                    left: 0;
                    right: 0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: var(--spacing-xs, 4px);
                    z-index: 100;
                }
                
                .status-message {
                    background: var(--color-background-light);
                    padding: var(--spacing-sm, 8px) var(--spacing-md, 12px);
                    border-radius: 4px;
                    font-size: 14px;
                    color: var(--color-text);
                    opacity: 0;
                    transform: translateY(-10px);
                    transition: all 0.3s ease;
                    pointer-events: none;
                }
                
                .status-message.visible {
                    opacity: 1;
                    transform: translateY(0);
                }
                
                .status-message.hiding {
                    opacity: 0;
                    transform: translateY(10px);
                }
                
                .session-info {
                    color: var(--color-text-light);
                    font-size: 12px;
                }
                
                .stats-container {
                    position: fixed;
                    bottom: 140px; /* Position above the graph */
                    right: var(--spacing-md, 12px);
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    gap: var(--spacing-md, 12px);
                    font-family: var(--font-mono);
                    font-size: var(--font-size-small);
                    color: var(--color-text-light);
                    z-index: 1000; /* Increased z-index to ensure visibility */
                    background-color: var(--color-bg);
                    padding: 8px 12px; /* Explicit padding values */
                    border-radius: var(--border-radius);
                    border: 1px solid var(--color-border);
                    margin-bottom: 20px; /* Explicit margin value */
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); /* Added subtle shadow for better visibility */
                }

                .typing-speed-graph {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    height: 120px;
                    background: var(--color-bg);
                    border-top: 1px solid var(--color-border);
                    padding: 10px;
                    z-index: 100;
                    box-shadow: 0 -1px 3px rgba(0, 0, 0, 0.1);
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
            
            <div className="status-container">
                <div className={`status-message ${savingStatus ? 'visible' : ''}`}>
                    <span>{savingStatus}</span>
                </div>
                <div className={`status-message session-info ${sessionInfo ? 'visible' : ''}`}>
                    <span>{sessionInfo}</span>
                </div>
                <div className={`status-message ${showInactivityWarning ? 'visible' : ''}`}>
                    <span>
                        {showInactivityWarning && 'Inactivity detected, session will be auto-saved soon'}
                    </span>
                    {showInactivityWarning && <div className="countdown-circle" />}
                </div>
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
            </div>

            <div className="stats-container">
                <span>{input.length} characters</span>
                <span>•</span>
                <span>{elapsedTime} elapsed</span>
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
