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
  const [dlHover, setDlHover] = useState(false);

  const cs = {
    folder:    '#ffbf69',
    file:      '#c9b8ff',
    bgHover:   'rgba(255,160,50,0.12)',
    border:    'rgba(255,160,50,0.22)',
    indent:    'rgba(255,160,50,0.18)',
    font:      "'Nunito', sans-serif",
  };

  return (
    <div style={{ marginLeft: '10px', marginTop: '3px', userSelect: 'none' }}>
      <div
        style={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          padding: '5px 8px',
          borderRadius: '9px',
          backgroundColor: hover ? cs.bgHover : 'transparent',
          border: `1px solid ${hover ? cs.border : 'transparent'}`,
          transition: 'background-color 0.15s, border-color 0.15s',
          fontFamily: cs.font,
          fontWeight: 600,
          fontSize: '13px',
          color: isFolder ? cs.folder : cs.file,
          gap: '6px',
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={() => {
          if (isFolder) setIsOpen(!isOpen);
          else if (onClick) onClick();
        }}
      >
        {/* Expand chevron for folders */}
        {isFolder && (
          <span style={{
            fontSize: '10px',
            opacity: 0.6,
            transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease',
            flexShrink: 0,
            color: cs.folder,
          }}>▶</span>
        )}

        {/* File/folder icon */}
        <span style={{ fontSize: '15px', flexShrink: 0 }}>
          {isFolder ? (isOpen ? '📂' : '📁') : '📄'}
        </span>

        {/* Label */}
        <span style={{
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          flex: 1,
          minWidth: 0,
        }}>
          {label}
        </span>

        {/* Download button — files only, shows on row hover */}
        {!isFolder && hover && (
          <span
            title="Download"
            onMouseEnter={() => setDlHover(true)}
            onMouseLeave={() => setDlHover(false)}
            onClick={e => { e.stopPropagation(); if (onIconClick) onIconClick(e); }}
            style={{
              flexShrink: 0,
              fontSize: '13px',
              opacity: dlHover ? 1 : 0.55,
              transition: 'opacity 0.15s, transform 0.15s',
              transform: dlHover ? 'scale(1.15)' : 'scale(1)',
              cursor: 'pointer',
              padding: '0 2px',
            }}
          >
            ⬇
          </span>
        )}
      </div>

      {/* Children */}
      {isFolder && isOpen && (
        <div style={{
          marginTop: '2px',
          marginLeft: '14px',
          borderLeft: `1px solid ${cs.indent}`,
          paddingLeft: '4px',
        }}>
          {children}
        </div>
      )}
    </div>
  );
};

export default TreeItem;
