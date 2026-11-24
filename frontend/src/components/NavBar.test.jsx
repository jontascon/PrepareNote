import { render, screen, fireEvent } from '@testing-library/react';
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

test('shows the My Notes and Public Notes buttons when logged in', () => {
  const user = { id: 2, username: 'ritam', email: 'ritam@example.com', isModerator: false };
  render(<NavBar user={user} page="my-notes" onChangePage={vi.fn()} onLogout={vi.fn()} />);

  expect(screen.getByRole('button', { name: 'My Notes' }).getAttribute('aria-current')).toBe('page');
  expect(screen.getByRole('button', { name: 'Public Notes' }).getAttribute('aria-current')).toBeNull();
});

test('clicking a page button changes the page', () => {
  const user = { id: 2, username: 'ritam', email: 'ritam@example.com', isModerator: false };
  const changePage = vi.fn();
  render(<NavBar user={user} page="my-notes" onChangePage={changePage} onLogout={vi.fn()} />);

  fireEvent.click(screen.getByRole('button', { name: 'Public Notes' }));
  expect(changePage).toHaveBeenCalledWith('public-notes');

  fireEvent.click(screen.getByRole('button', { name: 'My Notes' }));
  expect(changePage).toHaveBeenCalledWith('my-notes');
});

test('shows no page buttons when nobody is logged in', () => {
  render(<NavBar user={null} page="my-notes" onChangePage={vi.fn()} onLogout={vi.fn()} />);

  expect(screen.queryByText('My Notes')).toBeNull();
  expect(screen.queryByText('Public Notes')).toBeNull();
});

test('shows My Bookmarks when logged in', () => {
  const user = { id: 2, username: 'ritam', email: 'ritam@example.com', isModerator: false };
  render(<NavBar user={user} page="my-notes" onChangePage={vi.fn()} onLogout={vi.fn()} />);

  expect(screen.getByRole('button', { name: 'My Bookmarks' })).toBeTruthy();
});

test('clicking My Bookmarks changes the page', () => {
  const user = { id: 2, username: 'ritam', email: 'ritam@example.com', isModerator: false };
  const changePage = vi.fn();
  render(<NavBar user={user} page="my-notes" onChangePage={changePage} onLogout={vi.fn()} />);

  fireEvent.click(screen.getByRole('button', { name: 'My Bookmarks' }));

  expect(changePage).toHaveBeenCalledWith('bookmarks');
});

test('shows My Bookmarks as the active page', () => {
  const user = { id: 2, username: 'ritam', email: 'ritam@example.com', isModerator: false };
  render(<NavBar user={user} page="bookmarks" onChangePage={vi.fn()} onLogout={vi.fn()} />);

  expect(screen.getByRole('button', { name: 'My Bookmarks' }).getAttribute('aria-current')).toBe('page');
  expect(screen.getByRole('button', { name: 'My Notes' }).getAttribute('aria-current')).toBeNull();
  expect(screen.getByRole('button', { name: 'Public Notes' }).getAttribute('aria-current')).toBeNull();
});

test('does not show My Bookmarks when logged out', () => {
  render(<NavBar user={null} page="bookmarks" onChangePage={vi.fn()} onLogout={vi.fn()} />);

  expect(screen.queryByRole('button', { name: 'My Bookmarks' })).toBeNull();
});