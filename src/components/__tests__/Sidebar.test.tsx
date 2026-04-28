import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '../Sidebar';

describe('Sidebar Component', () => {
  it('renders correctly and toggles state', () => {
    render(<Sidebar />);
    
    // Initially open
    expect(screen.getByText('Octo-Free')).toBeTruthy();
    
    // Close it
    const closeBtn = screen.getByText('Close');
    fireEvent.click(closeBtn);
    
    // Now closed
    expect(screen.getByText('Open Octo-Free')).toBeTruthy();
  });
});
