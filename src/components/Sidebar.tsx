import React, { useState, useEffect } from 'react';
import TreeItem from './TreeItem';
import { fetchRepoTree } from '../adapters/github';
import { TreeNode } from '../adapters/types';

interface SidebarProps {
  owner: string;
  repo: string;
}

const Sidebar: React.FC<SidebarProps> = ({ owner, repo }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    chrome.storage.sync.get(['githubToken'], async (result) => {
      try {
        const data = await fetchRepoTree(owner, repo, 'main', result.githubToken);
        setTree(data);
      } catch (err: any) {
        // Fallback to master branch if main fails
        try {
          const data = await fetchRepoTree(owner, repo, 'master', result.githubToken);
          setTree(data);
        } catch (err2: any) {
          setError(err2.message || 'Failed to fetch repo tree');
        }
      } finally {
        setLoading(false);
      }
    });
  }, [owner, repo]);

  const renderTree = (nodes: TreeNode[]) => {
    return nodes.map(node => (
      <TreeItem key={node.path} label={node.name} isFolder={node.type === 'tree'}>
        {node.children && node.children.length > 0 ? renderTree(node.children) : null}
      </TreeItem>
    ));
  };

  if (!isOpen) {
    return (
      <button 
        style={{ padding: '8px', cursor: 'pointer' }}
        onClick={() => setIsOpen(true)}
      >
        Open Octo-Free
      </button>
    );
  }

  return (
    <div style={{ padding: '16px', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ margin: 0 }}>{repo}</h3>
        <button onClick={() => setIsOpen(false)} style={{ cursor: 'pointer' }}>Close</button>
      </div>
      <div>
        {loading && <p>Loading...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {!loading && !error && renderTree(tree)}
      </div>
    </div>
  );
};

export default Sidebar;
