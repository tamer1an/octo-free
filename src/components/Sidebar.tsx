import React, { useState, useEffect } from 'react';
import TreeItem from './TreeItem';
import { fetchRepoTree, fetchBranches, fetchFileContent } from '../adapters/github';
import { TreeNode } from '../adapters/types';

const fontLink = document.createElement('link');
fontLink.href = 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;900&family=Fredoka+One&display=swap';
fontLink.rel = 'stylesheet';
document.head.appendChild(fontLink);

const styleTag = document.createElement('style');
styleTag.textContent = `
  #octo-free-root * { box-sizing: border-box; }
  .octo-branch-select option { background: #1e1535; }
  .octo-tree-scroll::-webkit-scrollbar { width: 5px; }
  .octo-tree-scroll::-webkit-scrollbar-track { background: transparent; }
  .octo-tree-scroll::-webkit-scrollbar-thumb { background: rgba(255,160,50,0.35); border-radius: 99px; }
  .octo-tree-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,160,50,0.6); }
  @keyframes octo-spin { to { transform: rotate(360deg); } }
  @keyframes octo-pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
  @keyframes octo-pop { 0%{transform:scale(0.8);opacity:0} 100%{transform:scale(1);opacity:1} }
`;
document.head.appendChild(styleTag);

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

  const cs = {
    bg:        '#1e1535',
    bgHeader:  '#160f2b',
    bgItem:    'rgba(255,255,255,0.04)',
    bgItemHov: 'rgba(255,160,50,0.12)',
    orange:    '#ff9f1c',
    amber:     '#ffbf69',
    coral:     '#ff6b6b',
    text:      '#f5e6d0',
    muted:     '#a08c72',
    border:    'rgba(255,160,50,0.2)',
    glow:      '0 0 18px rgba(255,159,28,0.35)',
    font:      "'Nunito', sans-serif",
    fontHead:  "'Fredoka One', 'Nunito', sans-serif",
    radius:    '14px',
  };

  if (!isOpen) {
    return (
      <button
        style={{
          pointerEvents: 'auto',
          position: 'fixed',
          bottom: '28px',
          left: '28px',
          width: '56px',
          height: '56px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          cursor: 'pointer',
          background: `linear-gradient(135deg, ${cs.orange}, ${cs.coral})`,
          color: '#fff',
          border: 'none',
          borderRadius: '50%',
          fontFamily: cs.font,
          fontSize: '26px',
          boxShadow: `0 6px 24px rgba(255,100,30,0.55), ${cs.glow}`,
          transition: 'transform 0.18s ease, box-shadow 0.18s ease',
          zIndex: 2147483647,
          animation: 'octo-pop 0.25s ease',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.12)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
        onClick={() => setIsOpen(true)}
        title="Open Github File Tree"
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
      width: '300px',
      height: '100vh',
      backgroundColor: cs.bg,
      color: cs.text,
      fontFamily: cs.font,
      borderRight: `1px solid ${cs.border}`,
      boxShadow: '4px 0 32px rgba(0,0,0,0.6)',
      display: 'flex',
      flexDirection: 'column',
      animation: 'octo-pop 0.2s ease',
    }}>

      {/* ── Header ── */}
      <div style={{
        background: `linear-gradient(160deg, #2a1a50 0%, ${cs.bgHeader} 100%)`,
        padding: '18px 16px 14px',
        borderBottom: `1px solid ${cs.border}`,
        flexShrink: 0,
      }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <span style={{ fontSize: '22px', flexShrink: 0 }}>🐙</span>
            <span style={{
              fontFamily: cs.fontHead,
              fontSize: '17px',
              fontWeight: 400,
              color: cs.orange,
              letterSpacing: '0.3px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {repo}
            </span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              flexShrink: 0,
              cursor: 'pointer',
              background: 'rgba(255,255,255,0.07)',
              color: cs.muted,
              border: `1px solid ${cs.border}`,
              borderRadius: '8px',
              padding: '4px 10px',
              fontWeight: 700,
              fontSize: '13px',
              fontFamily: cs.font,
              lineHeight: '1.6',
              transition: 'color 0.15s, background 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.color = '#fff';
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,100,50,0.25)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.color = cs.muted;
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)';
            }}
          >
            ✕
          </button>
        </div>

        {/* Branch select */}
        {branches.length > 0 && (
          <div style={{ marginBottom: '10px', position: 'relative' }}>
            <span style={{
              position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
              fontSize: '13px', pointerEvents: 'none', color: cs.orange,
            }}>⎇</span>
            <select
              value={branch}
              onChange={e => setBranch(e.target.value)}
              className="octo-branch-select"
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.05)',
                color: cs.text,
                border: `1px solid ${cs.border}`,
                borderRadius: '10px',
                fontFamily: cs.font,
                fontSize: '13px',
                fontWeight: 600,
                padding: '7px 10px 7px 28px',
                outline: 'none',
                cursor: 'pointer',
                appearance: 'none',
                WebkitAppearance: 'none',
              }}
            >
              {branches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        )}

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
            fontSize: '13px', pointerEvents: 'none', color: cs.muted,
          }}>🔍</span>
          <input
            type="search"
            list="octo-free-files"
            value={searchQuery}
            onChange={handleSearch}
            placeholder="Search files…"
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.05)',
              color: cs.text,
              border: `1px solid ${cs.border}`,
              borderRadius: '10px',
              fontFamily: cs.font,
              fontSize: '13px',
              fontWeight: 600,
              padding: '7px 10px 7px 30px',
              outline: 'none',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = cs.orange; e.currentTarget.style.boxShadow = cs.glow; }}
            onBlur={e => { e.currentTarget.style.borderColor = cs.border; e.currentTarget.style.boxShadow = 'none'; }}
          />
          <datalist id="octo-free-files">
            {allFiles.map(f => <option key={f.path} value={f.path} />)}
          </datalist>
        </div>
      </div>

      {/* ── Tree ── */}
      <div className="octo-tree-scroll" style={{ padding: '10px 8px', flex: 1, overflowY: 'auto' }}>

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '20px 12px', color: cs.amber, fontWeight: 700, fontSize: '14px' }}>
            <span style={{ display: 'inline-block', animation: 'octo-spin 1s linear infinite', fontSize: '18px' }}>⚙️</span>
            Loading…
          </div>
        )}

        {error && (
          <div style={{
            margin: '12px 8px',
            padding: '14px 16px',
            background: 'rgba(255,80,80,0.08)',
            border: '1px solid rgba(255,80,80,0.25)',
            borderRadius: cs.radius,
          }}>
            <p style={{ margin: '0 0 10px', color: cs.coral, fontWeight: 700, fontSize: '13px', lineHeight: 1.5 }}>{error}</p>
            {isPrivateHint && (
              <button
                onClick={() => chrome.runtime.sendMessage({ action: 'openOptions' })}
                style={{
                  padding: '8px 16px',
                  background: `linear-gradient(135deg, ${cs.orange}, ${cs.coral})`,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  fontFamily: cs.fontHead,
                  fontWeight: 400,
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(255,100,30,0.4)',
                  letterSpacing: '0.3px',
                }}
              >
                🔑 Add GitHub Token
              </button>
            )}
          </div>
        )}

        {!loading && !error && renderTree(tree)}
      </div>

      {/* ── Footer ── */}
      <div style={{
        padding: '10px 16px',
        borderTop: `1px solid ${cs.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        background: cs.bgHeader,
      }}>
        <span style={{ fontSize: '11px', color: cs.muted, fontWeight: 600 }}>
          {allFiles.length} files
        </span>
        <button
          onClick={() => chrome.runtime.sendMessage({ action: 'openOptions' })}
          title="Token settings"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            opacity: 0.55,
            transition: 'opacity 0.15s',
            padding: '2px 4px',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.55'; }}
        >
          ⚙️
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
