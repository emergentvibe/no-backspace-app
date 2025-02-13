import React from 'react';

const Questions = ({ questions = [], isLoading = false }) => {
    return (
        <div className="questions-panel">
            <div className="questions-header">
                <h2>Questions</h2>
                {isLoading && <div className="loading-spinner" />}
            </div>
            <div className="questions-list">
                {questions.length === 0 ? (
                    <div className="no-questions">
                        No questions generated yet.
                    </div>
                ) : (
                    questions
                        .sort((a, b) => b.score - a.score)
                        .map((question, index) => (
                            <div key={index} className="question-item">
                                <div className="question-score">
                                    {question.score}
                                </div>
                                <div className="question-text">
                                    {question.text}
                                </div>
                            </div>
                        ))
                )}
            </div>
        </div>
    );
};

export default Questions; 