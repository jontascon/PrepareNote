import { render, screen, fireEvent } from '@testing-library/react';
import App from './App.jsx';

beforeEach(() => {
  localStorage.clear();
});

function logInAsRitam() {
  globalThis.fetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve({ success: true, id: 1, username: 'ritam', email: 'ritam@example.com' }),
  });

  fireEvent.change(document.getElementById('login-username'), { target: { value: 'ritam' } });
  fireEvent.change(document.getElementById('login-password'), { target: { value: 'test-password-123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Log In' }));
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

  expect(screen.getByRole('heading', { name: 'Log In' })).toBeTruthy();
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

  firstPage.unmount();
  render(<App />);

  expect(screen.getByRole('heading', { name: 'Log In' })).toBeTruthy();
});
