import React, { useState, useEffect } from 'react';
import TreeItem from './TreeItem';
import { fetchRepoTree, fetchBranches, fetchFileContent } from '../adapters/github';
import { TreeNode } from '../adapters/types';

// Injecting Google Font for the Cartoon Studio vibe
const fontLink = document.createElement('link');
fontLink.href = 'https://fonts.googleapis.com/css2?family=Nunito:wght@700;900&display=swap';
fontLink.rel = 'stylesheet';
document.head.appendChild(fontLink);

interface SidebarProps {
  owner: string;
  repo: string;
}

const Sidebar: React.FC<SidebarProps> = ({ owner, repo }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [branch, setBranch] = useState('main');
  const [branches, setBranches] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPrivateHint, setIsPrivateHint] = useState(false);

  useEffect(() => {
    chrome.storage.sync.get(['githubToken'], async (result) => {
      try {
        const branchData = await fetchBranches(owner, repo, result.githubToken);
        const branchNames = branchData.map(b => b.name);
        setBranches(branchNames);
        if (branchNames.includes('master')) setBranch('master');
        else if (branchNames.includes('main')) setBranch('main');
        else if (branchNames.length > 0) setBranch(branchNames[0]);
      } catch (e) {
        console.error('Failed to load branches', e);
      }
    });
  }, [owner, repo]);

  useEffect(() => {
    if (!branch) return;
    setLoading(true);
    chrome.storage.sync.get(['githubToken'], async (result) => {
      try {
        const data = await fetchRepoTree(owner, repo, branch, result.githubToken);
        setTree(data);
        setError('');
        setIsPrivateHint(false);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch repo tree');
        setIsPrivateHint(!!(err as any).isPrivateRepoHint || !!(err as any).isAuthError);
      } finally {
        setLoading(false);
      }
    });
  }, [owner, repo, branch]);

  const handleNodeClick = (node: TreeNode) => {
    if (node.type === 'blob') {
      // Navigate to the file without a hard reload by simulating a click that GitHub's Turbo router intercepts
      const url = `/${owner}/${repo}/blob/${branch}/${node.path}`;
      const link = document.createElement('a');
      link.href = url;
      document.body.appendChild(link);
      link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      document.body.removeChild(link);
    }
  };

  const handleDownloadFile = async (e: React.MouseEvent, node: TreeNode) => {
    e.stopPropagation();
    if (node.type !== 'blob') return;
    chrome.storage.sync.get(['githubToken'], async (result) => {
      try {
        const blob = await fetchFileContent(owner, repo, node.path, branch, result.githubToken);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = node.name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (err) {
        console.error('Failed to download file', err);
      }
    });
  };

  const renderTree = (nodes: TreeNode[]) => {
    return nodes.map(node => (
      <TreeItem 
        key={node.path} 
        label={node.name} 
        isFolder={node.type === 'tree'}
        onClick={() => handleNodeClick(node)}
        onIconClick={(e) => handleDownloadFile(e, node)}
      >
        {node.children && node.children.length > 0 ? renderTree(node.children) : null}
      </TreeItem>
    ));
  };

  const theme = {
    bg: '#1a1a2e',
    fg: '#e94560',
    text: '#ffffff',
    border: '4px solid #0f3460',
    shadow: '6px 6px 0px #0f3460',
    font: "'Nunito', sans-serif"
  };

  if (!isOpen) {
    return (
      <button 
        style={{ 
          pointerEvents: 'auto',
          position: 'fixed',
          bottom: '30px',
          left: '30px',
          width: '60px',
          height: '60px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          cursor: 'pointer',
          backgroundColor: theme.fg,
          color: theme.text,
          border: theme.border,
          borderRadius: '50%',
          fontFamily: theme.font,
          fontSize: '28px',
          boxShadow: '0px 10px 20px rgba(0,0,0,0.5), ' + theme.shadow,
          transition: 'all 0.2s ease',
          zIndex: 2147483647 // Max z-index to ensure it is never hidden
        }}
        onClick={() => setIsOpen(true)}
        title="Open Octo-Free"
      >
        🐙
      </button>
    );
  }

  const getAllFiles = (nodes: TreeNode[]): TreeNode[] => {
    let files: TreeNode[] = [];
    nodes.forEach(n => {
      if (n.type === 'blob') files.push(n);
      if (n.children) files = files.concat(getAllFiles(n.children));
    });
    return files;
  };
  const allFiles = getAllFiles(tree);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    const matchedFile = allFiles.find(f => f.path === value);
    if (matchedFile) {
      handleNodeClick(matchedFile);
      setSearchQuery('');
    }
  };

  return (
    <div style={{ 
      pointerEvents: 'auto',
      width: '320px',
      height: '100vh', 
      overflowY: 'auto',
      backgroundColor: theme.bg,
      color: theme.text,
      fontFamily: theme.font,
      borderRight: theme.border,
      boxShadow: '10px 0 30px rgba(0,0,0,0.8)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ 
        padding: '20px', 
        borderBottom: theme.border, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        backgroundColor: '#16213e',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', width: '100%', marginBottom: '10px', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: '22px', color: '#00d2ff', textShadow: '2px 2px #0f3460' }}>
            🐙 {repo}
          </h3>
          <button 
            onClick={() => setIsOpen(false)} 
            style={{ 
              cursor: 'pointer', 
              backgroundColor: theme.fg, 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              padding: '8px 14px',
              fontWeight: 900,
              fontSize: '16px',
              fontFamily: theme.font,
              boxShadow: '3px 3px 0px #0f3460'
            }}
          >
            X
          </button>
        </div>
        
        {branches.length > 0 && (
          <select 
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: '#1a1a2e',
              color: '#00d2ff',
              border: '2px solid #0f3460',
              borderRadius: '8px',
              fontFamily: theme.font,
              padding: '6px',
              fontWeight: 'bold',
              outline: 'none',
              cursor: 'pointer',
              marginBottom: '10px',
              boxSizing: 'border-box'
            }}
          >
            {branches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        )}

        <div style={{ width: '100%' }}>
          <input 
            type="search" 
            list="octo-free-files" 
            value={searchQuery}
            onChange={handleSearch}
            placeholder="🔍 Search files..."
            style={{
              width: '100%',
              backgroundColor: '#1a1a2e',
              color: '#00d2ff',
              border: '2px solid #0f3460',
              borderRadius: '8px',
              fontFamily: theme.font,
              padding: '8px',
              fontWeight: 'bold',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          <datalist id="octo-free-files">
            {allFiles.map(f => <option key={f.path} value={f.path} />)}
          </datalist>
        </div>
      </div>
      <div style={{ padding: '16px', flex: 1, overflowY: 'auto' }}>
        {loading && <p style={{ color: '#00d2ff', fontWeight: 700 }}>Loading awesome code...</p>}
        {error && (
          <div>
            <p style={{ color: '#e94560', fontWeight: 700 }}>{error}</p>
            {isPrivateHint && (
              <button
                onClick={() => chrome.runtime.sendMessage({ action: 'openOptions' })}
                style={{
                  marginTop: '8px',
                  padding: '8px 14px',
                  backgroundColor: '#e94560',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontFamily: theme.font,
                  fontWeight: 900,
                  fontSize: '13px',
                  cursor: 'pointer',
                  boxShadow: '3px 3px 0px #0f3460'
                }}
              >
                Add GitHub Token
              </button>
            )}
          </div>
        )}
        {!loading && !error && renderTree(tree)}
      </div>
    </div>
  );
};

export default Sidebar;
