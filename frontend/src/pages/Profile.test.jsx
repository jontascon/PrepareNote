import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Profile from './Profile.jsx';

const user = { id: 1, username: 'ritam', email: 'ritam@example.com', isModerator: false, token: 'abc123' };

const savedProfile = {
  id: 1,
  username: 'ritam',
  email: 'ritam@example.com',
  is_moderator: false,
  date_joined: '2026-10-20',
  note_count: 5,
  public_note_count: 2,
};

function fakeServer(url, options) {
  let data = { success: true, profile: savedProfile };

  if (url === '/profile/' && options && options.method === 'PUT') {
    const body = JSON.parse(options.body);
    data = { success: true, profile: { ...savedProfile, username: body.username, email: body.email } };
  }

  if (url === '/profile/password/') {
    data = { success: true, token: 'newtoken456' };
  }

  return Promise.resolve({ json: () => Promise.resolve(data) });
}

function findCall(url, method) {
  for (let i = 0; i < fetch.mock.calls.length; i++) {
    const options = fetch.mock.calls[i][1];
    if (fetch.mock.calls[i][0] === url && options && options.method === method) {
      return fetch.mock.calls[i];
    }
  }
  return null;
}

async function renderProfile(onUserChange) {
  render(<Profile user={user} onUserChange={onUserChange} />);
  expect(await screen.findByText('Member since 2026-10-20')).toBeTruthy();
}

function fillPasswords(current, next, confirm) {
  fireEvent.change(screen.getByLabelText('Current password'), { target: { value: current } });
  fireEvent.change(screen.getByLabelText('New password'), { target: { value: next } });
  fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: confirm } });
  fireEvent.click(screen.getByRole('button', { name: 'Change Password' }));
}

beforeEach(() => {
  globalThis.fetch = vi.fn(fakeServer);
});

test('loads the profile from the backend with the token', async () => {
  await renderProfile(vi.fn());

  expect(fetch.mock.calls[0][0]).toBe('/profile/');
  expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Token abc123');
  expect(screen.getByText('Role: Student')).toBeTruthy();
  expect(screen.getByText('Notes: 5 (2 public)')).toBeTruthy();
  expect(screen.getByLabelText('Username').value).toBe('ritam');
  expect(screen.getByLabelText('Email').value).toBe('ritam@example.com');
});

test('shows Moderator as the role for moderators', async () => {
  globalThis.fetch = vi.fn(() => Promise.resolve({
    json: () => Promise.resolve({ success: true, profile: { ...savedProfile, is_moderator: true } }),
  }));
  render(<Profile user={user} onUserChange={vi.fn()} />);

  expect(await screen.findByText('Role: Moderator')).toBeTruthy();
});

test('shows an error when the profile cannot be loaded', async () => {
  globalThis.fetch = vi.fn(() => Promise.reject(new Error('offline')));
  render(<Profile user={user} onUserChange={vi.fn()} />);

  expect(await screen.findByText('Could not connect to the server. Please try again later.')).toBeTruthy();
});

test('saves a new username and email through the API', async () => {
  const onUserChange = vi.fn();
  await renderProfile(onUserChange);

  fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'ritam_r' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Profile' }));

  expect(await screen.findByText('Your profile was saved.')).toBeTruthy();
  const putCall = findCall('/profile/', 'PUT');
  expect(JSON.parse(putCall[1].body)).toEqual({ username: 'ritam_r', email: 'new@example.com' });
  expect(putCall[1].headers.Authorization).toBe('Token abc123');
  expect(onUserChange.mock.calls[0][0].username).toBe('ritam_r');
  expect(onUserChange.mock.calls[0][0].email).toBe('new@example.com');
  expect(onUserChange.mock.calls[0][0].token).toBe('abc123');
});

async function expectProfileError(label, value, message) {
  await renderProfile(vi.fn());

  fireEvent.change(screen.getByLabelText(label), { target: { value: value } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Profile' }));

  expect(screen.getByText(message)).toBeTruthy();
  expect(findCall('/profile/', 'PUT')).toBe(null);
}

test('asks for a username and email before saving', async () => {
  await expectProfileError('Username', '', 'Please enter a username and an email.');
});

test('rejects a username with bad characters before saving', async () => {
  await expectProfileError('Username', '<script>', 'Username can only use letters, numbers and @ . + - _');
});

test('rejects a bad email before saving', async () => {
  await expectProfileError('Email', 'not-an-email', 'Please enter a valid email address.');
});

test('rejects an email with no dot after the @ before saving', async () => {
  await expectProfileError('Email', 'ritam@example', 'Please enter a valid email address.');
});

test('the username box allows at most 150 characters', async () => {
  await renderProfile(vi.fn());

  expect(screen.getByLabelText('Username').getAttribute('maxLength')).toBe('150');
});

test('shows the error from the server when the username is taken', async () => {
  globalThis.fetch = vi.fn((url, options) => {
    if (options && options.method === 'PUT') {
      return Promise.resolve({
        json: () => Promise.resolve({ success: false, error: 'A user with that username already exists.' }),
      });
    }
    return fakeServer(url, options);
  });
  const onUserChange = vi.fn();
  await renderProfile(onUserChange);

  fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'tim' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Profile' }));

  expect(await screen.findByText('Could not save your profile: A user with that username already exists.')).toBeTruthy();
  expect(onUserChange).not.toHaveBeenCalled();
});

test('changes the password through the API and keeps you logged in with the new token', async () => {
  const onUserChange = vi.fn();
  await renderProfile(onUserChange);

  fillPasswords('Testing987@', 'Better#Pass42', 'Better#Pass42');

  expect(await screen.findByText('Your password was changed.')).toBeTruthy();
  const postCall = findCall('/profile/password/', 'POST');
  expect(JSON.parse(postCall[1].body)).toEqual({ current_password: 'Testing987@', new_password: 'Better#Pass42' });
  expect(onUserChange.mock.calls[0][0].token).toBe('newtoken456');
  expect(screen.getByLabelText('Current password').value).toBe('');
  expect(screen.getByLabelText('New password').value).toBe('');
});

async function expectPasswordError(current, next, confirm, message) {
  await renderProfile(vi.fn());

  fillPasswords(current, next, confirm);

  expect(screen.getByText(message)).toBeTruthy();
  expect(findCall('/profile/password/', 'POST')).toBe(null);
}

test('asks for all three passwords', async () => {
  await expectPasswordError('Testing987@', 'Better#Pass42', '', 'Please fill in all three password boxes.');
});

test('the new passwords have to match', async () => {
  await expectPasswordError('Testing987@', 'Better#Pass42', 'Better#Pass43', 'The new passwords do not match.');
});

test('a new password of 7 characters is too short', async () => {
  await expectPasswordError('Testing987@', 'Zq8#mW2', 'Zq8#mW2', 'Your new password must be at least 8 characters.');
});

test('the new password must be different from the current one', async () => {
  await expectPasswordError('Testing987@', 'Testing987@', 'Testing987@', 'Your new password must be different from your current password.');
});

test('a new password of 8 characters is sent', async () => {
  await renderProfile(vi.fn());

  fillPasswords('Testing987@', 'Zq8#mW2p', 'Zq8#mW2p');

  await waitFor(() => expect(findCall('/profile/password/', 'POST')).not.toBe(null));
});

test('shows the error from the server when the current password is wrong', async () => {
  globalThis.fetch = vi.fn((url, options) => {
    if (url === '/profile/password/') {
      return Promise.resolve({
        json: () => Promise.resolve({ success: false, error: 'Your current password is not correct.' }),
      });
    }
    return fakeServer(url, options);
  });
  const onUserChange = vi.fn();
  await renderProfile(onUserChange);

  fillPasswords('wrong-password', 'Better#Pass42', 'Better#Pass42');

  expect(await screen.findByText('Could not change your password: Your current password is not correct.')).toBeTruthy();
  expect(onUserChange).not.toHaveBeenCalled();
});
