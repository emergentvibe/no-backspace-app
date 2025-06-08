import React from 'react';
import { FaSave, FaPlus, FaQuestion } from 'react-icons/fa';
import './TypingControls.css';

export const TypingControls = ({ 
    onStartNew, 
    onSave, 
    onProcess, 
    isProcessing, 
    hasSession 
}) => {
    return (
        <div className="button-bar">
            <button
                className="save-button save-new"
                onClick={onStartNew}
                title="Start a new session"
            >
                <FaPlus /> New
            </button>
            <button
                className="save-button save-explore"
                onClick={onSave}
                title="Save current session"
            >
                <FaSave /> Save
            </button>
            <button
                className="save-button process-button"
                onClick={onProcess}
                disabled={!hasSession || isProcessing}
                title="Process current session"
            >
                <FaQuestion /> Process
            </button>
        </div>
    );
}; 