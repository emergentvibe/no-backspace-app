import React from 'react';

const HighlightedText = ({ text, highlights }) => {
    console.log('\n=== HighlightedText Debug ===');
    console.log('Text length:', text?.length);
    console.log('Number of highlights:', highlights?.length);
    
    if (!highlights || highlights.length === 0) {
        return <div>{text}</div>;
    }

    // Sort highlights by start offset
    const sortedHighlights = [...highlights].sort((a, b) => a.startOffset - b.startOffset);
    console.log('Sorted highlights:', sortedHighlights.map(h => ({
        start: h.startOffset,
        end: h.endOffset,
        similarity: h.similarity,
        textPreview: text.slice(h.startOffset, h.startOffset + 50) + '...'
    })));

    // Build text segments with highlights
    const segments = [];
    let currentPos = 0;

    sortedHighlights.forEach((highlight, index) => {
        // Add non-highlighted text before this highlight
        if (highlight.startOffset > currentPos) {
            segments.push({
                text: text.slice(currentPos, highlight.startOffset),
                isHighlight: false
            });
        }

        // Add highlighted text
        segments.push({
            text: text.slice(highlight.startOffset, highlight.endOffset),
            isHighlight: true,
            similarity: highlight.similarity
        });

        currentPos = highlight.endOffset;
    });

    // Add any remaining text after last highlight
    if (currentPos < text.length) {
        segments.push({
            text: text.slice(currentPos),
            isHighlight: false
        });
    }

    console.log('Generated segments:', segments.map(s => ({
        length: s.text.length,
        isHighlight: s.isHighlight,
        similarity: s.similarity,
        preview: s.text.substring(0, 50) + '...'
    })));

    return (
        <div style={{ whiteSpace: 'pre-wrap' }}>
            {segments.map((segment, index) => (
                <span
                    key={index}
                    style={segment.isHighlight ? {
                        backgroundColor: segment.similarity ? 
                            `rgba(255, 182, 193, ${0.2 + segment.similarity * 0.5})` :  // Light pink with dynamic opacity
                            'rgba(255, 182, 193, 0.3)',  // Default light pink
                        borderRadius: '2px',
                        padding: '0 2px',
                        margin: '0 -2px'
                    } : undefined}
                >
                    {segment.text}
                </span>
            ))}
        </div>
    );
};

export default HighlightedText; 