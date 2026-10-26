import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Notes from './Notes.jsx';

const user = { id: 1, username: 'ritam', email: 'ritam@example.com', isModerator: false, token: 'abc123' };

const exams = [
  {
    exam_id: 1,
    name: 'AWS',
    sections: [{ section_id: 1, name: 'Networking', topics: [{ topic_id: 3, name: 'VPC Peering' }] }],
  },
];

function fakeServer(url, options) {
  let data = { success: true, notes: [] };

  if (url === '/exams/') {
    data = { success: true, exams: exams };
  }

  if (options && options.method === 'POST') {
    const body = JSON.parse(options.body);
    data = { success: true, note: { note_id: 7, title: body.title, content: body.content, topic_id: body.topic_id } };
  }

  if (options && options.method === 'PUT') {
    const body = JSON.parse(options.body);
    data = { success: true, note: { note_id: 7, title: body.title, content: body.content, topic_id: body.topic_id } };
  }

  if (options && options.method === 'DELETE') {
    data = { success: true };
  }

  return Promise.resolve({ json: () => Promise.resolve(data) });
}

function findCall(method) {
  for (let i = 0; i < fetch.mock.calls.length; i++) {
    const options = fetch.mock.calls[i][1];
    if (options && options.method === method) {
      return fetch.mock.calls[i];
    }
  }
  return null;
}

async function renderNotes() {
  render(<Notes user={user} />);
  await waitFor(() => expect(fetch.mock.calls.length).toBe(2));
}

function writeNote(title, content, buttonText) {
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: title } });
  fireEvent.change(screen.getByLabelText('Note'), { target: { value: content } });
  fireEvent.click(screen.getByRole('button', { name: buttonText }));
}

beforeEach(() => {
  globalThis.fetch = vi.fn(fakeServer);
});

test('loads the notes from the backend with the token', async () => {
  globalThis.fetch = vi.fn((url) => {
    if (url === '/notes/') {
      return Promise.resolve({
        json: () => Promise.resolve({ success: true, notes: [{ note_id: 1, title: 'Saved note', content: 'from the database' }] }),
      });
    }
    return fakeServer(url);
  });

  render(<Notes user={user} />);

  expect(await screen.findByText('Saved note')).toBeTruthy();
  expect(fetch.mock.calls[0][0]).toBe('/notes/');
  expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Token abc123');
});

test('adds a note through the API', async () => {
  await renderNotes();
  writeNote('Subnetting', 'A /24 network has 256 addresses', 'Save Note');

  expect(await screen.findByText('Subnetting')).toBeTruthy();
  const postCall = findCall('POST');
  expect(postCall[0]).toBe('/notes/');
  expect(postCall[1].headers.Authorization).toBe('Token abc123');
});

test('edits a note through the API', async () => {
  await renderNotes();
  writeNote('Subneting', 'typo in the title', 'Save Note');
  fireEvent.click(await screen.findByText('Edit'));

  expect(screen.getByRole('heading', { name: 'Edit Note' })).toBeTruthy();
  expect(screen.getByLabelText('Title').value).toBe('Subneting');

  writeNote('Subnetting', 'fixed the title', 'Update Note');

  expect(await screen.findByText('fixed the title')).toBeTruthy();
  expect(screen.queryByText('Subneting')).toBeNull();
  expect(findCall('PUT')[0]).toBe('/notes/7/');
});

test('cancel stops editing without changing the note', async () => {
  await renderNotes();
  writeNote('Subnetting', 'A /24 network has 256 addresses', 'Save Note');
  fireEvent.click(await screen.findByText('Edit'));
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'something else' } });
  fireEvent.click(screen.getByText('Cancel'));

  expect(screen.getByText('Subnetting')).toBeTruthy();
  expect(screen.getByLabelText('Title').value).toBe('');
  expect(findCall('PUT')).toBeNull();
});

test('deletes a note through the API', async () => {
  await renderNotes();
  writeNote('Subnetting', 'A /24 network has 256 addresses', 'Save Note');
  fireEvent.click(await screen.findByText('Delete'));

  expect(await screen.findByText('No notes yet. Write your first one!')).toBeTruthy();
  expect(screen.queryByText('Subnetting')).toBeNull();
  expect(findCall('DELETE')[0]).toBe('/notes/7/');
});

test('shows an error when the server cannot be reached', async () => {
  globalThis.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

  render(<Notes user={user} />);

  expect(await screen.findByText('Could not connect to the server. Please try again later.')).toBeTruthy();
});

test('saves a note under a topic through the API', async () => {
  await renderNotes();
  expect(await screen.findByRole('option', { name: 'AWS > Networking > VPC Peering' })).toBeTruthy();

  fireEvent.change(screen.getByLabelText('Topic'), { target: { value: '3' } });
  writeNote('Peering', 'Peering is not transitive', 'Save Note');

  expect(await screen.findByText('AWS > Networking > VPC Peering', { selector: '.card-subtitle' })).toBeTruthy();
  expect(JSON.parse(findCall('POST')[1].body).topic_id).toBe(3);
  expect(screen.getByLabelText('Topic').value).toBe('');
});

test('a note can be saved without a topic', async () => {
  await renderNotes();
  writeNote('Subnetting', 'A /24 network has 256 addresses', 'Save Note');

  expect(await screen.findByText('Subnetting')).toBeTruthy();
  expect(JSON.parse(findCall('POST')[1].body).topic_id).toBe(null);
});

test('editing a note shows its topic and can change it', async () => {
  await renderNotes();
  await screen.findByRole('option', { name: 'AWS > Networking > VPC Peering' });
  fireEvent.change(screen.getByLabelText('Topic'), { target: { value: '3' } });
  writeNote('Peering', 'Peering is not transitive', 'Save Note');
  fireEvent.click(await screen.findByText('Edit'));

  expect(screen.getByLabelText('Topic').value).toBe('3');

  fireEvent.change(screen.getByLabelText('Topic'), { target: { value: '' } });
  writeNote('Peering', 'Peering is not transitive', 'Update Note');

  await waitFor(() => expect(findCall('PUT')).not.toBeNull());
  expect(JSON.parse(findCall('PUT')[1].body).topic_id).toBe(null);
});
