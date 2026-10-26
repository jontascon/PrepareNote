import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from './Login.jsx';

function fillInFormAndSubmit() {
  fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'ritam' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'test-password-123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Log In' }));
}

test('logs the user in when the username and password are correct', async () => {
  globalThis.fetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve({ success: true, id: 1, username: 'ritam', email: 'ritam@example.com', token: 'abc123' }),
  });
  const onLogin = vi.fn();

  render(<Login onLogin={onLogin} />);
  fillInFormAndSubmit();

  await waitFor(() => expect(onLogin.mock.calls.length).toBe(1));
  expect(onLogin.mock.calls[0][0].username).toBe('ritam');
  expect(onLogin.mock.calls[0][0].isModerator).toBe(false);
  expect(onLogin.mock.calls[0][0].token).toBe('abc123');
  expect(fetch.mock.calls[0][0]).toBe('/getUser/');
  expect(fetch.mock.calls[0][1].method).toBe('POST');
});

test('marks the user as a moderator when the backend says so', async () => {
  globalThis.fetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve({ success: true, id: 3, username: 'jon', email: 'jon@example.com', is_moderator: true }),
  });
  const onLogin = vi.fn();

  render(<Login onLogin={onLogin} />);
  fillInFormAndSubmit();

  await waitFor(() => expect(onLogin.mock.calls.length).toBe(1));
  expect(onLogin.mock.calls[0][0].isModerator).toBe(true);
});

test('shows an error when the username or password is wrong', async () => {
  globalThis.fetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve({ success: false, error: 'Invalid username or password' }),
  });
  const onLogin = vi.fn();

  render(<Login onLogin={onLogin} />);
  fillInFormAndSubmit();

  expect(await screen.findByText('Invalid username or password')).toBeTruthy();
  expect(onLogin.mock.calls.length).toBe(0);
});

test('TCID-38: shows an error when the server cannot be reached', async () => {
  globalThis.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

  render(<Login onLogin={vi.fn()} />);
  fillInFormAndSubmit();

  expect(await screen.findByText('Could not connect to the server. Please try again later.')).toBeTruthy();
});

test('asks for the username and password before sending anything', () => {
  globalThis.fetch = vi.fn();

  render(<Login onLogin={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Log In' }));

  expect(screen.getByText('Please enter your username and password.')).toBeTruthy();
  expect(fetch.mock.calls.length).toBe(0);
});
