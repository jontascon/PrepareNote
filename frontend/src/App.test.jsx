import { render, screen, fireEvent } from '@testing-library/react';
import App from './App.jsx';

function fakeServer(url) {
  let data = { success: true };

  if (url === '/getUser/') {
    data = { success: true, id: 1, username: 'ritam', email: 'ritam@example.com', is_moderator: false, token: 'abc123' };
  }

  if (url === '/notes/') {
    data = { success: true, notes: [] };
  }

  if (url === '/exams/') {
    data = { success: true, exams: [] };
  }

  return Promise.resolve({ json: () => Promise.resolve(data) });
}

beforeEach(() => {
  localStorage.clear();
  globalThis.fetch = vi.fn(fakeServer);
});

function logInAsRitam() {
  fireEvent.change(document.getElementById('login-username'), { target: { value: 'ritam' } });
  fireEvent.change(document.getElementById('login-password'), { target: { value: 'test-password-123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Log In' }));
}

function findCall(url) {
  for (let i = 0; i < fetch.mock.calls.length; i++) {
    if (fetch.mock.calls[i][0] === url) {
      return fetch.mock.calls[i];
    }
  }
  return null;
}

test('shows the PrepareNote name', () => {
  render(<App />);
  expect(screen.getByText('PrepareNote')).toBeTruthy();
});

test('shows the sign up and log in forms when nobody is logged in', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Create Account' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Log In' })).toBeTruthy();
});

test('shows the notes after logging in and goes back after logging out', async () => {
  render(<App />);
  logInAsRitam();

  expect(await screen.findByText('Logged in as ritam')).toBeTruthy();
  expect(screen.getByText('No notes yet. Write your first one!')).toBeTruthy();

  fireEvent.click(screen.getByText('Log Out'));

  expect(await screen.findByRole('heading', { name: 'Log In' })).toBeTruthy();
});

test('log out tells the backend to delete the token', async () => {
  render(<App />);
  logInAsRitam();
  expect(await screen.findByText('Logged in as ritam')).toBeTruthy();

  fireEvent.click(screen.getByText('Log Out'));
  expect(await screen.findByRole('heading', { name: 'Log In' })).toBeTruthy();

  const logoutCall = findCall('/logout/');
  expect(logoutCall[1].method).toBe('POST');
  expect(logoutCall[1].headers.Authorization).toBe('Token abc123');
});

test('stays logged in after the page is refreshed', async () => {
  const firstPage = render(<App />);
  logInAsRitam();
  expect(await screen.findByText('Logged in as ritam')).toBeTruthy();

  firstPage.unmount();
  render(<App />);

  expect(screen.getByText('Logged in as ritam')).toBeTruthy();
});

test('is logged out after a refresh if the user logged out', async () => {
  const firstPage = render(<App />);
  logInAsRitam();
  expect(await screen.findByText('Logged in as ritam')).toBeTruthy();
  fireEvent.click(screen.getByText('Log Out'));
  expect(await screen.findByRole('heading', { name: 'Log In' })).toBeTruthy();

  firstPage.unmount();
  render(<App />);

  expect(screen.getByRole('heading', { name: 'Log In' })).toBeTruthy();
});

test('asks to log in again if the saved login has no token', () => {
  localStorage.setItem('user', JSON.stringify({ id: 1, username: 'ritam', email: 'ritam@example.com' }));

  render(<App />);

  expect(screen.getByRole('heading', { name: 'Log In' })).toBeTruthy();
});
