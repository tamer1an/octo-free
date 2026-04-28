import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

const Options: React.FC = () => {
  const [token, setToken] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    chrome.storage.sync.get(['githubToken'], (result) => {
      if (result.githubToken) {
        setToken(result.githubToken);
      }
    });
  }, []);

  const saveToken = () => {
    chrome.storage.sync.set({ githubToken: token }, () => {
      setStatus('Token saved successfully!');
      setTimeout(() => setStatus(''), 3000);
    });
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Inter, sans-serif' }}>
      <h2>Octo-Free Options</h2>
      <p>Enter your GitHub Personal Access Token to avoid rate limits and access private repositories.</p>
      <div>
        <input 
          type="password" 
          value={token} 
          onChange={(e) => setToken(e.target.value)} 
          placeholder="ghp_xxxxxxxxxxxx"
          style={{ padding: '8px', width: '300px', marginRight: '10px' }}
        />
        <button onClick={saveToken} style={{ padding: '8px 16px', cursor: 'pointer' }}>Save Token</button>
      </div>
      {status && <p style={{ color: 'green', marginTop: '10px' }}>{status}</p>}
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Options />);
}
