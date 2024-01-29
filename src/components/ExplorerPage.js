// frontend/src/components/ExplorerPage.js

import React, { useState, useEffect } from 'react';
import { getSessions } from '../services/sessionService';

const ExplorerPage = () => {
  const [sessions, setSessions] = useState([]);

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

  return (
    <div>
      <h2>Explorer Page</h2>
      <ul>
        {sessions.map((session) => (
          <li key={session._id}>{session.createdAt} - {session.text}</li>
        ))}
      </ul>
    </div>
  );
};

export default ExplorerPage;
