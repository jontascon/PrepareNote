import { render, screen, fireEvent } from '@testing-library/react';
import SignUp from './SignUp.jsx';

function fillInFormAndSubmit() {
  fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'ritam' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ritam@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'test-password-123' } });
  fireEvent.click(screen.getByText('Sign Up'));
}

test('shows a success message when the account is created', async () => {
  globalThis.fetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve({ success: true }),
  });

  render(<SignUp />);
  fillInFormAndSubmit();

  expect(await screen.findByText('Account created for ritam (ritam@example.com).')).toBeTruthy();
  expect(fetch.mock.calls.length).toBe(1);
  expect(fetch.mock.calls[0][0]).toBe('/createUser/');
  expect(fetch.mock.calls[0][1].method).toBe('POST');
});

test('shows the error when the account cannot be created', async () => {
  globalThis.fetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve({ success: false, error: 'UNIQUE constraint failed: auth_user.username' }),
  });

  render(<SignUp />);
  fillInFormAndSubmit();

  expect(await screen.findByText('Could not create account: UNIQUE constraint failed: auth_user.username')).toBeTruthy();
});

test('asks for all the fields before sending anything', () => {
  globalThis.fetch = vi.fn();

  render(<SignUp />);
  fireEvent.click(screen.getByText('Sign Up'));

  expect(screen.getByText('Please fill in all the fields.')).toBeTruthy();
  expect(fetch.mock.calls.length).toBe(0);
});
