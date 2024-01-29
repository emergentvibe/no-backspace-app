import React, { useState, useEffect, useRef } from 'react';
import { createSession } from '../services/sessionService';
import './TypingPage.css';

function TypingPage() {
    const [input, setInput] = useState('');

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

    const handleContainerClick = () => {
        inputRef.current.focus();
    };

    const inputRef = useRef(null);

    const handleClearEditor = () => {
        setInput('');
    };

    const handleSaveSession = async () => {
        try {
            await createSession(input);
        } catch (error) {
            console.error('Error saving session:', error);
        }
    };

    return (
        <div>
            <div style={{ textAlign: 'center' }}>
                <h2>Typing Page</h2>
                <button onClick={handleSaveSession}>Save Session</button>
                <button onClick={handleClearEditor}>New Session</button>
            </div>
            <div
                onClick={handleContainerClick}
                className="editor-container"
            >
                <div className="text-container">
                    <span>{input}</span>
                    <span className="blink">|</span>
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={handleInputChange}
                    className="editor-input"
                />

            </div>
        </div>
    );
}

export default TypingPage;
