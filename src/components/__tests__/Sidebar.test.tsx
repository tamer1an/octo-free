import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '../Sidebar';

// Mock chrome API
Object.defineProperty(global, 'chrome', {
  value: {
    storage: {
      sync: {
        get: jest.fn((_keys, cb) => cb({ githubToken: 'mock-token' })),
      },
    },
  },
});

// Mock fetch API
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([{ name: 'main' }]),
  })
) as jest.Mock;

describe('Sidebar Component', () => {
  it('renders correctly and toggles state', () => {
    render(<Sidebar owner="test-owner" repo="test-repo" />);
    
    // Initially open
    expect(screen.getByText('🐙 test-repo')).toBeTruthy();
    
    // Close it
    const closeBtn = screen.getByText('X');
    fireEvent.click(closeBtn);
    
    // Now closed
    expect(screen.getByTitle('Open Github File Tree')).toBeTruthy();
  });
});
