import { useState, useEffect } from 'react';
import api from '../services/api';
import './Home.css';

function Home() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMessage = async () => {
      try {
        const response = await api.get('/');
        setMessage(response.data.message);
      } catch (error) {
        setMessage('Unable to connect to backend');
        console.error('Error fetching message:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessage();
  }, []);

  return (
    <div className="home">
      <h1>Welcome to Team 15a Project</h1>
      <div className="status-card">
        <h2>Backend Status</h2>
        {loading ? (
          <p className="loading">Checking connection...</p>
        ) : (
          <p className={message.includes('Unable') ? 'error' : 'success'}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

export default Home;
