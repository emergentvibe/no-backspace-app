// frontend/src/components/ExplorerPage.js

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getSessions, searchSessions, searchWithinSession, deleteSession, reprocessSession, checkSessionStatus } from '../services/sessionService';
import HighlightedText from './HighlightedText';
import '../globalStyles.css';

const ExplorerPage = () => {
  const [sessions, setSessions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
  const [highlights, setHighlights] = useState([]);
  const [isSearchingIdea, setIsSearchingIdea] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null); // Track which session's menu is open
  const [reprocessingIds, setReprocessingIds] = useState(new Set());
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

  const handleIdeaClick = async (ideaText) => {
    if (!selectedSession || isSearchingIdea) return;
    
    // Toggle selection if clicking the same idea
    if (selectedIdea === ideaText) {
      setSelectedIdea(null);
      setHighlights([]);
      return;
    }
    
    console.log('\n=== Idea Click Debug ===');
    console.log('Clicked idea:', ideaText);
    console.log('Session ID:', selectedSession._id);
    
    setIsSearchingIdea(true);
    setSelectedIdea(ideaText);
    try {
      const matches = await searchWithinSession(selectedSession._id, ideaText);
      console.log('Received matches:', matches);
      console.log('Match details:', matches.map(m => ({
        start: m.startOffset,
        end: m.endOffset,
        text: m.text.substring(0, 50) + '...',
        similarity: m.similarity
      })));
      setHighlights(matches);
    } catch (error) {
      console.error('Error searching for idea matches:', error);
      setSelectedIdea(null);
    } finally {
      setIsSearchingIdea(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  // Determine which sessions to show in sidebar
  const displayedSessions = searchResults.length > 0 ? searchResults : sessions;

  const handleDeleteSession = async (sessionId, event) => {
    event.stopPropagation(); // Prevent session selection
    if (!window.confirm('Are you sure you want to delete this note?')) return;
    
    try {
      await deleteSession(sessionId);
      // Remove from sessions list
      setSessions(sessions.filter(s => s._id !== sessionId));
      // Clear selection if deleted session was selected
      if (selectedSession?._id === sessionId) {
        setSelectedSession(null);
      }
      setMenuOpen(null);
    } catch (error) {
      console.error('Error deleting session:', error);
      setError('Failed to delete note');
    }
  };

  // Add polling function for reprocessing
  const pollReprocessingStatus = async (sessionId) => {
    try {
      const result = await checkSessionStatus(sessionId);
      const { status } = result;
      
      // If still processing, poll again in 2 seconds
      if (status.isProcessing) {
        setTimeout(() => pollReprocessingStatus(sessionId), 2000);
        return;
      }

      // Processing complete, refresh the session data
      const data = await getSessions();
      setSessions(data || []);
      setReprocessingIds(prev => {
        const next = new Set(prev);
        next.delete(sessionId);
        return next;
      });

      // Update selected session if it was the one being reprocessed
      if (selectedSession?._id === sessionId) {
        const updatedSession = data.find(s => s._id === sessionId);
        if (updatedSession) {
          setSelectedSession(updatedSession);
        }
      }
    } catch (error) {
      console.error('Error polling reprocess status:', error);
      // Remove from reprocessing state on error
      setReprocessingIds(prev => {
        const next = new Set(prev);
        next.delete(sessionId);
        return next;
      });
    }
  };

  const handleReprocessSession = async (sessionId, event) => {
    event.stopPropagation(); // Prevent session selection
    try {
      setReprocessingIds(prev => new Set([...prev, sessionId]));
      const result = await reprocessSession(sessionId);
      // Start polling for completion
      pollReprocessingStatus(sessionId);
      setMenuOpen(null);
    } catch (error) {
      console.error('Error reprocessing session:', error);
      setError('Failed to reprocess note');
      setReprocessingIds(prev => {
        const next = new Set(prev);
        next.delete(sessionId);
        return next;
      });
    }
  };

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
                    borderRadius: 'var(--border-radius)',
                    position: 'relative' // Added for menu positioning
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'flex-start'
                  }}>
                    <div>
                      <div className="text-light" style={{ 
                        fontSize: 'var(--font-size-small)', 
                        marginBottom: 'var(--spacing-xs)' 
                      }}>
                        {formatDate(session.createdAt)}
                      </div>
                      <div className="mono" style={{ 
                        fontWeight: 'bold', 
                        marginBottom: 'var(--spacing-xs)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-xs)'
                      }}>
                        {session.title || 'Untitled Note'}
                        {reprocessingIds.has(session._id) && (
                          <div className="loading-spinner" />
                        )}
                      </div>
                    </div>

                    {/* Settings Menu Button */}
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(menuOpen === session._id ? null : session._id);
                      }}
                      style={{
                        padding: 'var(--spacing-xs)',
                        cursor: 'pointer',
                        borderRadius: 'var(--border-radius)',
                        opacity: menuOpen === session._id ? 1 : 0.6,
                        transition: 'opacity var(--transition-base)',
                        backgroundColor: menuOpen === session._id ? 'var(--color-bg)' : 'transparent'
                      }}
                    >
                      ⋮
                    </div>

                    {/* Settings Menu */}
                    {menuOpen === session._id && (
                      <div 
                        style={{
                          position: 'absolute',
                          top: '100%',
                          right: 0,
                          backgroundColor: 'var(--color-bg)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--border-radius)',
                          padding: 'var(--spacing-xs)',
                          zIndex: 1000,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}
                      >
                        <div
                          onClick={(e) => handleDeleteSession(session._id, e)}
                          style={{
                            padding: 'var(--spacing-xs) var(--spacing-sm)',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            color: 'var(--color-accent)',
                            borderRadius: 'var(--border-radius)',
                            transition: 'background-color var(--transition-base)'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--color-border)'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                        >
                          Delete Note
                        </div>
                        <div
                          onClick={(e) => handleReprocessSession(session._id, e)}
                          style={{
                            padding: 'var(--spacing-xs) var(--spacing-sm)',
                            cursor: reprocessingIds.has(session._id) ? 'not-allowed' : 'pointer',
                            whiteSpace: 'nowrap',
                            borderRadius: 'var(--border-radius)',
                            transition: 'background-color var(--transition-base)',
                            opacity: reprocessingIds.has(session._id) ? 0.5 : 1
                          }}
                          onMouseEnter={(e) => !reprocessingIds.has(session._id) && (e.target.style.backgroundColor = 'var(--color-border)')}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                        >
                          {reprocessingIds.has(session._id) ? 'Reprocessing...' : 'Reprocess Note'}
                        </div>
                      </div>
                    )}
                  </div>

                  {session.similarity && (
                    <div style={{ 
                      fontSize: 'var(--font-size-small)', 
                      color: 'var(--color-primary)', 
                      marginTop: 'var(--spacing-xs)' 
                    }}>
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
                alignItems: 'flex-start',
                marginBottom: 'var(--spacing-md)'
              }}>
                <div>
                  <div style={{ 
                    fontSize: 'var(--font-size-large)',
                    fontWeight: 'bold',
                    marginBottom: 'var(--spacing-xs)'
                  }}>
                    {selectedSession.title || 'Untitled Note'}
                  </div>
                  <div className="text-light" style={{ fontSize: 'var(--font-size-small)' }}>
                    by @{selectedSession.userName || 'anonymous'} • {formatDate(selectedSession.createdAt)}
                  </div>
                </div>
                {selectedSession.similarity && (
                  <div style={{ color: 'var(--color-primary)' }}>
                    Similarity Score: {(parseFloat(selectedSession.similarity) * 100).toFixed(1)}%
                  </div>
                )}
              </div>

              {/* Ideas Section */}
              <div style={{ marginTop: 'var(--spacing-md)' }}>
                <div style={{ 
                  color: 'var(--color-text-light)',
                  fontSize: '0.8rem',
                  fontFamily: 'var(--font-mono)',
                  marginBottom: 'var(--spacing-sm)',
                  opacity: 0.8
                }}>
                  Atomic Ideas
                </div>
                
                {/* Atomic Ideas Tags */}
                {selectedSession?.atomicIdeas && (
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 'var(--spacing-xs)',
                    marginBottom: 'var(--spacing-md)'
                  }}>
                    {selectedSession.atomicIdeas
                      .split(':::')
                      .map(idea => idea.trim())
                      .filter(idea => idea.length > 0)
                      .map((idea, index) => (
                        <div
                          key={index}
                          onClick={() => handleIdeaClick(idea)}
                          style={{
                            backgroundColor: selectedIdea === idea ? 
                              'var(--color-primary)' : 
                              'var(--color-bg-alt)',
                            color: selectedIdea === idea ?
                              'var(--color-bg)' :
                              'var(--color-primary)',
                            padding: '2px var(--spacing-sm)',
                            borderRadius: '100px',
                            fontSize: '0.7rem',
                            fontFamily: 'var(--font-mono)',
                            whiteSpace: 'nowrap',
                            opacity: isSearchingIdea ? 0.5 : 0.8,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            border: `1px solid var(--color-primary)`,
                            boxShadow: selectedIdea === idea ?
                              '0 0 4px var(--color-primary)' :
                              'none'
                          }}
                        >
                          {idea}
                        </div>
                      ))}
                  </div>
                )}

                {/* Tensions Section */}
                {selectedSession?.tensions && (
                  <div style={{
                    marginTop: 'var(--spacing-md)',
                    padding: 'var(--spacing-md)',
                    backgroundColor: 'var(--color-bg-alt)',
                    borderRadius: 'var(--border-radius)',
                    border: '1px solid var(--color-border)'
                  }}>
                    <div style={{ 
                      marginBottom: 'var(--spacing-sm)',
                      color: 'var(--color-text-light)',
                      fontSize: '0.8rem',
                      fontFamily: 'var(--font-mono)',
                      opacity: 0.8
                    }}>
                      Tensions & Conflicts
                    </div>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--spacing-xs)'
                    }}>
                      {selectedSession.tensions.split(':::')
                        .map(tension => tension.trim())
                        .filter(tension => tension.length > 0)
                        .map((tension, index) => (
                          <div
                            key={index}
                            style={{
                              padding: 'var(--spacing-xs)',
                              color: 'var(--color-text)',
                              fontSize: '0.8rem',
                              fontFamily: 'var(--font-mono)',
                              opacity: 0.9,
                              borderBottom: index < selectedSession.tensions.split(':::').filter(t => t.trim()).length - 1 ? 
                                '1px solid var(--color-border)' : 
                                'none'
                            }}
                          >
                            {tension}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="card" style={{ 
                margin: 'var(--spacing-md) var(--spacing-xl)',
                padding: 'var(--spacing-md)'
              }}>
                <div style={{ 
                  fontSize: 'var(--font-size-small)',
                  color: 'var(--color-text-light)',
                  marginBottom: 'var(--spacing-xs)'
                }}>
                  Summary:
                </div>
                <div style={{ whiteSpace: 'pre-wrap' }}>
                  {selectedSession.summary || selectedSession.text}
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
