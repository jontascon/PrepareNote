import { render, screen, fireEvent } from '@testing-library/react';
import SignUp from './SignUp.jsx';

function fillInFormAndSubmit(username, email, password) {
  fireEvent.change(screen.getByLabelText('Username'), { target: { value: username } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  fireEvent.click(screen.getByText('Sign Up'));
}

test('shows a success message when the account is created', async () => {
  globalThis.fetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve({ success: true }),
  });

  render(<SignUp />);
  fillInFormAndSubmit('ritam', 'ritam@example.com', 'test-password-123');

  expect(await screen.findByText('Account created for ritam (ritam@example.com). You can log in now.')).toBeTruthy();
  expect(fetch.mock.calls.length).toBe(1);
  expect(fetch.mock.calls[0][0]).toBe('/createUser/');
  expect(fetch.mock.calls[0][1].method).toBe('POST');
});

test('TCID-02: asks for a username when it is missing', () => {
  globalThis.fetch = vi.fn();

  render(<SignUp />);
  fillInFormAndSubmit('', 'ritam@example.com', 'test-password-123');

  expect(screen.getByText('Please enter a username.')).toBeTruthy();
  expect(fetch.mock.calls.length).toBe(0);
});

test('TCID-02: asks for an email when it is missing', () => {
  globalThis.fetch = vi.fn();

  render(<SignUp />);
  fillInFormAndSubmit('ritam', '', 'test-password-123');

  expect(screen.getByText('Please enter an email.')).toBeTruthy();
  expect(fetch.mock.calls.length).toBe(0);
});

test('TCID-02: asks for a password when it is missing', () => {
  globalThis.fetch = vi.fn();

  render(<SignUp />);
  fillInFormAndSubmit('ritam', 'ritam@example.com', '');

  expect(screen.getByText('Please enter a password.')).toBeTruthy();
  expect(fetch.mock.calls.length).toBe(0);
});

test('TCID-03: shows the error when the username is already taken', async () => {
  globalThis.fetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve({ success: false, error: 'A user with that username already exists.' }),
  });

  render(<SignUp />);
  fillInFormAndSubmit('ritam', 'ritam@example.com', 'test-password-123');

  expect(await screen.findByText('Could not create account: A user with that username already exists.')).toBeTruthy();
});

test('TCID-36: accepts a username that is 150 characters long', async () => {
  globalThis.fetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve({ success: true }),
  });
  const longUsername = 'a'.repeat(150);

  render(<SignUp />);
  fillInFormAndSubmit(longUsername, 'ritam@example.com', 'test-password-123');

  expect(await screen.findByText('Account created for ' + longUsername + ' (ritam@example.com). You can log in now.')).toBeTruthy();
  expect(fetch.mock.calls.length).toBe(1);
});

test('TCID-36: rejects a username that is 151 characters long', () => {
  globalThis.fetch = vi.fn();

  render(<SignUp />);
  fillInFormAndSubmit('a'.repeat(151), 'ritam@example.com', 'test-password-123');

  expect(screen.getByText('Username must be 150 characters or fewer.')).toBeTruthy();
  expect(fetch.mock.calls.length).toBe(0);
});

test('TCID-38: shows an error when the server cannot be reached', async () => {
  globalThis.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

  render(<SignUp />);
  fillInFormAndSubmit('ritam', 'ritam@example.com', 'test-password-123');

  expect(await screen.findByText('Could not connect to the server. Please try again later.')).toBeTruthy();
});
