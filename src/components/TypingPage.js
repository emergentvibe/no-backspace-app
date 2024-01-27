// TypingPage.js

import React, { useState, useRef, useEffect } from 'react';
import './TypingPage.css'; // Import the styles

function TypingPage() {
    const [input, setInput] = useState('');
    const containerRef = useRef(null);

    useEffect(() => {
        const container = containerRef.current;
        const containerWidth = container.clientWidth;
        const textWidth = container.scrollWidth;

        // If the text is wider than the container, shift the text to the left
        if (textWidth > containerWidth) {
            container.style.marginLeft = `-${textWidth - containerWidth}px`;
        } else {
            container.style.marginLeft = '0';
        }
    }, [input]);

    const handleInputChange = (e) => {
        setInput(e.target.value);
    };

    const handleContainerClick = () => {
        inputRef.current.focus();
    };

    const inputRef = useRef(null);

    return (

        <div>
            <div style={{ textAlign: 'center' }}>
                <h2>Typing Page</h2>
            </div>
            <div
                ref={containerRef}
                onClick={handleContainerClick}
                className="editor-container" // Use the class name for styling
            >
                <div className="text-container"> {/* Use the class name for styling */}
                    <span>{input}</span>
                    <span className="blink">|</span>
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={handleInputChange}
                    className="editor-input" // Use the class name for styling
                />
            </div>
        </div>
    );
}

export default TypingPage;
