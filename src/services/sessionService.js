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
    return await response.json();
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
    return await response.json();
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
    
    const data = await response.json();
    console.log('Search results:', data);
    return data;
  } catch (error) {
    console.error('Error searching sessions:', error);
    throw error;
  }
};
