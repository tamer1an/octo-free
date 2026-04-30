import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { validateToken } from '../adapters/github';

type ValidationState = 'idle' | 'validating' | 'valid' | 'invalid';

const Options: React.FC = () => {
  const [token, setToken] = useState('');
  const [savedToken, setSavedToken] = useState('');
  const [status, setStatus] = useState('');
  const [validation, setValidation] = useState<ValidationState>('idle');
  const [_userLogin, setUserLogin] = useState('');
  const [missingScopes, setMissingScopes] = useState(false);

  useEffect(() => {
    chrome.storage.sync.get(['githubToken'], (result) => {
      if (result.githubToken) {
        setToken(result.githubToken);
        setSavedToken(result.githubToken);
      }
    });
  }, []);

  const saveToken = async () => {
    const trimmed = token.trim();
    if (!trimmed) {
      chrome.storage.sync.remove('githubToken', () => {
        setSavedToken('');
        setValidation('idle');
        setStatus('Token cleared.');
        setTimeout(() => setStatus(''), 3000);
      });
      return;
    }

    setValidation('validating');
    setStatus('');
    try {
      const result = await validateToken(trimmed);
      if (!result.valid) {
        setValidation('invalid');
        setStatus('Token is invalid or expired. Please check and try again.');
        return;
      }
      const hasRepo = result.scopes?.split(',').map(s => s.trim()).includes('repo') ?? false;
      setUserLogin(result.login ?? '');
      setMissingScopes(!hasRepo);
      setValidation('valid');
      chrome.storage.sync.set({ githubToken: trimmed }, () => {
        setSavedToken(trimmed);
        setStatus(hasRepo
          ? `Token saved! Signed in as @${result.login}`
          : `Token saved as @${result.login}, but missing "repo" scope — private repos won't be accessible.`
        );
        setTimeout(() => setStatus(''), 6000);
      });
    } catch {
      setValidation('invalid');
      setStatus('Could not validate token. Check your network connection.');
    }
  };

  const clearToken = () => {
    setToken('');
    setSavedToken('');
    setValidation('idle');
    setUserLogin('');
    setMissingScopes(false);
    chrome.storage.sync.remove('githubToken');
    setStatus('Token removed.');
    setTimeout(() => setStatus(''), 3000);
  };

  const inputBorder = validation === 'valid' ? '2px solid #2da44e'
    : validation === 'invalid' ? '2px solid #cf222e'
    : '2px solid #d0d7de';

  return (
    <div style={{ padding: '32px', fontFamily: 'Inter, -apple-system, sans-serif', maxWidth: '540px', color: '#1f2328' }}>
      <h2 style={{ marginTop: 0 }}>🐙 Octo-Free — GitHub Token</h2>
      <p style={{ color: '#57606a', lineHeight: 1.6 }}>
        A <strong>Personal Access Token</strong> is required to browse private repositories and
        avoids GitHub API rate limits for public ones.
      </p>
      <p style={{ color: '#57606a', lineHeight: 1.6 }}>
        Create one at{' '}
        <a href="https://github.com/settings/tokens/new?scopes=repo&description=Octo-Free" target="_blank" rel="noreferrer">
          github.com/settings/tokens
        </a>{' '}
        with the <strong>repo</strong> scope selected.
      </p>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '16px' }}>
        <input
          type="password"
          value={token}
          onChange={(e) => { setToken(e.target.value); setValidation('idle'); }}
          onKeyDown={(e) => e.key === 'Enter' && saveToken()}
          placeholder="ghp_xxxxxxxxxxxx"
          style={{
            padding: '8px 12px',
            width: '320px',
            border: inputBorder,
            borderRadius: '6px',
            fontSize: '14px',
            outline: 'none',
            fontFamily: 'monospace'
          }}
        />
        <button
          onClick={saveToken}
          disabled={validation === 'validating'}
          style={{
            padding: '8px 16px',
            backgroundColor: '#2da44e',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: validation === 'validating' ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            opacity: validation === 'validating' ? 0.7 : 1
          }}
        >
          {validation === 'validating' ? 'Validating…' : 'Save'}
        </button>
        {savedToken && (
          <button
            onClick={clearToken}
            style={{
              padding: '8px 12px',
              backgroundColor: 'transparent',
              color: '#cf222e',
              border: '1px solid #cf222e',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Clear
          </button>
        )}
      </div>

      {status && (
        <p style={{
          marginTop: '12px',
          color: validation === 'invalid' ? '#cf222e' : missingScopes ? '#9a6700' : '#2da44e',
          fontWeight: 500
        }}>
          {status}
        </p>
      )}

      {validation === 'valid' && missingScopes && (
        <p style={{ marginTop: '8px', color: '#9a6700', fontSize: '13px' }}>
          To access private repos, re-generate the token with the <strong>repo</strong> scope at{' '}
          <a href="https://github.com/settings/tokens/new?scopes=repo&description=Octo-Free" target="_blank" rel="noreferrer">
            github.com/settings/tokens
          </a>.
        </p>
      )}
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Options />);
}
