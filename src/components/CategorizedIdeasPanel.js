import React, { useState } from 'react';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';

const CategorizedIdeasPanel = ({ categorizedIdeas }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!categorizedIdeas || Object.keys(categorizedIdeas).length === 0) {
        return null;
    }

    return (
        <div className="panel categorized-ideas-panel">
            <style>{`
                .categorized-ideas-panel {
                    position: fixed;
                    top: 50%;
                    right: 20px;
                    transform: translateY(-50%);
                    width: 300px;
                    max-height: 80vh;
                    background: var(--color-background);
                    border: 1px solid var(--color-border);
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                    z-index: 1000;
                    overflow: hidden;
                    transition: all 0.3s ease;
                }

                .panel-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 16px;
                    background: var(--color-background-light);
                    border-bottom: 1px solid var(--color-border);
                    cursor: pointer;
                }

                .panel-header h3 {
                    margin: 0;
                    font-size: 16px;
                    color: var(--color-text);
                }

                .panel-content {
                    overflow-y: auto;
                    max-height: calc(80vh - 45px);
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .category {
                    border: 1px solid var(--color-border);
                    border-radius: 6px;
                    overflow: hidden;
                }

                .category-header {
                    padding: 8px 12px;
                    background: var(--color-background-light);
                    font-weight: 600;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .category-content {
                    padding: 12px;
                }

                .idea-item {
                    display: flex;
                    align-items: flex-start;
                    gap: 8px;
                    margin-bottom: 8px;
                    font-size: 14px;
                }

                .idea-score {
                    background: var(--color-background-light);
                    color: var(--color-text-light);
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 12px;
                    min-width: 24px;
                    text-align: center;
                }

                .idea-text {
                    flex: 1;
                    line-height: 1.4;
                }

                .toggle-icon {
                    transition: transform 0.3s ease;
                }

                .toggle-icon.expanded {
                    transform: rotate(180deg);
                }
            `}</style>

            <div className="panel-header" onClick={() => setIsExpanded(!isExpanded)}>
                <h3>Life Categories</h3>
                {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
            </div>

            {isExpanded && (
                <div className="panel-content">
                    {Object.entries(categorizedIdeas).map(([category, ideas]) => (
                        <div key={category} className="category">
                            <div className="category-header">
                                <span>{category}</span>
                                <span className="idea-count">{ideas.length}</span>
                            </div>
                            <div className="category-content">
                                {ideas.map((idea, index) => (
                                    <div key={index} className="idea-item">
                                        <span className="idea-score">{idea.score}</span>
                                        <span className="idea-text">{idea.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CategorizedIdeasPanel; 