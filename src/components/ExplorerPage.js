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
  const [expandedSections, setExpandedSections] = useState({
    ideas: false,
    questions: false,
    tensions: false,
    summary: false
  });
  const location = useLocation();

  const styles = {
    questionItem: {
        display: 'flex',
        alignItems: 'flex-start',
        marginBottom: '8px',
        padding: '8px',
        background: '#f8f9fa',
        borderRadius: '4px'
    },
    scoreBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '24px',
        height: '24px',
        marginRight: '8px',
        background: '#007bff',
        color: 'white',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 'bold'
    }
  };

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
      setSessions(data.sessions || []); // Access the sessions array from the response
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
  const displayedSessions = searchResults.length > 0 ? searchResults : (sessions || []);

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
    console.log('Polling status for session:', sessionId);
    try {
        const response = await fetch(`http://localhost:4000/sessions/${sessionId}/status`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) throw new Error('Failed to check status');
        
        const { status } = await response.json();
        console.log('Poll status result:', status);

        if (status.isProcessing) {
            // Continue polling if still processing
            setTimeout(() => pollReprocessingStatus(sessionId), 2000);
        } else {
            // Refresh the session data when processing is complete
            const updatedSession = await fetchSession(sessionId);
            if (updatedSession) {
                setSelectedSession(updatedSession);
                console.log('Updated session after processing:', updatedSession);
            }
        }
    } catch (error) {
        console.error('Error polling status:', error);
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

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className="explorer-container" style={{ 
      display: 'grid',
      gridTemplateColumns: '350px 1fr',
      gap: 'var(--spacing-lg)',
      padding: 'var(--spacing-lg)',
      height: 'calc(100vh - var(--navbar-height))',
      overflow: 'hidden'
    }}>
      {/* Left Sidebar */}
      <div className="sidebar" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-md)',
        height: '100%',
        overflow: 'hidden'
      }}>
        {/* Search Form */}
        <form onSubmit={handleSearch} className="search-form" style={{
          padding: 'var(--spacing-md)',
          backgroundColor: 'var(--color-bg-alt)',
          borderRadius: 'var(--border-radius)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes..."
            className="input"
          />
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </form>

        {/* Sessions List */}
        <div className="sessions-list scrollable" style={{
          flex: 1,
          overflow: 'auto',
          backgroundColor: 'var(--color-bg-alt)',
          borderRadius: 'var(--border-radius)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
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
                  className={`session-item ${selectedSession?._id === session._id ? 'selected' : ''}`}
                  style={{
                    padding: 'var(--spacing-md)',
                    borderBottom: '1px solid var(--color-border)',
                    cursor: 'pointer',
                    backgroundColor: selectedSession?._id === session._id ? 
                      'var(--color-primary-light)' : 'transparent',
                    color: selectedSession?._id === session._id ? 
                      'white' : 'var(--color-text)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                    <h3 style={{ 
                      margin: 0,
                      fontSize: 'var(--font-size-base)',
                      fontWeight: 'bold'
                    }}>
                      {session.title || 'Untitled Note'}
                    </h3>
                    <div style={{ 
                      fontSize: 'var(--font-size-small)',
                      color: selectedSession?._id === session._id ? 
                        'rgba(255,255,255,0.8)' : 'var(--color-text-light)'
                    }}>
                      by @{session.userName || 'anonymous'} • {formatDate(session.createdAt)}
                    </div>
                  </div>
                  {searchResults.length > 0 && (
                    <div style={{ 
                      fontSize: 'var(--font-size-small)',
                      color: 'var(--color-accent)',
                      marginTop: 'var(--spacing-xs)'
                    }}>
                      Similarity: {(parseFloat(session.similarity) * 100).toFixed(1)}%
                    </div>
                  )}
                  <div style={{ 
                    display: 'flex',
                    gap: 'var(--spacing-sm)',
                    marginTop: 'var(--spacing-sm)'
                  }}>
                    <button
                      onClick={(e) => handleReprocessSession(session._id, e)}
                      className="btn btn-secondary"
                      disabled={reprocessingIds.has(session._id)}
                      style={{ fontSize: 'var(--font-size-small)' }}
                    >
                      Reprocess
                    </button>
                    <button
                      onClick={(e) => handleDeleteSession(session._id, e)}
                      className="btn btn-danger"
                      style={{ fontSize: 'var(--font-size-small)' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content scrollable" style={{
        height: '100%',
        overflow: 'auto',
        padding: 'var(--spacing-lg)',
        backgroundColor: 'var(--color-bg-alt)',
        borderRadius: 'var(--border-radius)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        {selectedSession ? (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ 
              marginBottom: 'var(--spacing-xl)',
              padding: 'var(--spacing-lg)',
              backgroundColor: 'var(--color-bg)',
              borderRadius: 'var(--border-radius)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}>
              <h1 style={{ 
                margin: 0,
                marginBottom: 'var(--spacing-sm)',
                color: 'var(--color-primary)'
              }}>
                {selectedSession.title || 'Untitled Note'}
              </h1>
              <div style={{ 
                color: 'var(--color-text-light)',
                fontSize: 'var(--font-size-small)'
              }}>
                by @{selectedSession.userName || 'anonymous'} • {formatDate(selectedSession.createdAt)}
              </div>
            </div>

            {/* Summary Section */}
            <section style={{ marginBottom: 'var(--spacing-xl)' }}>
              <h2 style={{ 
                color: 'var(--color-primary)',
                marginBottom: 'var(--spacing-md)'
              }}>Summary</h2>
              <div className="card" style={{ 
                backgroundColor: 'var(--color-bg)',
                padding: 'var(--spacing-lg)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  maxHeight: expandedSections.summary ? 'none' : '100px',
                  overflow: 'hidden',
                  transition: 'max-height 0.3s ease-out',
                  position: 'relative'
                }}>
                  {selectedSession.summary || 'No summary available'}
                  {!expandedSections.summary && (
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '50px',
                      background: 'linear-gradient(transparent, var(--color-bg))',
                      pointerEvents: 'none'
                    }}/>
                  )}
                </div>
                {selectedSession.summary && selectedSession.summary.length > 200 && (
                  <button
                    onClick={() => toggleSection('summary')}
                    className="btn btn-secondary"
                    style={{
                      marginTop: 'var(--spacing-md)',
                      width: '100%',
                      padding: 'var(--spacing-sm)',
                      fontSize: 'var(--font-size-small)'
                    }}
                  >
                    {expandedSections.summary ? 'Show Less' : 'Show More'}
                  </button>
                )}
              </div>
            </section>

            {/* Questions Section */}
            {selectedSession?.questions && (
                <div className="section">
                    <h3 onClick={() => toggleSection('questions')} style={{ cursor: 'pointer' }}>
                        Questions {expandedSections.questions ? '▼' : '▶'}
                    </h3>
                    {expandedSections.questions && (
                        <div>
                            {selectedSession.questions
                                .sort((a, b) => b.score - a.score)
                                .map((question, index) => (
                                    <div key={index} style={{ 
                                        marginBottom: '10px',
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '10px'
                                    }}>
                                        <span style={{
                                            backgroundColor: `rgba(52, 152, 219, ${question.score / 5})`,
                                            color: 'white',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            fontSize: '0.8em',
                                            minWidth: '24px',
                                            textAlign: 'center'
                                        }}>
                                            {question.score}
                                        </span>
                                        <span style={{ flex: 1 }}>{question.text}</span>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
            )}

            {/* Ideas Grid */}
            <section style={{ marginBottom: 'var(--spacing-xl)' }}>
              <h2 style={{ 
                color: 'var(--color-primary)',
                marginBottom: 'var(--spacing-md)'
              }}>Atomic Ideas</h2>
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: 'var(--spacing-md)'
              }}>
                {(selectedSession.atomicIdeas || [])
                    .sort((a, b) => b.score - a.score)
                    .slice(0, expandedSections.ideas ? undefined : 6)
                    .map((idea, index) => (
                        <div
                            key={index}
                            onClick={() => handleIdeaClick(idea.text)}
                            style={{
                                padding: 'var(--spacing-md)',
                                backgroundColor: selectedIdea === idea.text ? 
                                    'var(--color-primary-light)' : 'var(--color-bg)',
                                color: selectedIdea === idea.text ? 'white' : 'inherit',
                                borderRadius: 'var(--border-radius)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                minHeight: '100px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 'var(--spacing-sm)'
                            }}
                        >
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>{idea.text}</div>
                            <div style={{
                                padding: '2px 8px',
                                borderRadius: 'var(--border-radius)',
                                backgroundColor: selectedIdea === idea.text ? 
                                    'rgba(255,255,255,0.2)' : 'var(--color-primary-light)',
                                color: selectedIdea === idea.text ? 'white' : 'white',
                                fontSize: 'var(--font-size-small)',
                                alignSelf: 'flex-start'
                            }}>
                                Score: {idea.score}
                            </div>
                        </div>
                    ))}
              </div>
              {(selectedSession.atomicIdeas || []).length > 6 && (
                  <button
                      onClick={() => toggleSection('ideas')}
                      className="btn btn-secondary"
                      style={{
                          marginTop: 'var(--spacing-md)',
                          width: '100%',
                          padding: 'var(--spacing-sm)',
                          fontSize: 'var(--font-size-small)'
                      }}
                  >
                      {expandedSections.ideas ? 'Show Less' : `Show ${selectedSession.atomicIdeas.length - 6} More Ideas`}
                  </button>
              )}
            </section>

            {/* Tensions Section */}
            <section style={{ marginBottom: 'var(--spacing-xl)' }}>
              <h2 style={{ 
                color: 'var(--color-primary)',
                marginBottom: 'var(--spacing-md)'
              }}>Tensions</h2>
              <div style={{ 
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-md)'
              }}>
                {(selectedSession.tensions || [])
                    .sort((a, b) => b.score - a.score)
                    .slice(0, expandedSections.tensions ? undefined : 3)
                    .map((tension, index) => (
                        <div
                            key={index}
                            className="card"
                            style={{
                                padding: 'var(--spacing-md)',
                                backgroundColor: 'var(--color-bg)',
                                borderLeft: '4px solid var(--color-accent)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                gap: 'var(--spacing-md)'
                            }}
                        >
                            <div style={{ flex: 1 }}>{tension.text}</div>
                            <div style={{
                                padding: '2px 8px',
                                borderRadius: 'var(--border-radius)',
                                backgroundColor: 'var(--color-accent)',
                                color: 'white',
                                fontSize: 'var(--font-size-small)',
                                whiteSpace: 'nowrap'
                            }}>
                                Score: {tension.score}
                            </div>
                        </div>
                    ))}
              </div>
              {(selectedSession.tensions || []).length > 3 && (
                  <button
                      onClick={() => toggleSection('tensions')}
                      className="btn btn-secondary"
                      style={{
                          marginTop: 'var(--spacing-md)',
                          width: '100%',
                          padding: 'var(--spacing-sm)',
                          fontSize: 'var(--font-size-small)'
                      }}
                  >
                      {expandedSections.tensions ? 'Show Less' : `Show ${selectedSession.tensions.length - 3} More Tensions`}
                  </button>
              )}
            </section>

            {/* Original Text with Highlights */}
            {selectedIdea && (
              <section style={{ marginBottom: 'var(--spacing-xl)' }}>
                <h2 style={{ 
                  color: 'var(--color-primary)',
                  marginBottom: 'var(--spacing-md)'
                }}>Matches for Selected Idea</h2>
                <div className="card" style={{ 
                  backgroundColor: 'var(--color-bg)',
                  padding: 'var(--spacing-lg)'
                }}>
                  <HighlightedText
                    text={selectedSession.text}
                    highlights={highlights}
                  />
                </div>
              </section>
            )}
          </div>
        ) : (
          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--color-text-light)'
          }}>
            <h2>Select a note to view details</h2>
            <p>Or use the search bar to find specific content</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExplorerPage;
