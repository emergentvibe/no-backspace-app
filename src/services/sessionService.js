// frontend/src/services/sessionService.js

const API_URL = 'http://localhost:4000'; // URL of your Express server

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

export async function createSession(text, isClosed = false, userName = 'Anonymous') {
  try {
    console.log('\n=== Creating Session API Call ===');
    console.log('Parameters:', { textLength: text.length, isClosed, userName });
    
    const response = await fetch(`${API_URL}/sessions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ text, isClosed, userName }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create session');
    }
    
    const result = await response.json();
    console.log('Create session response:', result);
    return result;
  } catch (error) {
    console.error('Error in createSession:', error);
    throw error;
  }
}

export async function updateSession(sessionId, text, shouldClose = false, userName = 'Anonymous') {
  try {
    console.log('\n=== Updating Session API Call ===');
    console.log('Parameters:', { sessionId, textLength: text.length, shouldClose, userName });
    
    // First check if session is already closed
    const checkResponse = await fetch(`${API_URL}/sessions/${sessionId}`, {
      headers: getAuthHeaders()
    });
    if (!checkResponse.ok) {
      throw new Error('Failed to check session');
    }
    const { session: existingSession } = await checkResponse.json();
    
    // If session is already closed, create a new one instead
    if (existingSession.isClosed) {
      console.log('⚠️ Session already closed, creating new one');
      return createSession(text, shouldClose, userName);
    }
    
    console.log('📝 Updating session:', { sessionId, textLength: text.length, shouldClose });
    const response = await fetch(`${API_URL}/sessions/${sessionId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ 
        text, 
        userName,
        isClosed: shouldClose
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update session');
    }
    
    const result = await response.json();
    console.log('Update session response:', result);
    return result;
  } catch (error) {
    console.error('Error in updateSession:', error);
    throw error;
  }
}

export const closeSession = async (sessionId) => {
  try {
    console.log('\n=== Closing Session API Call ===');
    console.log('Session ID:', sessionId);
    
    const response = await fetch(`${API_URL}/sessions/${sessionId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ isClosed: true }),
    });
    if (!response.ok) throw new Error('Failed to close session');
    
    const result = await response.json();
    console.log('Close session response:', result);
    return result.session;
  } catch (error) {
    console.error('Error in closeSession:', error);
    throw error;
  }
};

export const getSessions = async () => {
  try {
    const response = await fetch(`${API_URL}/sessions`, {
      headers: getAuthHeaders()
    });
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
    const response = await fetch(url, {
      headers: getAuthHeaders()
    });
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
      headers: getAuthHeaders(),
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
    console.log('\n=== Checking Session Status API Call ===');
    console.log('Session ID:', sessionId);
    
    const response = await fetch(`${API_URL}/sessions/${sessionId}/status`, {
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      throw new Error('Failed to check session status');
    }
    
    const result = await response.json();
    console.log('Status check response:', result);
    return result;
  } catch (error) {
    console.error('Error in checkSessionStatus:', error);
    throw error;
  }
}

export const sensemakeSessions = async (sessionIds) => {
  try {
    const response = await fetch(`${API_URL}/sensemake`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ sessionIds })
    });

    if (!response.ok) {
      throw new Error('Failed to start sensemaking process');
    }

    return response.json();
  } catch (error) {
    console.error('Error in sensemaking:', error);
    throw error;
  }
};

export const deleteSession = async (sessionId) => {
    try {
        console.log('\n=== Deleting Session API Call ===');
        console.log('Session ID:', sessionId);
        
        const response = await fetch(`${API_URL}/sessions/${sessionId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to delete session');
        
        const result = await response.json();
        console.log('Delete session response:', result);
        return result;
    } catch (error) {
        console.error('Error in deleteSession:', error);
        throw error;
    }
};

export const reprocessSession = async (sessionId) => {
    try {
        console.log('\n=== Reprocessing Session API Call ===');
        console.log('Session ID:', sessionId);
        
        const response = await fetch(`${API_URL}/sessions/${sessionId}/reprocess`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        if (!response.ok) throw new Error('Failed to reprocess session');
        
        const result = await response.json();
        console.log('Reprocess session response:', result);
        return result;
    } catch (error) {
        console.error('Error in reprocessSession:', error);
        throw error;
    }
};

export async function processSession(sessionId) {
    try {
        console.log('\n=== Processing Session API Call ===');
        console.log('Parameters:', { sessionId });
        
        const response = await fetch(`${API_URL}/sessions/${sessionId}/process`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            throw new Error('Failed to process session');
        }
        
        const result = await response.json();
        console.log('Process session response:', result);
        return result;
    } catch (error) {
        console.error('Error in processSession:', error);
        throw error;
    }
}
