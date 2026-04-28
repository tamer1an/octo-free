import React, { useState } from 'react';

interface TreeItemProps {
  label: string;
  isFolder?: boolean;
  children?: React.ReactNode;
  onClick?: () => void;
  onIconClick?: (e: React.MouseEvent) => void;
}

const TreeItem: React.FC<TreeItemProps> = ({ label, isFolder, children, onClick, onIconClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hover, setHover] = useState(false);

  const theme = {
    folder: '#00d2ff',
    file: '#e94560',
    bgHover: '#0f3460'
  };

  return (
    <div style={{ marginLeft: '12px', marginTop: '6px', userSelect: 'none' }}>
      <div 
        style={{ 
          cursor: 'pointer', 
          display: 'flex', 
          alignItems: 'center',
          padding: '8px 12px',
          borderRadius: '12px',
          backgroundColor: hover ? theme.bgHover : 'transparent',
          transition: 'background-color 0.2s',
          fontWeight: 700,
          color: isFolder ? theme.folder : theme.file,
          border: hover ? '2px solid #00d2ff' : '2px solid transparent',
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={() => {
          if (isFolder) setIsOpen(!isOpen);
          else if (onClick) onClick();
        }}
      >
        <span 
          style={{ 
            marginRight: '10px', 
            width: '24px', 
            display: 'inline-block', 
            textAlign: 'center', 
            fontSize: '18px',
            transition: 'transform 0.1s',
          }}
          onMouseEnter={(e) => {
            if (!isFolder) e.currentTarget.style.transform = 'scale(1.2)';
          }}
          onMouseLeave={(e) => {
            if (!isFolder) e.currentTarget.style.transform = 'scale(1)';
          }}
          onClick={(e) => {
            if (!isFolder && onIconClick) {
              onIconClick(e);
            }
          }}
          title={!isFolder ? "Download raw file" : undefined}
        >
          {isFolder ? (isOpen ? '📂' : '📁') : '📄'}
        </span>
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '15px' }}>{label}</span>
      </div>
      {isFolder && isOpen && (
        <div style={{ 
          marginTop: '4px',
          borderLeft: '4px dashed #0f3460',
          marginLeft: '20px'
        }}>
          {children}
        </div>
      )}
    </div>
  );
};

export default TreeItem;
