import React, { useRef } from 'react';
import './TypingArea.css';

export const TypingArea = ({ 
    text, 
    onChange, 
    onKeyDown,
    staleIndex = -1 
}) => {
    const inputRef = useRef(null);

    const handleContainerClick = () => {
        inputRef.current?.focus();
    };

    // Calculate the percentage where the text should be visible
    const fadePoint = text.length ? ((staleIndex + 1) / text.length) * 100 : 0;

    return (
        <div 
            className="editor-container" 
            onClick={handleContainerClick}
        >
            <div className="text-container">
                <input
                    ref={inputRef}
                    type="text"
                    value={text}
                    onChange={onChange}
                    onKeyDown={onKeyDown}
                    className="editor-input"
                    autoFocus
                />
                <span 
                    className="text"
                    style={{
                        '--fade-point': `${fadePoint}%`
                    }}
                >
                    {text}
                </span>
                <span className="cursor">|</span>
            </div>
        </div>
    );
}; 