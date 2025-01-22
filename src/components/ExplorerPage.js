// frontend/src/components/ExplorerPage.js

import React, { useState, useEffect } from 'react';
import { getSessions, searchSessions } from '../services/sessionService';
import '../globalStyles.css';

const ExplorerPage = () => {
  const [sessions, setSessions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const sessionsData = await getSessions();
      setSessions(sessionsData.sessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      fetchSessions();
      return;
    }
    
    setIsSearching(true);
    try {
      const results = await searchSessions(searchQuery);
      setSessions(results.results);
      // Clear selected session when search results change
      setSelectedSession(null);
    } catch (error) {
      console.error('Error searching sessions:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const truncateText = (text, maxLength = 100) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

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
          <form onSubmit={handleSearch}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your notes..."
              className="input"
            />
            <button 
              type="submit"
              disabled={isSearching}
              className={`btn btn-primary ${isSearching ? 'disabled' : ''}`}
              style={{ marginTop: 'var(--spacing-sm)', width: '100%' }}
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </form>
        </div>

        {/* Search Results */}
        <div className="scrollable" style={{ 
          flex: 1,
          padding: 'var(--spacing-md)'
        }}>
          {sessions.map((session) => (
            <div 
              key={session._id || Math.random()}
              onClick={() => setSelectedSession(session)}
              className="card"
              style={{
                marginBottom: 'var(--spacing-sm)',
                cursor: 'pointer',
                backgroundColor: selectedSession === session ? 'var(--color-border)' : 'var(--color-bg-alt)',
                transition: 'all var(--transition-base)'
              }}
            >
              <div className="text-light" style={{ fontSize: 'var(--font-size-small)', marginBottom: 'var(--spacing-xs)' }}>
                {formatDate(session.createdAt)}
              </div>
              <div className="mono">{truncateText(session.text)}</div>
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
                {selectedSession.text}
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
