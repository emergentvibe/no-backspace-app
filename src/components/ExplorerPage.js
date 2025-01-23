// frontend/src/components/ExplorerPage.js

import React, { useState, useEffect } from 'react';
import { getSessions, searchSessions } from '../services/sessionService';
import '../globalStyles.css';

const HighlightedText = ({ text, chunks }) => {
  console.log('HighlightedText received:', {
    textLength: text?.length,
    textPreview: text?.slice(0, 50),
    hasChunks: Boolean(chunks),
    chunksLength: chunks?.length,
    chunks: JSON.stringify(chunks)  // Better debug view of chunks
  });
  
  // Return plain text if:
  // 1. No chunks provided
  // 2. Empty chunks array
  // 3. Chunks without valid offsets
  if (!chunks || 
      !Array.isArray(chunks) || 
      chunks.length === 0 || 
      !chunks.some(chunk => chunk?.startOffset >= 0 && chunk?.endOffset > chunk?.startOffset)) {
    console.log('No valid chunks to highlight, returning plain text');
    return <div>{text}</div>;
  }
  
  // Filter out invalid chunks and sort remaining ones
  const validChunks = chunks.filter(chunk => 
    chunk && 
    typeof chunk.startOffset === 'number' && 
    typeof chunk.endOffset === 'number' && 
    chunk.startOffset >= 0 && 
    chunk.endOffset > chunk.startOffset &&
    chunk.endOffset <= text.length
  );

  if (validChunks.length === 0) {
    console.log('No valid chunks after filtering, returning plain text');
    return <div>{text}</div>;
  }

  const sortedChunks = [...validChunks].sort((a, b) => a.startOffset - b.startOffset);
  console.log('Valid chunks to highlight:', sortedChunks.map(chunk => ({
    text: text.slice(chunk.startOffset, chunk.endOffset),
    ...chunk
  })));
  
  // Build the text pieces with highlights
  let lastIndex = 0;
  const pieces = [];
  
  sortedChunks.forEach((chunk, index) => {
    console.log(`Processing chunk ${index}:`, {
      startOffset: chunk.startOffset,
      endOffset: chunk.endOffset,
      chunkText: text.slice(chunk.startOffset, chunk.endOffset),
      beforeText: text.slice(lastIndex, chunk.startOffset)
    });
    
    // Add text before this chunk
    if (chunk.startOffset > lastIndex) {
      pieces.push(
        <span key={`text-${index}`}>
          {text.slice(lastIndex, chunk.startOffset)}
        </span>
      );
    }
    
    // Add highlighted chunk
    pieces.push(
      <span 
        key={`highlight-${index}`} 
        style={{ backgroundColor: '#ffd70066', padding: '0 2px' }}
      >
        {text.slice(chunk.startOffset, chunk.endOffset)}
      </span>
    );
    
    lastIndex = chunk.endOffset;
  });
  
  // Add any remaining text
  if (lastIndex < text.length) {
    console.log('Adding remaining text:', {
      from: lastIndex,
      to: text.length,
      text: text.slice(lastIndex)
    });
    pieces.push(
      <span key="text-end">
        {text.slice(lastIndex)}
      </span>
    );
  }
  
  console.log('Final pieces array:', pieces.map(piece => ({
    type: piece.key,
    text: piece.props.children
  })));
  
  return <div>{pieces}</div>;
};

const ExplorerPage = () => {
  const [sessions, setSessions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const data = await getSessions();
      setSessions(data || []); // Ensure we always have an array
      setSearchResults([]); // Clear search results when loading all sessions
      setError(null);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setError('Failed to load sessions');
      setSessions([]); // Set empty array on error
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const response = await fetch(`http://localhost:4000/sessions/search?query=${encodeURIComponent(searchQuery)}`);
      const results = await response.json();
      console.log('Search results received:', {
        count: results.length,
        results: results.map(r => ({
          id: r.id,
          textLength: r.text?.length,
          hasChunk: Boolean(r.chunk),
          hasChunks: Boolean(r.chunks),
          chunk: r.chunk,
          chunks: r.chunks,
          similarity: r.similarity
        }))
      });
      setSearchResults(results);
      setSelectedSession(null); // Clear selection when search results change
    } catch (error) {
      console.error('Error searching sessions:', error);
      setError('Search failed');
    }
    setIsSearching(false);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const truncateText = (text, maxLength = 100) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  // Determine which sessions to show in sidebar
  const displayedSessions = searchResults.length > 0 ? searchResults : sessions;

  return (
    <div style={{ 
      display: 'grid',
      gridTemplateColumns: 'var(--sidebar-width) 1fr',
      height: `calc(100vh - var(--navbar-height))`,
      backgroundColor: 'var(--color-bg)',
      position: 'relative'
    }}>
      {/* Sidebar */}
      <div style={{ 
        backgroundColor: 'var(--color-bg-alt)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'sticky',
        top: 'var(--navbar-height)',
      }}>
        {/* Search Form */}
        <div style={{ 
          padding: 'var(--spacing-md)',
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg-alt)'
        }}>
          <form onSubmit={handleSearch} className="search-form">
            <div style={{ flex: 1 }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes..."
                className="input"
              />
            </div>
            <button 
              type="submit"
              disabled={isSearching}
              className={`btn btn-primary ${isSearching ? 'disabled' : ''}`}
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </form>
        </div>

        {/* Sessions List */}
        <div className="scrollable" style={{ 
          flex: 1,
          padding: 'var(--spacing-md)'
        }}>
          {error && <div className="error-message">{error}</div>}
          {isSearching ? (
            <div>Searching...</div>
          ) : (
            <div>
              {displayedSessions.map(session => (
                <div
                  key={session._id || session.id}
                  onClick={() => {
                    console.log('Selected session:', {
                      id: session._id || session.id,
                      textLength: session.text?.length,
                      hasChunk: Boolean(session.chunk),
                      hasChunks: Boolean(session.chunks),
                      chunk: session.chunk,
                      chunks: session.chunks
                    });
                    setSelectedSession(session);
                  }}
                  style={{
                    padding: 'var(--spacing-sm)',
                    marginBottom: 'var(--spacing-sm)',
                    cursor: 'pointer',
                    backgroundColor: selectedSession?._id === session._id ? 'var(--color-border)' : 'var(--color-bg-alt)',
                    transition: 'all var(--transition-base)',
                    borderRadius: 'var(--border-radius)'
                  }}
                >
                  <div className="text-light" style={{ fontSize: 'var(--font-size-small)', marginBottom: 'var(--spacing-xs)' }}>
                    {formatDate(session.createdAt)}
                  </div>
                  <div className="mono">{truncateText(session.text)}</div>
                  {session.similarity && (
                    <div style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-primary)', marginTop: 'var(--spacing-xs)' }}>
                      Similarity: {(parseFloat(session.similarity) * 100).toFixed(1)}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ 
        padding: 'var(--spacing-xl)',
        display: 'flex',
        justifyContent: 'center',
        height: '100%',
        backgroundColor: 'var(--color-bg)',
        overflowY: 'auto'
      }}>
        <div style={{
          width: 'var(--content-width)',
          maxWidth: 'var(--content-width)'
        }}>
          {selectedSession ? (
            <div>
              <div className="card" style={{ marginBottom: 'var(--spacing-md)' }}>
                <div className="text-light">
                  Created: {formatDate(selectedSession.createdAt)}
                  {selectedSession.similarity && (
                    <div style={{ color: 'var(--color-primary)', marginTop: 'var(--spacing-xs)' }}>
                      Similarity Score: {(parseFloat(selectedSession.similarity) * 100).toFixed(1)}%
                    </div>
                  )}
                </div>
              </div>
              <div className="card mono" style={{
                whiteSpace: 'pre-wrap',
                lineHeight: 'var(--line-height)',
                padding: 'var(--spacing-xl)',
                fontSize: 'var(--font-size-base)'
              }}>
                <HighlightedText 
                  text={selectedSession.text} 
                  chunks={searchResults.length > 0 ? (selectedSession.chunks || [selectedSession.chunk].filter(Boolean)) : []} 
                />
              </div>
            </div>
          ) : (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '100%',
              color: 'var(--color-text-light)'
            }}>
              Select a note to view its contents
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExplorerPage;
