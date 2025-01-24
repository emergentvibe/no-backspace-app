import React, { useState, useEffect, useRef } from 'react';
import { createSession } from '../services/sessionService';
import './TypingPage.css';
import '../globalStyles.css';

function TypingPage() {
    const [input, setInput] = useState('');
    const [staleIndex, setStaleIndex] = useState(-1);
    const [showInactivityWarning, setShowInactivityWarning] = useState(false);
    const inactivityTimeout = useRef(null);
    const typingTimeout = useRef(null);
    const inputRef = useRef(null);

    // Clear state when component mounts
    useEffect(() => {
        setInput('');
        setStaleIndex(-1);
        setShowInactivityWarning(false);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (inactivityTimeout.current) clearTimeout(inactivityTimeout.current);
            if (typingTimeout.current) clearTimeout(typingTimeout.current);
        };
    }, []);

    const handleSaveAndClear = async () => {
        if (!input.trim()) return;
        
        try {
            await createSession(input);
            setInput('');
            setStaleIndex(-1);
            setShowInactivityWarning(false);
        } catch (error) {
            console.error('Error saving session:', error);
        }
    };

    const handleInputChange = (e) => {
        const newText = e.target.value;
        setInput(newText);
        setShowInactivityWarning(false);

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

        // Show warning after 20s, save after 2m
        inactivityTimeout.current = setTimeout(() => {
            setShowInactivityWarning(true);
            setTimeout(handleSaveAndClear, 100000); // 100s more after warning
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

    return (
        <div>
            <div 
                className="inactivity-indicator" 
                style={{ 
                    opacity: showInactivityWarning ? 1 : 0,
                    transform: showInactivityWarning ? 'translateY(0)' : 'translateY(10px)'
                }}
            >
                <span>Inactivity detected, session will be auto-saved soon</span>
                {showInactivityWarning && <div className="countdown-circle" />}
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
        </div>
    );
}

export default TypingPage;
