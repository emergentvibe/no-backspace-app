import React, { useState, useEffect, useRef } from 'react';
import { createSession } from '../services/sessionService';
import { useNavigate } from 'react-router-dom';
import './TypingPage.css';
import '../globalStyles.css';

function TypingPage() {
    const [input, setInput] = useState('');
    const navigate = useNavigate();

    // Load data from localStorage when component mounts
    useEffect(() => {
        const savedInput = localStorage.getItem('typingData');
        if (savedInput) {
            setInput(savedInput);
        }
    }, []);

    // Save data to localStorage whenever input changes
    useEffect(() => {
        localStorage.setItem('typingData', input);
    }, [input]);

    const handleInputChange = (e) => {
        setInput(e.target.value);
    };

    // Prevent backspace and delete keys
    const handleKeyDown = (e) => {
        if (e.key === 'Backspace' || e.key === 'Delete') {
            e.preventDefault();
            return false;
        }
    };

    const handleContainerClick = () => {
        inputRef.current.focus();
    };

    const inputRef = useRef(null);

    const handleClearEditor = () => {
        setInput('');
    };

    const handleSaveSession = async () => {
        if (!input.trim()) return; // Don't save empty sessions
        try {
            await createSession(input);
            setInput(''); // Clear input after successful save
            navigate('/explorer'); // Navigate to explorer page after saving
        } catch (error) {
            console.error('Error saving session:', error);
        }
    };

    return (
        <div>
            {/* Controls */}
            <div style={{ 
                position: 'fixed',
                top: 'var(--navbar-height)',
                left: 0,
                right: 0,
                padding: 'var(--spacing-md)',
                backgroundColor: 'var(--color-bg-alt)',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'center',
                gap: 'var(--spacing-md)',
                zIndex: 10
            }}>
                <button onClick={handleSaveSession} className="btn btn-primary" disabled={!input.trim()}>
                    Save Note
                </button>
                <button onClick={handleClearEditor} className="btn" disabled={!input.trim()}>
                    New Note
                </button>
            </div>

            {/* Editor */}
            <div
                onClick={handleContainerClick}
                className="editor-container"
                style={{ marginTop: 'var(--spacing-xl)' }}
            >
                <div className="text-container mono">
                    <span>{input}</span>
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
            </div>
        </div>
    );
}

export default TypingPage;
