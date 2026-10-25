import { render, screen } from '@testing-library/react';
import NavBar from './NavBar.jsx';

test('shows the Moderator label for a moderator', () => {
  const user = { id: 1, username: 'jon', email: 'jon@example.com', isModerator: true };
  render(<NavBar user={user} onLogout={vi.fn()} />);

  expect(screen.getByText('Moderator')).toBeTruthy();
  expect(screen.getByText('Logged in as jon')).toBeTruthy();
});

test('does not show the Moderator label for a regular user', () => {
  const user = { id: 2, username: 'ritam', email: 'ritam@example.com', isModerator: false };
  render(<NavBar user={user} onLogout={vi.fn()} />);

  expect(screen.queryByText('Moderator')).toBeNull();
  expect(screen.getByText('Logged in as ritam')).toBeTruthy();
});

test('shows no user info when nobody is logged in', () => {
  render(<NavBar user={null} onLogout={vi.fn()} />);

  expect(screen.queryByText('Log Out')).toBeNull();
});
