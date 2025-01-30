import React, { useState } from 'react';
import './NamePrompt.css';

const NamePrompt = ({ onSubmit }) => {
    const [name, setName] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(name || 'Anonymous');
    };

    return (
        <div className="name-prompt-overlay">
            <div className="name-prompt-modal">
                <h2>Welcome!</h2>
                <p>Please enter your name to continue:</p>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        autoFocus
                    />
                    <button type="submit">
                        Continue
                    </button>
                </form>
            </div>
        </div>
    );
};

export default NamePrompt; 