import React, { useState, useEffect, useRef } from 'react';
import { createSession, checkSessionStatus, updateSession } from '../services/sessionService';
import { useNavigate } from 'react-router-dom';
import './TypingPage.css';
import '../globalStyles.css';
import { FaSave, FaPlus } from 'react-icons/fa';

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
    const MAX_WPM = 250;  // Maximum WPM to show
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

    class SpeedTracker {
        constructor(windowSize, emaWeight) {
            this.windowSize = windowSize;
            this.emaWeight = emaWeight;
            this.bucketSize = 1000;  // 1-second buckets
            this.bucketValues = new Map();  // bucket -> value
            this.samples = [];
            this.startTime = Math.floor(Date.now() / this.bucketSize) * this.bucketSize;
            this.debugName = windowSize === 10000 ? "10s" : 
                           windowSize === 240000 ? "4m" : "8m";
            console.log(`[${this.debugName}] Initialized at bucket ${this.startTime}`);
        }

        addSample(speed, time) {
            // Add sample
            this.samples.push({ speed, time });
            
            // Get the current bucket
            const bucket = Math.floor(time / this.bucketSize) * this.bucketSize;
            
            // Only calculate once per bucket
            if (!this.bucketValues.has(bucket)) {
                // Calculate average speed for this bucket
                const bucketSamples = this.samples.filter(s => 
                    Math.floor(s.time / this.bucketSize) * this.bucketSize === bucket
                );
                const bucketSpeed = bucketSamples.length > 0
                    ? bucketSamples.reduce((sum, s) => sum + s.speed, 0) / bucketSamples.length
                    : 0;

                // Get the previous bucket's value
                const prevBucket = bucket - this.bucketSize;
                const prevValue = this.bucketValues.get(prevBucket) || 0;

                // Calculate new EMA
                let newValue;
                if (prevValue === 0) {
                    newValue = bucketSpeed;
                } else {
                    // Check for gaps
                    const gapBuckets = Math.floor((bucket - prevBucket) / this.bucketSize) - 1;
                    if (gapBuckets > 0) {
                        // Decay during gap
                        const decayFactor = Math.exp(-gapBuckets / 10);
                        prevValue *= decayFactor;
                    }
                    newValue = (bucketSpeed * this.emaWeight) + (prevValue * (1 - this.emaWeight));
                }

                console.log(`[${this.debugName}] Bucket ${bucket}: speed=${bucketSpeed.toFixed(2)}, ema=${newValue.toFixed(2)}`);
                this.bucketValues.set(bucket, newValue);
            }

            // Cleanup old data
            const cutoffTime = bucket - DISPLAY_WINDOW;
            this.samples = this.samples.filter(s => s.time > cutoffTime);
            
            // Cleanup old buckets
            for (const [oldBucket] of this.bucketValues) {
                if (oldBucket < cutoffTime) {
                    this.bucketValues.delete(oldBucket);
                }
            }
        }

        getSmoothedSpeed(targetTime) {
            const bucket = Math.floor(targetTime / this.bucketSize) * this.bucketSize;
            
            // Don't predict future
            if (bucket > Date.now()) return 0;
            
            // Don't show values before start
            if (bucket < this.startTime) return 0;

            const value = this.bucketValues.get(bucket) || 0;
            return value;
        }

        getPeakSpeed() {
            if (this.bucketValues.size === 0) return 0;
            return Math.max(...this.bucketValues.values());
        }
    }

    // Initialize trackers with EMA weights
    const speedTrackers = {
        short: useRef(new SpeedTracker(10 * 1000, 0.3)),     // 10 second window
        medium: useRef(new SpeedTracker(4 * 60 * 1000, 0.1)), // 4 minute window
        long: useRef(new SpeedTracker(8 * 60 * 1000, 0.02))   // 8 minute window
    };

    // Optimization: Memoize speed calculations
    const memoizedGetSmoothedSpeed = (() => {
        const cache = new Map();
        const cacheTimeout = 1000;  // Cache for 1 second

        return (tracker, targetTime) => {
            const cacheKey = `${tracker.windowSize}-${Math.floor(targetTime / 100)}`;  // Round to 100ms
            const cached = cache.get(cacheKey);
            
            if (cached && Date.now() - cached.time < cacheTimeout) {
                return cached.value;
            }

            const value = tracker.getSmoothedSpeed(targetTime);
            cache.set(cacheKey, { value, time: Date.now() });

            // Cleanup old cache entries
            if (cache.size > 1000) {  // Prevent unbounded growth
                const now = Date.now();
                for (const [key, entry] of cache.entries()) {
                    if (now - entry.time > cacheTimeout) {
                        cache.delete(key);
                    }
                }
            }

            return value;
        };
    })();

    // Optimization: Batch stats updates
    const [stats, setStats] = useState(null);
    useEffect(() => {
        const updateStats = () => {
            if (typingSpeed.length === 0) return;

            const now = Date.now();
            const newStats = {
                current: Math.round(speedTrackers.short.current.getSmoothedSpeed(now)),
                oneMinAvg: Math.round(speedTrackers.medium.current.getSmoothedSpeed(now)),
                tenMinAvg: Math.round(speedTrackers.long.current.getSmoothedSpeed(now)),
                oneMinPeak: Math.round(speedTrackers.medium.current.getPeakSpeed()),
                tenMinPeak: Math.round(speedTrackers.long.current.getPeakSpeed()),
                sessionPeak: Math.round(Math.max(...typingSpeed.map(s => s.speed)))
            };

            // Only update if values changed significantly
            if (!stats || Object.entries(newStats).some(
                ([key, value]) => Math.abs(value - stats[key]) >= MIN_SPEED_CHANGE
            )) {
                setStats(newStats);
            }
        };

        const intervalId = setInterval(updateStats, STATS_UPDATE_INTERVAL);
        return () => clearInterval(intervalId);
    }, [typingSpeed.length, stats]);

    // Optimization: Reduce graph resolution based on performance
    const getOptimalResolution = () => {
        const width = window.innerWidth;
        // Adjust points based on screen width
        return Math.min(width * 2, 1000);  // Cap at 1000 points
    };

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

    // Update typing speed calculation to use trackers
    const updateTypingSpeed = (newText) => {
        const now = Date.now();
        const timeDiff = now - lastTypedTime.current;
        const charsTyped = Math.max(0, newText.length - (currentTextRef.current?.length || 0));
        
        if (timeDiff > 0 && timeDiff <= SAMPLE_INTERVAL && charsTyped > 0) {
            // Calculate WPM
            const wordsTyped = charsTyped / CHARS_PER_WORD;
            const minutesFraction = timeDiff / 60000;
            const instantWPM = wordsTyped / minutesFraction;

            // Update all trackers
            Object.values(speedTrackers).forEach(tracker => 
                tracker.current.addSample(instantWPM, now)
            );

            setTypingSpeed(prev => {
                const cutoffTime = now - DISPLAY_WINDOW;
                const recentSamples = prev.filter(s => s.time > cutoffTime);
                return [...recentSamples, { speed: instantWPM, time: now }];
            });
        }
        
        lastTypedTime.current = now;
        currentTextRef.current = newText;
    };

    // Update smoothing function to use trackers
    const getSmoothedSpeed = (samples, time, windowSize) => {
        const tracker = Object.entries(speedTrackers).find(
            ([_, t]) => t.current.windowSize === windowSize
        )?.[1];
        
        return tracker ? tracker.current.getSmoothedSpeed(time) : 0;
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

    // Draw graph with improved performance
    const drawGraph = () => {
        const canvas = graphCanvasRef.current;
        if (!canvas) return;

        const now = performance.now();
        const lastDrawTime = canvas.lastDrawTime || 0;

        // Throttle frame rate
        if (now - lastDrawTime < FRAME_INTERVAL) {
            animationFrameRef.current = requestAnimationFrame(drawGraph);
            return;
        }
        canvas.lastDrawTime = now;

        const ctx = canvas.getContext('2d', { alpha: false });
        const dpr = window.devicePixelRatio;
        
        // Clear transform
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        // Scale for DPI
        ctx.scale(dpr, dpr);
        
        const width = canvas.displayWidth;
        const height = canvas.displayHeight - 20;

        // Use a light gray background
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, width, height + 20);

        // Draw grid lines in batch
        ctx.beginPath();
        ctx.strokeStyle = '#e1e1e1';
        ctx.lineWidth = 1;

        // Batch all grid lines
        for (let i = 0; i <= 10; i++) {
            const x = width - (i * width / 10);
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
        }
        for (let wpm = 0; wpm <= MAX_WPM; wpm += 50) {
            const y = height * (1 - wpm / MAX_WPM);
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
        }
        ctx.stroke();

        // Add grid labels
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

        // Draw speed lines
        if (typingSpeed.length > 1) {
            const currentBucket = Math.floor(Date.now() / 1000) * 1000;

            Object.entries(speedTrackers).forEach(([key, tracker], index) => {
                const color = {
                    short: '#4CAF50',
                    medium: '#2196F3',
                    long: '#9C27B0'
                }[key];
                const alpha = [1, 0.7, 0.5][index];

                ctx.beginPath();
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.globalAlpha = alpha;

                let lastX = null;
                let lastY = null;

                // Draw points at 1-second intervals
                for (let i = 0; i <= DISPLAY_WINDOW; i += 1000) {
                    const timeAtPoint = currentBucket - (DISPLAY_WINDOW - i);
                    const smoothedSpeed = tracker.current.getSmoothedSpeed(timeAtPoint);
                    const x = (i / DISPLAY_WINDOW) * width;
                    const y = height * (1 - Math.min(smoothedSpeed, MAX_WPM) / MAX_WPM);

                    if (lastX === null) {
                        ctx.moveTo(x, y);
                    } else {
                        // Draw step pattern
                        ctx.lineTo(lastX, lastY);  // Horizontal line
                        ctx.lineTo(x, lastY);      // Horizontal line to new x
                        ctx.lineTo(x, y);          // Vertical line to new y
                    }
                    lastX = x;
                    lastY = y;
                }
                ctx.stroke();
            });
            ctx.globalAlpha = 1;

            // Add legend
            const legend = [
                { label: '10s', color: '#4CAF50' },
                { label: '4m', color: '#2196F3' },
                { label: '8m', color: '#9C27B0' }
            ];

            legend.forEach((item, i) => {
                const x = width - 50;
                const y = 15 + i * 15;
                
                ctx.strokeStyle = item.color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x - 15, y - 4);
                ctx.lineTo(x, y - 4);
                ctx.stroke();
                
                ctx.fillStyle = '#666666';
                ctx.fillText(item.label, x + 5, y);
            });
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
    }, [typingSpeed]);

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

    const handleInputChange = (e) => {
        const newText = e.target.value;
        setInput(newText);
        updateTypingSpeed(newText);
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

    const handleKeyDown = (e) => {
        if (e.key === 'Backspace' || e.key === 'Delete') {
            e.preventDefault();
            return false;
        }
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
            const recentSamples = typingSpeed.filter(s => now - s.time <= 1000);
            const currentSpeed = recentSamples.length > 0
                ? recentSamples.reduce((sum, s) => sum + s.speed, 0) / recentSamples.length
                : 0;

            // Update all trackers
            Object.values(speedTrackers).forEach(tracker => {
                tracker.current.addSample(currentSpeed, now);
            });

            // Schedule next update
            speedUpdateRef.current = setTimeout(updateSpeed, 1000);
        };

        updateSpeed();
        return () => {
            if (speedUpdateRef.current) {
                clearTimeout(speedUpdateRef.current);
            }
        };
    }, [typingSpeed]);

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
                            {char}
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
                    {typingSpeed.length > 0 && stats && (
                        <>
                            <div className="stat-item" style={{ color: '#4CAF50' }}>
                                <span className="stat-value">{stats.current}</span>
                                <span className="stat-label">Current WPM</span>
                            </div>
                            <div className="stat-item" style={{ color: '#2196F3' }}>
                                <span className="stat-value">{stats.oneMinAvg}</span>
                                <span className="stat-label">1min Avg</span>
                            </div>
                            <div className="stat-item" style={{ color: '#9C27B0' }}>
                                <span className="stat-value">{stats.tenMinAvg}</span>
                                <span className="stat-label">10min Avg</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-value">{stats.oneMinPeak}</span>
                                <span className="stat-label">1min Peak</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-value">{stats.tenMinPeak}</span>
                                <span className="stat-label">10min Peak</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-value">{stats.sessionPeak}</span>
                                <span className="stat-label">Session Peak</span>
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
