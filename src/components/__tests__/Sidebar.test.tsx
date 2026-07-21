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

// Mock fetch API, branching on the requested URL (most specific first —
// "/pulls/42/files" also contains "/pulls", so it must be checked before it)
global.fetch = jest.fn((url: string) => {
  if (url.includes('/files')) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPrFiles) });
  }
  if (url.includes('/pulls')) {
    return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPulls) });
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

    await waitFor(() => expect(screen.getByText('README.md')).toBeTruthy());
    expect(screen.getByText('+12')).toBeTruthy();
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
});
