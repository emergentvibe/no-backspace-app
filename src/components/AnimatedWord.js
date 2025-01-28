import React from 'react';

const AnimatedWord = React.memo(({ word, wordIndex, totalWords, isStale }) => {
    // Only move if not in the last 5 words
    const STATIC_WORDS = 5;
    const isMoving = wordIndex < (totalWords - STATIC_WORDS);
    
    // Direction based on word index (up or down)
    const direction = wordIndex % 2 === 0 ? 1 : -1;
    
    // Distance moved increases with distance from right
    const distance = isMoving ? (totalWords - STATIC_WORDS - wordIndex) * 15 : 0;
    
    return (
        <span
            style={{
                display: 'inline-block',
                opacity: isStale ? 0 : 1,
                transform: distance ? `translateY(${distance * direction}px)` : 'none',
                transition: 'transform 0.3s ease-out',
                marginRight: '0.5em',
                whiteSpace: 'pre'  // Preserve spaces
            }}
        >
            {word || ' '}
        </span>
    );
});

export default AnimatedWord; 