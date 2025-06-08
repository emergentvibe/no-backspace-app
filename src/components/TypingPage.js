import React, { useState, useEffect, useRef } from 'react';
import { createSession, checkSessionStatus, updateSession, closeSession, processSession } from '../services/sessionService';
import { useNavigate } from 'react-router-dom';
import './TypingPage.css';
import '../globalStyles.css';
import { FaSave, FaPlus, FaQuestion } from 'react-icons/fa';
import Questions from './Questions';
import { TypingSpeedGraph, useSpeedTracker, WINDOW_SIZE, GRAPH_WINDOW, MAX_WPM } from './TypingSpeedGraph';
import { QuestionsPanel } from './QuestionsPanel';
import { ThemesPanel } from './ThemesPanel';
import { processThemes } from '../services/themeService';
import { SpeedMonitor } from './SpeedMonitor';
import { TypingControls } from './TypingControls';
import { TypingArea } from './TypingArea';

const TypingPage = ({ userName }) => {
    // State
    const [input, setInput] = useState(() => localStorage.getItem('currentText') || '');
    const [currentSessionId, setCurrentSessionId] = useState(() => localStorage.getItem('currentSessionId') || null);
    const [staleIndex, setStaleIndex] = useState(-1);
    const [showInactivityWarning, setShowInactivityWarning] = useState(false);
    const [savingStatus, setSavingStatus] = useState('');
    const [sessionInfo, setSessionInfo] = useState('');
    const [questions, setQuestions] = useState([]);
    const [processingQuestions, setProcessingQuestions] = useState(false);
    const [themes, setThemes] = useState([]);
    const [categorizedIdeas, setCategorizedIdeas] = useState({});
    
    // Refs
    const inactivityTimeout = useRef(null);
    const typingTimeout = useRef(null);
    const saveTimeout = useRef(null);
    const inputRef = useRef(null);
    const currentTextRef = useRef(input);
    const navigate = useNavigate();
    const isSaving = useRef(false);

    // Add new state and refs for typing speed tracking
    const lastTypedTime = useRef(Date.now());
    const speedTracker = useSpeedTracker();
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
        
        // Debug logging for character count
        console.log('\n=== Text Change Debug ===');
        console.log('Text length:', newText.length);
        console.log('Previous text length:', currentTextRef.current?.length || 0);
        console.log('Session ID:', currentSessionId);
        
        // Show session info when user starts typing
        if (!sessionInfo && newText.length === 1) {
            setSessionInfo('Started new writing session');
            setTimeout(() => {
                const infoEl = document.querySelector('.session-info');
                if (infoEl) infoEl.classList.add('hiding');
                setTimeout(() => setSessionInfo(''), 300);
            }, 2700);
        }
        
        // Show autosave info and trigger processing check at 500 chars
        if (newText.length >= 500 && (!currentTextRef.current || currentTextRef.current.length < 500)) {
            console.log('🎯 Hit 500 character threshold');
            console.log('Current session state:', {
                sessionId: currentSessionId,
                textLength: newText.length,
                previousLength: currentTextRef.current?.length
            });
            
            setSessionInfo('Processing triggered at 500 characters...');
            setTimeout(() => {
                const infoEl = document.querySelector('.session-info');
                if (infoEl) infoEl.classList.add('hiding');
                setTimeout(() => setSessionInfo(''), 300);
            }, 1700);
            
            // Trigger check and update
            checkAndUpdateSession(newText).catch(error => {
                console.error('Error in 500-char processing:', error);
            });
        }
        
        const now = Date.now();
        const timeDiff = now - lastTypedTime.current;
        const charsTyped = Math.max(0, newText.length - (currentTextRef.current?.length || 0));
        
        if (timeDiff > 0 && charsTyped > 0) {
            // Calculate WPM: (characters/5) / minutes
            const wordsTyped = charsTyped / 5;
            const minutesFraction = timeDiff / 60000;
            const instantWPM = Math.min(wordsTyped / minutesFraction, MAX_WPM); // Cap at MAX_WPM

            // Add sample to speed tracker
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
        };
    }, []);

    const handleProcess = async () => {
        if (!currentSessionId || processingQuestions) return;
        
        setSessionInfo('Processing...');
        try {
            const result = await processSession(currentSessionId);
            setQuestions(result.session.questions || []);
            setThemes(result.session.themes || []);
            setCategorizedIdeas(result.session.categorizedIdeas || {});
            setSessionInfo('Processing complete');
        } catch (error) {
            console.error('Processing failed:', error);
            setSessionInfo('Failed to process');
        }
    };

    // Add timeout to clear messages
    useEffect(() => {
        if (savingStatus) {
            const timer = setTimeout(() => {
                setSavingStatus('');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [savingStatus]);

    useEffect(() => {
        if (sessionInfo) {
            const timer = setTimeout(() => {
                setSessionInfo('');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [sessionInfo]);

    useEffect(() => {
        if (showInactivityWarning) {
            const timer = setTimeout(() => {
                setShowInactivityWarning(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [showInactivityWarning]);

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
            
            // First, close the current session using checkAndUpdateSession
            let result;
            if (currentSessionId) {
                console.log('Closing existing session:', currentSessionId);
                result = await checkAndUpdateSession(textToSave, true);
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
            <TypingControls
                onStartNew={handleStartNew}
                onSave={handleSave}
                onProcess={handleProcess}
                isProcessing={processingQuestions}
                hasSession={!!currentSessionId}
            />

            <div className="left-sidebar">
                <ThemesPanel themes={themes} categorizedIdeas={categorizedIdeas} />
            </div>

            <TypingArea
                text={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                staleIndex={staleIndex}
            />

            <div className="right-sidebar">
                <QuestionsPanel 
                    questions={questions}
                    isProcessing={processingQuestions}
                />
            </div>

            <SpeedMonitor
                stats={stats}
                graphComponent={<TypingSpeedGraph speedTracker={speedTracker} />}
                elapsedTime={elapsedTime}
            />

            {(savingStatus || sessionInfo) && (
                <div className="status-container">
                    {savingStatus && (
                        <div className={`status-message ${savingStatus ? 'visible' : ''}`}>
                            {savingStatus}
                        </div>
                    )}
                    {sessionInfo && (
                        <div className={`session-info ${sessionInfo ? 'visible' : ''}`}>
                            {sessionInfo}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default TypingPage; 