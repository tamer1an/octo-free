import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Sidebar from '../Sidebar';

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

// Mock fetch API, branching on the requested URL
global.fetch = jest.fn((url: string) => {
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

  it('restores a persisted closed state from chrome.storage', async () => {
    (chrome.storage.local.get as jest.Mock).mockImplementationOnce((_keys, cb) =>
      cb({ octoFreeUiState: { isOpen: false, mode: 'branches' } })
    );

    render(<Sidebar owner="test-owner" repo="test-repo" />);

    await waitFor(() => expect(screen.getByTitle('Open Github File Tree')).toBeTruthy());
  });
});
