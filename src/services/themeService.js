import { API_BASE_URL } from '../config';

export async function processThemes(sessionId) {
    try {
        const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/themes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to process themes: ${response.statusText}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Error processing themes:', error);
        throw error;
    }
} 