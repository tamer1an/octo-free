import React, { useState } from 'react';
import TreeItem from './TreeItem';

const Sidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);

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
        <h3 style={{ margin: 0 }}>Octo-Free</h3>
        <button onClick={() => setIsOpen(false)} style={{ cursor: 'pointer' }}>Close</button>
      </div>
      <div>
        <TreeItem label="src" isFolder={true}>
          <TreeItem label="components" isFolder={true}>
            <TreeItem label="Sidebar.tsx" />
            <TreeItem label="TreeItem.tsx" />
          </TreeItem>
          <TreeItem label="index.ts" />
        </TreeItem>
        <TreeItem label="package.json" />
        <TreeItem label="README.md" />
      </div>
    </div>
  );
};

export default Sidebar;
