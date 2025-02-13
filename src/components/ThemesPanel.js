import React, { useState, useEffect } from 'react';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import './ThemesPanel.css';

// Category colors mapping
const CATEGORY_COLORS = {
    'Career': '#FF6B6B',        // Coral Red
    'Money': '#4CAF50',         // Green
    'Health': '#2196F3',        // Blue
    'Significant Other': '#E91E63', // Pink
    'Family': '#9C27B0',        // Purple
    'Friends': '#FF9800',       // Orange
    'Personal Growth': '#00BCD4', // Cyan
    'Fun & Recreation': '#FFEB3B', // Yellow
    'Physical Environment': '#795548', // Brown
    'Spirituality': '#673AB7',   // Deep Purple
    'Community': '#009688'      // Teal
};

// All life categories that should always be shown
const ALL_CATEGORIES = [
    'Career',
    'Money',
    'Health',
    'Significant Other',
    'Family',
    'Friends',
    'Personal Growth',
    'Fun & Recreation',
    'Physical Environment',
    'Spirituality',
    'Community'
];

export function ThemesPanel({ themes = [], categorizedIdeas = {} }) {
    const [expandedCategories, setExpandedCategories] = useState(new Set());
    
    useEffect(() => {
        console.log('\n=== ThemesPanel Debug ===');
        console.log('Received categorizedIdeas:', categorizedIdeas);
    }, [categorizedIdeas]);

    const toggleCategory = (category) => {
        console.log('Toggling category:', category);
        setExpandedCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(category)) {
                newSet.delete(category);
            } else {
                newSet.add(category);
            }
            return newSet;
        });
    };

    return (
        <div className="themes-panel">
            <div className="themes-header">
                <h2>Life Categories</h2>
            </div>
            <div className="categories-list">
                {ALL_CATEGORIES.map(category => (
                    <div 
                        key={category} 
                        className="category-item"
                        style={{
                            '--category-color': CATEGORY_COLORS[category] || '#888888'
                        }}
                    >
                        <div 
                            className="category-header"
                            onClick={() => toggleCategory(category)}
                        >
                            <div className="category-title">
                                <div className="category-dot"></div>
                                <h3>{category}</h3>
                            </div>
                            <div className="category-info">
                                <span className="idea-count">
                                    {categorizedIdeas[category]?.length || 0}
                                </span>
                                {expandedCategories.has(category) ? <FaChevronUp /> : <FaChevronDown />}
                            </div>
                        </div>
                        {expandedCategories.has(category) && categorizedIdeas[category] && (
                            <div className="category-ideas">
                                {categorizedIdeas[category].map((idea, index) => (
                                    <div key={index} className="idea-item">
                                        <div className="idea-score">{idea.score}</div>
                                        <div className="idea-text">{idea.text}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
} 