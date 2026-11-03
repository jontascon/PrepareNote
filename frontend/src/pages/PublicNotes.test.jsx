import { render, screen } from '@testing-library/react';
import PublicNotes from './PublicNotes.jsx';

const user = { id: 1, username: 'jessy', email: 'jessy@example.com', isModerator: false, token: 'abc123' };

const sharedNotes = [
  {
    note_id: 9,
    title: 'Peering',
    content: 'Peering is not transitive',
    study_status: 'confident',
    is_public: true,
    username: 'tim',
    topic_id: 3,
    topic_name: 'AWS > Networking > VPC Peering',
  },
  {
    note_id: 4,
    title: 'Subnetting',
    content: 'A /24 network has 256 addresses',
    study_status: 'learning',
    is_public: true,
    username: 'ritam',
    topic_id: null,
    topic_name: null,
  },
];

function serverWith(data) {
  return vi.fn(() => Promise.resolve({ json: () => Promise.resolve(data) }));
}

test('loads the public notes from the backend with the token', async () => {
  globalThis.fetch = serverWith({ success: true, notes: sharedNotes });

  render(<PublicNotes user={user} />);

  expect(await screen.findByText('Peering')).toBeTruthy();
  expect(fetch.mock.calls[0][0]).toBe('/notes/public/');
  expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Token abc123');
});

test('shows who shared each note and its topic', async () => {
  globalThis.fetch = serverWith({ success: true, notes: sharedNotes });

  render(<PublicNotes user={user} />);

  expect(await screen.findByText('Shared by tim')).toBeTruthy();
  expect(screen.getByText('Shared by ritam')).toBeTruthy();
  expect(screen.getByText('AWS > Networking > VPC Peering')).toBeTruthy();
  expect(screen.getByText('A /24 network has 256 addresses')).toBeTruthy();
});

test('shows a loading message until the notes arrive', async () => {
  globalThis.fetch = serverWith({ success: true, notes: sharedNotes });

  render(<PublicNotes user={user} />);

  expect(screen.getByText('Loading public notes...')).toBeTruthy();
  expect(await screen.findByText('Peering')).toBeTruthy();
  expect(screen.queryByText('Loading public notes...')).toBeNull();
});

test('shows a message when nobody has shared a note yet', async () => {
  globalThis.fetch = serverWith({ success: true, notes: [] });

  render(<PublicNotes user={user} />);

  expect(await screen.findByText('No public notes yet. Check back later!')).toBeTruthy();
});

test('does not show edit or delete buttons on other users notes', async () => {
  globalThis.fetch = serverWith({ success: true, notes: sharedNotes });

  render(<PublicNotes user={user} />);

  expect(await screen.findByText('Peering')).toBeTruthy();
  expect(screen.queryByText('Edit')).toBeNull();
  expect(screen.queryByText('Delete')).toBeNull();
});

test('shows an error when the notes cannot be loaded', async () => {
  globalThis.fetch = serverWith({ success: false, error: 'Invalid token.' });

  render(<PublicNotes user={user} />);

  expect(await screen.findByText('Could not load public notes.')).toBeTruthy();
  expect(screen.queryByText('No public notes yet. Check back later!')).toBeNull();
});

test('shows an error when the server cannot be reached', async () => {
  globalThis.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

  render(<PublicNotes user={user} />);

  expect(await screen.findByText('Could not connect to the server. Please try again later.')).toBeTruthy();
});
