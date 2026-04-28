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
  container.style.height = '100vh';
  container.style.width = '250px';
  container.style.zIndex = '9999';
  container.style.backgroundColor = '#ffffff';
  container.style.borderRight = '1px solid #e1e4e8';
  document.body.appendChild(container);

  const root = createRoot(container);
  root.render(<Sidebar owner={owner} repo={repo} />);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectSidebar);
} else {
  injectSidebar();
}
