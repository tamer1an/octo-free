import { createRoot } from 'react-dom/client';
import Sidebar from '../components/Sidebar';

function injectSidebar() {
  const match = window.location.pathname.match(/^\/([^/]+)\/([^/]+)/);
  if (!match) return; // Not a repository page

  const owner = match[1];
  const repo = match[2];

  const container = document.createElement('div');
  container.id = 'octo-free-root';
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.zIndex = '9999';
  // Let the React component control its own dimensions and pointer events
  container.style.pointerEvents = 'none';
  document.body.appendChild(container);

  const root = createRoot(container);
  root.render(<Sidebar owner={owner} repo={repo} />);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectSidebar);
} else {
  injectSidebar();
}
