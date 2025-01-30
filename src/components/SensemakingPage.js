import React, { useState, useEffect } from 'react';
import { getSessions, sensemakeSessions } from '../services/sessionService';
import '../globalStyles.css';

const SensemakingPage = () => {
    const [sessions, setSessions] = useState([]);
    const [filteredSessions, setFilteredSessions] = useState([]);
    const [selectedSessions, setSelectedSessions] = useState(new Set());
    const [authors, setAuthors] = useState(['']);
    const [questions, setQuestions] = useState(null);
    const [dateRange, setDateRange] = useState({
        start: '',
        end: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Fetch all sessions on mount
    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getSessions();
            setSessions(data || []);
            setFilteredSessions(data || []);
        } catch (error) {
            console.error('Error fetching sessions:', error);
            setError('Failed to load sessions');
        } finally {
            setLoading(false);
        }
    };

    // Add new author input field
    const addAuthor = () => {
        setAuthors([...authors, '']);
    };

    // Remove author input field
    const removeAuthor = (index) => {
        const newAuthors = authors.filter((_, i) => i !== index);
        setAuthors(newAuthors.length ? newAuthors : ['']);
    };

    // Update author value
    const updateAuthor = (index, value) => {
        const newAuthors = [...authors];
        newAuthors[index] = value;
        setAuthors(newAuthors);
    };

    // Toggle session selection
    const toggleSession = (sessionId) => {
        const newSelected = new Set(selectedSessions);
        if (newSelected.has(sessionId)) {
            newSelected.delete(sessionId);
        } else {
            newSelected.add(sessionId);
        }
        setSelectedSessions(newSelected);
    };

    // Handle sensemake button click
    const handleSensemake = async () => {
        try {
            setLoading(true);
            setQuestions(null);
            const selectedDocs = filteredSessions.filter(session => selectedSessions.has(session._id));
            const sessionIds = selectedDocs.map(session => session._id);
            
            const result = await sensemakeSessions(sessionIds);
            console.log('Sensemaking completed:', result);
            
            // Display the questions
            setQuestions(result.questions);
            
            // Clear selections after successful processing
            setSelectedSessions(new Set());
        } catch (error) {
            console.error('Error during sensemaking:', error);
            setError('Failed to process selected documents');
        } finally {
            setLoading(false);
        }
    };

    // Apply filters
    const applyFilters = () => {
        let filtered = [...sessions];

        // Filter by authors (if any author is specified)
        const activeAuthors = authors.filter(author => author.trim());
        if (activeAuthors.length > 0) {
            filtered = filtered.filter(session => 
                activeAuthors.some(author => 
                    session.userName?.toLowerCase() === author.toLowerCase()
                )
            );
        }

        // Filter by date range
        if (dateRange.start) {
            filtered = filtered.filter(session => 
                new Date(session.createdAt) >= new Date(dateRange.start)
            );
        }
        if (dateRange.end) {
            filtered = filtered.filter(session => 
                new Date(session.createdAt) <= new Date(dateRange.end)
            );
        }

        setFilteredSessions(filtered);
    };

    // Format date for display
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString();
    };

    return (
        <div className="page-container" style={{ padding: 'var(--spacing-xl)' }}>
            {/* Filters Section */}
            <div className="card" style={{ marginBottom: 'var(--spacing-xl)' }}>
                <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <h2 style={{ marginBottom: 'var(--spacing-md)' }}>Authors</h2>
                    {authors.map((author, index) => (
                        <div key={index} style={{ 
                            display: 'flex',
                            gap: 'var(--spacing-sm)',
                            marginBottom: 'var(--spacing-sm)'
                        }}>
                            <input
                                type="text"
                                value={author}
                                onChange={(e) => updateAuthor(index, e.target.value)}
                                placeholder="Enter author name"
                                className="input"
                                style={{ flex: 1 }}
                            />
                            <button
                                onClick={() => removeAuthor(index)}
                                className="btn btn-secondary"
                                disabled={authors.length === 1}
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                    <button onClick={addAuthor} className="btn btn-secondary">
                        Add Author
                    </button>
                </div>

                <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <h2 style={{ marginBottom: 'var(--spacing-md)' }}>Date Range</h2>
                    <div style={{ 
                        display: 'flex',
                        gap: 'var(--spacing-md)',
                        marginBottom: 'var(--spacing-sm)'
                    }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)' }}>
                                Start Date
                            </label>
                            <input
                                type="date"
                                value={dateRange.start}
                                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                className="input"
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: 'var(--spacing-xs)' }}>
                                End Date
                            </label>
                            <input
                                type="date"
                                value={dateRange.end}
                                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                className="input"
                            />
                        </div>
                    </div>
                </div>

                <button 
                    onClick={applyFilters}
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                >
                    Apply Filters
                </button>
            </div>

            {/* Results Section */}
            <div className="card" style={{ marginBottom: 'var(--spacing-xl)' }}>
                <h2 style={{ marginBottom: 'var(--spacing-md)' }}>
                    Results ({filteredSessions.length} notes)
                </h2>
                
                {loading && <div>Loading...</div>}
                {error && <div className="error-message">{error}</div>}
                
                {!loading && !error && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                        {filteredSessions.map(session => (
                            <div
                                key={session._id}
                                className="card"
                                style={{
                                    padding: 'var(--spacing-md)',
                                    backgroundColor: selectedSessions.has(session._id) ? 
                                        'var(--color-primary-light)' : 
                                        'var(--color-bg-alt)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    transition: 'background-color 0.2s ease'
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: 'bold', marginBottom: 'var(--spacing-xs)' }}>
                                        {session.title || 'Untitled Note'}
                                    </div>
                                    <div style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-light)' }}>
                                        by @{session.userName || 'anonymous'} • {formatDate(session.createdAt)}
                                    </div>
                                </div>
                                <button 
                                    className="btn btn-circle"
                                    onClick={() => toggleSession(session._id)}
                                    style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.5rem',
                                        padding: 0,
                                        backgroundColor: selectedSessions.has(session._id) ? 
                                            'var(--color-primary)' : 
                                            'var(--color-bg)',
                                        color: selectedSessions.has(session._id) ? 
                                            'white' : 
                                            'var(--color-primary)',
                                        border: `1px solid var(--color-primary)`
                                    }}
                                >
                                    {selectedSessions.has(session._id) ? '−' : '+'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Questions Section */}
            {questions && (
                <div className="card" style={{ marginBottom: 'var(--spacing-xl)' }}>
                    <h2 style={{ marginBottom: 'var(--spacing-md)' }}>
                        Questions for the Collective
                    </h2>
                    <div style={{ 
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'var(--font-family-mono)',
                        lineHeight: '1.6'
                    }}>
                        {questions}
                    </div>
                </div>
            )}

            {/* Sensemake Button Section */}
            <div 
                style={{ 
                    position: 'sticky',
                    bottom: 'var(--spacing-xl)',
                    backgroundColor: 'var(--color-bg)',
                    padding: 'var(--spacing-md)',
                    borderRadius: 'var(--border-radius)',
                    boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.1)',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--spacing-md)',
                    alignItems: 'center'
                }}
            >
                <div style={{ 
                    fontSize: 'var(--font-size-large)',
                    color: 'var(--color-text-light)'
                }}>
                    {selectedSessions.size} documents selected for sensemaking
                </div>
                <button 
                    className="btn btn-primary"
                    onClick={handleSensemake}
                    disabled={selectedSessions.size === 0}
                    style={{
                        width: '200px',
                        height: '48px',
                        fontSize: 'var(--font-size-large)'
                    }}
                >
                    Sensemake
                </button>
            </div>
        </div>
    );
};

export default SensemakingPage; 