// frontend/src/services/sessionService.js

const API_URL = 'http://localhost:4000'; // URL of your Express server

export const createSession = async (text) => {
  try {
    const response = await fetch(`${API_URL}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) {
      throw new Error('Failed to create session');
    }
    const data = await response.json();
    return data.session; // Return just the session object
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
};

export const getSessions = async () => {
  try {
    const response = await fetch(`${API_URL}/sessions`);
    if (!response.ok) {
      throw new Error('Failed to fetch sessions');
    }
    const data = await response.json();
    console.log('Received sessions:', data.map(session => ({
      id: session._id,
      titleLength: session.title?.length,
      summaryLength: session.summary?.length,
      summary: session.summary
    })));
    return data; // Return the array of sessions
  } catch (error) {
    console.error('Error fetching sessions:', error);
    throw error;
  }
};

export const searchSessions = async (query) => {
  try {
    console.log('Making search request for query:', query);
    const url = `${API_URL}/sessions/search?query=${encodeURIComponent(query)}`;
    console.log('Request URL:', url);
    
    const response = await fetch(url);
    console.log('Search response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Search error response:', errorText);
      throw new Error('Failed to search sessions');
    }
    
    const { results } = await response.json();
    console.log('Search results:', results.map(result => ({
      id: result.id,
      titleLength: result.title?.length,
      summaryLength: result.summary?.length,
      summary: result.summary
    })));
    
    // Return the results array, ensuring each result has title and summary
    return results.map(result => ({
      ...result,
      _id: result.id, // Ensure _id is set for consistency with regular sessions
      title: result.title || 'Untitled Note',
      summary: result.summary || result.text
    }));
  } catch (error) {
    console.error('Error searching sessions:', error);
    throw error;
  }
};
