// frontend/src/components/ExplorerPage.js

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getSessions, searchSessions } from '../services/sessionService';
import '../globalStyles.css';

const ExplorerPage = () => {
  const [sessions, setSessions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
  const location = useLocation();

  useEffect(() => {
    fetchSessions();
  }, [location]); // Refresh when location changes (i.e., when navigating to this page)

  useEffect(() => {
    // Set up visibility change listener
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchSessions();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Clean up
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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
      const results = await searchSessions(searchQuery);
      console.log('Search results received:', results);
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

  // Determine which sessions to show in sidebar
  const displayedSessions = searchResults.length > 0 ? searchResults : sessions;

  return (
    <div style={{ 
      display: 'grid',
      gridTemplateColumns: 'var(--sidebar-width) 1fr 1fr',
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
                  onClick={() => setSelectedSession(session)}
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
                  <div className="mono" style={{ fontWeight: 'bold', marginBottom: 'var(--spacing-xs)' }}>
                    {session.title || 'Untitled Note'}
                  </div>
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

      {/* Main Content Container */}
      <div style={{ 
        gridColumn: '2 / span 2',
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}>
        {selectedSession ? (
          <>
            {/* Single Header */}
            <div className="card" style={{ 
              margin: 'var(--spacing-xl) var(--spacing-xl) 0',
              padding: 'var(--spacing-md)',
              borderBottom: '1px solid var(--color-border)'
            }}>
              <div style={{ 
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
              }}>
                <div style={{ 
                  fontSize: 'var(--font-size-large)',
                  fontWeight: 'bold',
                  flex: 1
                }}>
                  {selectedSession.title || 'Untitled Note'}
                </div>
                <div className="text-light" style={{ textAlign: 'right' }}>
                  {formatDate(selectedSession.createdAt)}
                  {selectedSession.similarity && (
                    <div style={{ color: 'var(--color-primary)', marginTop: 'var(--spacing-xs)' }}>
                      Similarity Score: {(parseFloat(selectedSession.similarity) * 100).toFixed(1)}%
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Content Panels Container */}
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              flex: 1,
              overflow: 'hidden'
            }}>
              {/* Raw Text Panel */}
              <div style={{ 
                padding: 'var(--spacing-xl)',
                height: '100%',
                backgroundColor: 'var(--color-bg)',
                overflowY: 'auto',
                borderRight: '1px solid var(--color-border)'
              }}>
                <div className="card" style={{ marginBottom: 'var(--spacing-md)' }}>
                  <div style={{ 
                    fontSize: 'var(--font-size-base)',
                    color: 'var(--color-text-light)'
                  }}>
                    Raw Text
                  </div>
                </div>
                <div className="card mono" style={{
                  whiteSpace: 'pre-wrap',
                  lineHeight: 'var(--line-height)',
                  padding: 'var(--spacing-xl)',
                  fontSize: 'var(--font-size-base)'
                }}>
                  {selectedSession.text || 'No content available'}
                </div>
              </div>

              {/* Summary Panel */}
              <div style={{ 
                padding: 'var(--spacing-xl)',
                height: '100%',
                backgroundColor: 'var(--color-bg)',
                overflowY: 'auto'
              }}>
                {/* Summary Section */}
                <div className="card" style={{ marginBottom: 'var(--spacing-md)' }}>
                  <div style={{ 
                    fontSize: 'var(--font-size-base)',
                    color: 'var(--color-text-light)'
                  }}>
                    Summary
                  </div>
                </div>
                <div className="card mono" style={{
                  whiteSpace: 'pre-wrap',
                  lineHeight: 'var(--line-height)',
                  padding: 'var(--spacing-xl)',
                  fontSize: 'var(--font-size-base)',
                  marginBottom: 'var(--spacing-xl)'
                }}>
                  {selectedSession.summary || 'No summary available'}
                </div>

                {/* Atomic Ideas Section */}
                <div className="card" style={{ marginBottom: 'var(--spacing-md)' }}>
                  <div style={{ 
                    fontSize: 'var(--font-size-base)',
                    color: 'var(--color-text-light)',
                    marginBottom: 'var(--spacing-md)'
                  }}>
                    Atomic Ideas
                  </div>
                  {/* Tags Section */}
                  {selectedSession.atomicIdeas && (
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 'var(--spacing-sm)',
                      marginBottom: 'var(--spacing-md)',
                      padding: 'var(--spacing-sm)'
                    }}>
                      {Array.from(new Set(
                        selectedSession.atomicIdeas
                          .split('\n')
                          .filter(line => line.includes(':'))
                          .map(line => line.split(':')[0].replace(/^\d+\.\s*/, '').trim())
                      )).map((tag, index) => (
                        <div
                          key={index}
                          style={{
                            backgroundColor: 'var(--color-primary)',
                            color: 'var(--color-bg)',
                            padding: 'var(--spacing-xs) var(--spacing-sm)',
                            borderRadius: '100px',
                            fontSize: 'var(--font-size-small)',
                            fontFamily: 'var(--font-mono)',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {tag}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="card mono" style={{
                  whiteSpace: 'pre-wrap',
                  lineHeight: 'var(--line-height)',
                  padding: 'var(--spacing-xl)',
                  fontSize: 'var(--font-size-base)'
                }}>
                  {selectedSession.atomicIdeas ? (
                    selectedSession.atomicIdeas.split('\n').map((line, index) => {
                      if (!line.trim()) return null;
                      const [number, ...rest] = line.split('.');
                      const [category, content] = rest.join('.').split(':');
                      if (!content) return line;
                      
                      return (
                        <div key={index} style={{ marginBottom: 'var(--spacing-md)' }}>
                          <span style={{ color: 'var(--color-text-light)' }}>{number}. </span>
                          <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>
                            {category.trim()}:
                          </span>
                          <span>{content}</span>
                        </div>
                      );
                    })
                  ) : (
                    'No atomic ideas available'
                  )}
                </div>
              </div>
            </div>
          </>
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
  );
};

export default ExplorerPage;
