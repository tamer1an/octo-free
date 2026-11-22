import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { webcrypto } from 'crypto';
import { TextEncoder, TextDecoder } from 'util';
import Sidebar from '../Sidebar';

// jsdom lacks TextEncoder and a working SubtleCrypto; the real extension always
// runs on https://github.com, where both are natively available.
if (!(global as any).TextEncoder) {
  (global as any).TextEncoder = TextEncoder;
  (global as any).TextDecoder = TextDecoder;
}
if (!(global as any).crypto?.subtle) {
  Object.defineProperty(global, 'crypto', { value: webcrypto, configurable: true });
}

// Mock chrome API
Object.defineProperty(global, 'chrome', {
  value: {
    storage: {
      sync: {
        get: jest.fn((_keys, cb) => cb({ githubToken: 'mock-token' })),
      },
      local: {
        get: jest.fn((_keys, cb) => cb({})),
        set: jest.fn(),
      },
    },
    runtime: {
      sendMessage: jest.fn(),
    },
  },
});

const mockPulls = [
  { number: 42, title: 'Add cool feature', state: 'open', head: { ref: 'feature-branch', sha: 'abc' }, html_url: '' },
];

const mockPrFiles = [
  { filename: 'README.md', status: 'modified', additions: 12, deletions: 3, changes: 15 },
];

const mockRepoTree = {
  sha: 'root', url: '', truncated: false,
  tree: [
    { path: 'README.md', mode: '100644', type: 'blob', sha: '1' },
    { path: 'src/index.ts', mode: '100644', type: 'blob', sha: '2' },
    { path: 'src/App.tsx', mode: '100644', type: 'blob', sha: '3' },
    { path: '.claude/settings.json', mode: '100644', type: 'blob', sha: '4' },
    { path: 'docs/guide.md', mode: '100644', type: 'blob', sha: '5' },
  ],
};

// Mock fetch API, branching on the requested URL (most specific first —
// "/pulls/42/files" also contains "/pulls", so it must be checked before it)
global.fetch = jest.fn((url: string) => {
  if (url.includes('/files')) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPrFiles) });
  }
  if (url.includes('/pulls')) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPulls) });
  }
  if (url.includes('/git/trees/')) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve(mockRepoTree) });
  }
  return Promise.resolve({ ok: true, json: () => Promise.resolve([{ name: 'main' }]) });
}) as jest.Mock;

describe('Sidebar Component', () => {
  it('renders correctly and toggles state', () => {
    render(<Sidebar owner="test-owner" repo="test-repo" />);

    // Initially open
    expect(screen.getByText('test-repo')).toBeTruthy();

    // Close it
    const closeBtn = screen.getByText('✕');
    fireEvent.click(closeBtn);

    // Now closed
    expect(screen.getByTitle('Open Github File Tree')).toBeTruthy();
  });

  it('switches the dropdown from branches to pull requests and lists them', async () => {
    render(<Sidebar owner="test-owner" repo="test-repo" />);

    await waitFor(() => expect(screen.getByTitle('Show open pull requests')).toBeTruthy());
    fireEvent.click(screen.getByTitle('Show open pull requests'));

    await waitFor(() => expect(screen.getByText('#42 Add cool feature')).toBeTruthy());
  });

  it('shows a PR-scoped file tree with +/- stat badges and links to the file diff on click', async () => {
    render(<Sidebar owner="test-owner" repo="test-repo" />);

    await waitFor(() => expect(screen.getByTitle('Show open pull requests')).toBeTruthy());
    fireEvent.click(screen.getByTitle('Show open pull requests'));

    // README.md also exists in the (unfiltered) branches-mode tree, so wait on
    // the diff badge specifically — it only renders once the PR-scoped tree has loaded.
    await waitFor(() => expect(screen.getByText('+12')).toBeTruthy());
    expect(screen.getByText('README.md')).toBeTruthy();
    expect(screen.getByText('-3')).toBeTruthy();

    const dispatchSpy = jest.spyOn(HTMLAnchorElement.prototype, 'dispatchEvent');
    fireEvent.click(screen.getByText('README.md'));

    await waitFor(() => expect(dispatchSpy).toHaveBeenCalled());
    const anchor = dispatchSpy.mock.instances[dispatchSpy.mock.instances.length - 1] as unknown as HTMLAnchorElement;
    expect(anchor.getAttribute('href')).toMatch(/^\/test-owner\/test-repo\/pull\/42\/files#diff-[0-9a-f]{64}$/);

    dispatchSpy.mockRestore();
  });

  it('restores a persisted closed state from chrome.storage', async () => {
    (chrome.storage.local.get as jest.Mock).mockImplementationOnce((_keys, cb) =>
      cb({ octoFreeUiState: { isOpen: false, mode: 'branches' } })
    );

    render(<Sidebar owner="test-owner" repo="test-repo" />);

    await waitFor(() => expect(screen.getByTitle('Open Github File Tree')).toBeTruthy());
  });

  it('the eye toggle filters the tree to markdown docs and agent config folders, and updates the footer count', async () => {
    render(<Sidebar owner="test-owner" repo="test-repo" />);

    await waitFor(() => expect(screen.getByText('README.md')).toBeTruthy());
    expect(screen.getByText('src')).toBeTruthy();
    expect(screen.getByText('5 files')).toBeTruthy();

    fireEvent.click(screen.getByTitle('Show only docs & agent config'));

    await waitFor(() => expect(screen.queryByText('src')).toBeFalsy());
    expect(screen.getByText('README.md')).toBeTruthy();
    expect(screen.getByText('docs')).toBeTruthy();
    expect(screen.getByText('.claude')).toBeTruthy();
    expect(screen.getByText('3 docs')).toBeTruthy();

    fireEvent.click(screen.getByTitle('Show full file tree'));
    await waitFor(() => expect(screen.getByText('src')).toBeTruthy());
  });

  it('restores a persisted docs-filter-on state from chrome.storage', async () => {
    (chrome.storage.local.get as jest.Mock).mockImplementationOnce((_keys, cb) =>
      cb({ octoFreeUiState: { isOpen: true, mode: 'branches', docsFilterOn: true } })
    );

    render(<Sidebar owner="test-owner" repo="test-repo" />);

    await waitFor(() => expect(screen.getByText('README.md')).toBeTruthy());
    expect(screen.queryByText('src')).toBeFalsy();
  });

  it('pressing "/" focuses the search input, but not while typing elsewhere', async () => {
    render(<Sidebar owner="test-owner" repo="test-repo" />);

    const search = await screen.findByPlaceholderText(/Search files/) as HTMLInputElement;
    expect(document.activeElement).not.toBe(search);

    fireEvent.keyDown(document, { key: '/' });
    expect(document.activeElement).toBe(search);

    search.blur();
    const other = document.createElement('input');
    document.body.appendChild(other);
    other.focus();
    fireEvent.keyDown(document, { key: '/' });
    expect(document.activeElement).toBe(other);
    document.body.removeChild(other);
  });
});
