import React from 'react';

const AnimatedWord = ({ word, wordIndex, totalWords, isStale }) => {
    // Only animate if we're beyond the last 5 words
    const STATIC_WORDS = 5;
    const shouldAnimate = wordIndex < (totalWords - STATIC_WORDS);
    
    // Simple direction based on word index
    const direction = (wordIndex % 2) * 2 - 1; // Alternates between -1 and 1
    
    // Calculate offset - more offset for words further to the left
    const offset = shouldAnimate ? 
        (totalWords - STATIC_WORDS - wordIndex) * 20 * direction : 
        0;

    return (
        <span
            style={{
                display: 'inline-block',
                opacity: isStale ? 0 : 1,
                transform: `translateY(${offset}px)`,
                transition: 'transform 0.5s ease-out, opacity 2s ease-out',
                marginRight: '0.5em'
            }}
        >
            {word}
        </span>
    );
};

export default React.memo(AnimatedWord); 