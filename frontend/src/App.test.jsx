import { render, screen, fireEvent } from '@testing-library/react';
import App from './App.jsx';

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
  globalThis.fetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve({ success: true, id: 1, username: 'ritam', email: 'ritam@example.com' }),
  });

  render(<App />);
  fireEvent.change(document.getElementById('login-username'), { target: { value: 'ritam' } });
  fireEvent.change(document.getElementById('login-password'), { target: { value: 'test-password-123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Log In' }));

  expect(await screen.findByText('Logged in as ritam')).toBeTruthy();
  expect(screen.getByText('No notes yet. Write your first one!')).toBeTruthy();

  fireEvent.click(screen.getByText('Log Out'));

  expect(screen.getByRole('heading', { name: 'Log In' })).toBeTruthy();
});
