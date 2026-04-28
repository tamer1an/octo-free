import React, { useState } from 'react';

interface TreeItemProps {
  label: string;
  isFolder?: boolean;
  children?: React.ReactNode;
}

const TreeItem: React.FC<TreeItemProps> = ({ label, isFolder, children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ marginLeft: '16px', marginTop: '4px' }}>
      <div 
        style={{ cursor: isFolder ? 'pointer' : 'default', display: 'flex', alignItems: 'center' }}
        onClick={() => isFolder && setIsOpen(!isOpen)}
      >
        <span style={{ marginRight: '8px', width: '16px', display: 'inline-block' }}>
          {isFolder ? (isOpen ? '▼' : '▶') : '📄'}
        </span>
        <span>{label}</span>
      </div>
      {isFolder && isOpen && (
        <div style={{ marginTop: '4px' }}>
          {children}
        </div>
      )}
    </div>
  );
};

export default TreeItem;
