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
                {selectedSession.summary || 'No summary available'}
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
