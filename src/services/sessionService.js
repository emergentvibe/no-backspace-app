// frontend/src/services/sessionService.js

const API_URL = 'http://localhost:4000'; // URL of your Express server

export async function createSession(text, isClosed = false, userName = 'Anonymous') {
  try {
    const response = await fetch(`${API_URL}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, isClosed, userName }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create session');
    }
    
    return response.json();
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
}

export async function updateSession(sessionId, text, shouldClose = false, userName = 'Anonymous') {
  try {
    console.log('🔄 Checking session:', sessionId);
    
    // First check if session is already closed
    const checkResponse = await fetch(`${API_URL}/sessions/${sessionId}/status`);
    if (!checkResponse.ok) {
      throw new Error('Failed to check session status');
    }
    const { status } = await checkResponse.json();
    
    // If session is already closed, create a new one instead
    if (status.isClosed) {
      console.log('⚠️ Session already closed, creating new one');
      return createSession(text, shouldClose, userName);
    }
    
    console.log('📝 Updating session:', { sessionId, textLength: text.length, shouldClose });
    const response = await fetch(`${API_URL}/sessions/${sessionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        text, 
        userName,
        isClosed: shouldClose,
        shouldReprocess: true
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update session');
    }
    
    return response.json();
  } catch (error) {
    console.error('Error updating session:', error);
    throw error;
  }
}

export const closeSession = async (sessionId) => {
  try {
    const response = await fetch(`${API_URL}/sessions/${sessionId}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to close session');
    const data = await response.json();
    return data.session;
  } catch (error) {
    console.error('Error closing session:', error);
    throw error;
  }
};

export const getSessions = async () => {
  try {
    const response = await fetch(`${API_URL}/sessions`);
    if (!response.ok) throw new Error('Failed to fetch sessions');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching sessions:', error);
    throw error;
  }
};

export const searchSessions = async (query) => {
  try {
    const url = `${API_URL}/sessions/search?query=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to search sessions');
    const { results } = await response.json();
    return results.map(result => ({
      ...result,
      _id: result.id,
      title: result.title || 'Untitled Note',
      summary: result.summary || result.text
    }));
  } catch (error) {
    console.error('Error searching sessions:', error);
    throw error;
  }
};

export const searchWithinSession = async (sessionId, ideaText) => {
  try {
    const response = await fetch(`${API_URL}/sessions/${sessionId}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ideaText })
    });
    if (!response.ok) throw new Error('Failed to search within session');
    const data = await response.json();
    return data.matches;
  } catch (error) {
    console.error('Error searching within session:', error);
    throw error;
  }
};

export async function checkSessionStatus(sessionId) {
  try {
    const response = await fetch(`${API_URL}/sessions/${sessionId}/status`);
    if (!response.ok) {
      throw new Error('Failed to check session status');
    }
    return response.json();
  } catch (error) {
    console.error('Error checking session status:', error);
    throw error;
  }
}
