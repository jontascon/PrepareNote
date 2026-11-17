import { render, screen, fireEvent } from '@testing-library/react';
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

// Reporting public notes (#22)

function reportServer(reportReply) {
  return vi.fn((url, options) => {
    let data = { success: true, notes: sharedNotes };
    if (options && options.method === 'POST') {
      data = reportReply;
    }
    return Promise.resolve({ json: () => Promise.resolve(data) });
  });
}

function findPost() {
  for (let i = 0; i < fetch.mock.calls.length; i++) {
    const options = fetch.mock.calls[i][1];
    if (options && options.method === 'POST') {
      return fetch.mock.calls[i];
    }
  }
  return null;
}

async function openReportForm() {
  render(<PublicNotes user={user} />);
  const reportButtons = await screen.findAllByRole('button', { name: 'Report' });
  fireEvent.click(reportButtons[0]);
}

test('each shared note has a Report button', async () => {
  globalThis.fetch = reportServer({ success: true });

  render(<PublicNotes user={user} />);

  const reportButtons = await screen.findAllByRole('button', { name: 'Report' });
  expect(reportButtons.length).toBe(2);
});

test('reports a note through the API with a reason', async () => {
  globalThis.fetch = reportServer({ success: true, report: { report_id: 1, note_id: 9, reason: 'Copied from a paid course' } });
  await openReportForm();

  fireEvent.change(screen.getByLabelText('Why are you reporting this note?'), { target: { value: 'Copied from a paid course' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send Report' }));

  expect(await screen.findByText('Thanks for reporting. A moderator will review this note.')).toBeTruthy();
  const postCall = findPost();
  expect(postCall[0]).toBe('/notes/9/report/');
  expect(postCall[1].headers.Authorization).toBe('Token abc123');
  expect(JSON.parse(postCall[1].body).reason).toBe('Copied from a paid course');
});

test('a reported note shows Reported instead of the Report button', async () => {
  globalThis.fetch = reportServer({ success: true });
  await openReportForm();

  fireEvent.change(screen.getByLabelText('Why are you reporting this note?'), { target: { value: 'Spam' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send Report' }));

  expect(await screen.findByText('Reported')).toBeTruthy();
  expect(screen.getAllByRole('button', { name: 'Report' }).length).toBe(1);
  expect(screen.queryByLabelText('Why are you reporting this note?')).toBeNull();
});

test('asks for a reason before sending a report', async () => {
  globalThis.fetch = reportServer({ success: true });
  await openReportForm();

  fireEvent.change(screen.getByLabelText('Why are you reporting this note?'), { target: { value: '   ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send Report' }));

  expect(await screen.findByText('Please tell us why you are reporting this note.')).toBeTruthy();
  expect(findPost()).toBeNull();
});

test('cancel closes the report form without sending', async () => {
  globalThis.fetch = reportServer({ success: true });
  await openReportForm();

  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

  expect(screen.queryByLabelText('Why are you reporting this note?')).toBeNull();
  expect(screen.getAllByRole('button', { name: 'Report' }).length).toBe(2);
  expect(findPost()).toBeNull();
});

test('notes you already reported stay marked after reloading', async () => {
  const notes = [{ ...sharedNotes[0], reported: true }, sharedNotes[1]];
  globalThis.fetch = serverWith({ success: true, notes: notes });

  render(<PublicNotes user={user} />);

  expect(await screen.findByText('Reported')).toBeTruthy();
  expect(screen.getAllByRole('button', { name: 'Report' }).length).toBe(1);
});

test('shows the error from the server when a report fails', async () => {
  globalThis.fetch = reportServer({ success: false, error: 'You already reported this note.' });
  await openReportForm();

  fireEvent.change(screen.getByLabelText('Why are you reporting this note?'), { target: { value: 'Spam' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send Report' }));

  expect(await screen.findByText('Could not report the note: You already reported this note.')).toBeTruthy();
  expect(screen.queryByText('Reported')).toBeNull();
});

test('the reason box allows at most 500 characters', async () => {
  globalThis.fetch = reportServer({ success: true });
  await openReportForm();

  expect(screen.getByLabelText('Why are you reporting this note?').getAttribute('maxLength')).toBe('500');
});
