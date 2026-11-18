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

let savedNotes = [];
let nextId = 7;

function makeNote(id, body) {
  let studyStatus = 'learning';
  if (body.study_status) {
    studyStatus = body.study_status;
  }
  return {
    note_id: id,
    title: body.title,
    content: body.content,
    study_status: studyStatus,
    is_public: body.is_public === true,
    topic_id: body.topic_id,
  };
}

function fakeServer(url, options) {
  let data = { success: true, notes: savedNotes };

  if (url === '/exams/') {
    data = { success: true, exams: exams };
  }

  if (options && options.method === 'POST') {
    const note = makeNote(nextId, JSON.parse(options.body));
    nextId = nextId + 1;
    savedNotes = savedNotes.concat(note);
    data = { success: true, note: note };
  }

  if (options && options.method === 'PUT') {
    const id = Number(url.split('/')[2]);
    const note = makeNote(id, JSON.parse(options.body));
    const updatedNotes = [];
    for (let i = 0; i < savedNotes.length; i++) {
      if (savedNotes[i].note_id === id) {
        updatedNotes.push(note);
      } else {
        updatedNotes.push(savedNotes[i]);
      }
    }
    savedNotes = updatedNotes;
    data = { success: true, note: note };
  }

  if (options && options.method === 'DELETE') {
    const id = Number(url.split('/')[2]);
    const newNotes = [];
    for (let i = 0; i < savedNotes.length; i++) {
      if (savedNotes[i].note_id !== id) {
        newNotes.push(savedNotes[i]);
      }
    }
    savedNotes = newNotes;
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
  savedNotes = [];
  nextId = 7;
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
  expect(await screen.findAllByRole('option', { name: 'AWS > Networking > VPC Peering' })).toBeTruthy();

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
  await screen.findAllByRole('option', { name: 'AWS > Networking > VPC Peering' });
  fireEvent.change(screen.getByLabelText('Topic'), { target: { value: '3' } });
  writeNote('Peering', 'Peering is not transitive', 'Save Note');
  fireEvent.click(await screen.findByText('Edit'));

  expect(screen.getByLabelText('Topic').value).toBe('3');

  fireEvent.change(screen.getByLabelText('Topic'), { target: { value: '' } });
  writeNote('Peering', 'Peering is not transitive', 'Update Note');

  await waitFor(() => expect(findCall('PUT')).not.toBeNull());
  expect(JSON.parse(findCall('PUT')[1].body).topic_id).toBe(null);
});

test('new notes start as Learning', async () => {
  await renderNotes();
  writeNote('Subnetting', 'A /24 network has 256 addresses', 'Save Note');

  expect(await screen.findByText('Learning', { selector: '.badge' })).toBeTruthy();
  expect(JSON.parse(findCall('POST')[1].body).study_status).toBe('learning');
});

test('saves the study status picked for a note through the API', async () => {
  await renderNotes();
  fireEvent.change(screen.getByLabelText('Study Status'), { target: { value: 'reviewing' } });
  writeNote('Subnetting', 'A /24 network has 256 addresses', 'Save Note');

  expect(await screen.findByText('Reviewing', { selector: '.badge' })).toBeTruthy();
  expect(JSON.parse(findCall('POST')[1].body).study_status).toBe('reviewing');
  expect(screen.getByLabelText('Study Status').value).toBe('learning');
});

test('editing a note can change its study status through the API', async () => {
  await renderNotes();
  writeNote('Subnetting', 'A /24 network has 256 addresses', 'Save Note');

  fireEvent.click(await screen.findByText('Edit'));
  expect(screen.getByLabelText('Study Status').value).toBe('learning');
  fireEvent.change(screen.getByLabelText('Study Status'), { target: { value: 'confident' } });
  writeNote('Subnetting', 'A /24 network has 256 addresses', 'Update Note');

  expect(await screen.findByText('Confident', { selector: '.badge' })).toBeTruthy();
  expect(screen.queryByText('Learning', { selector: '.badge' })).toBeNull();
  expect(JSON.parse(findCall('PUT')[1].body).study_status).toBe('confident');
});

test('shows how many notes are in each study status', async () => {
  await renderNotes();
  writeNote('Subnetting', 'A /24 network has 256 addresses', 'Save Note');
  await screen.findByText('Subnetting');
  fireEvent.change(screen.getByLabelText('Study Status'), { target: { value: 'confident' } });
  writeNote('VPC Peering', 'Peering is not transitive', 'Save Note');

  expect(await screen.findByText('Learning: 1 | Reviewing: 0 | Confident: 1')).toBeTruthy();
});

test('the study status is still there after reloading the page', async () => {
  const firstPage = render(<Notes user={user} />);
  await waitFor(() => expect(fetch.mock.calls.length).toBe(2));
  fireEvent.change(screen.getByLabelText('Study Status'), { target: { value: 'reviewing' } });
  writeNote('Subnetting', 'A /24 network has 256 addresses', 'Save Note');
  expect(await screen.findByText('Reviewing', { selector: '.badge' })).toBeTruthy();

  firstPage.unmount();
  render(<Notes user={user} />);

  expect(await screen.findByText('Subnetting')).toBeTruthy();
  expect(screen.getByText('Reviewing', { selector: '.badge' })).toBeTruthy();
});

test('new notes are private by default', async () => {
  await renderNotes();
  writeNote('Subnetting', 'A /24 network has 256 addresses', 'Save Note');

  expect(await screen.findByText('Private', { selector: '.badge' })).toBeTruthy();
  expect(screen.queryByText('Public', { selector: '.badge' })).toBeNull();
  expect(JSON.parse(findCall('POST')[1].body).is_public).toBe(false);
});

test('a note can be made public through the API', async () => {
  await renderNotes();
  fireEvent.click(screen.getByLabelText('Make this note public'));
  writeNote('Subnetting', 'A /24 network has 256 addresses', 'Save Note');

  expect(await screen.findByText('Public', { selector: '.badge' })).toBeTruthy();
  expect(JSON.parse(findCall('POST')[1].body).is_public).toBe(true);
  expect(screen.getByLabelText('Make this note public').checked).toBe(false);
});

test('editing a public note can make it private again through the API', async () => {
  await renderNotes();
  fireEvent.click(screen.getByLabelText('Make this note public'));
  writeNote('Subnetting', 'A /24 network has 256 addresses', 'Save Note');

  fireEvent.click(await screen.findByText('Edit'));
  expect(screen.getByLabelText('Make this note public').checked).toBe(true);
  fireEvent.click(screen.getByLabelText('Make this note public'));
  writeNote('Subnetting', 'A /24 network has 256 addresses', 'Update Note');

  expect(await screen.findByText('Private', { selector: '.badge' })).toBeTruthy();
  expect(screen.queryByText('Public', { selector: '.badge' })).toBeNull();
  expect(JSON.parse(findCall('PUT')[1].body).is_public).toBe(false);
});

test('a public note is still public after reloading the page', async () => {
  const firstPage = render(<Notes user={user} />);
  await waitFor(() => expect(fetch.mock.calls.length).toBe(2));
  fireEvent.click(screen.getByLabelText('Make this note public'));
  writeNote('Subnetting', 'A /24 network has 256 addresses', 'Save Note');
  expect(await screen.findByText('Public', { selector: '.badge' })).toBeTruthy();

  firstPage.unmount();
  render(<Notes user={user} />);

  expect(await screen.findByText('Subnetting')).toBeTruthy();
  expect(screen.getByText('Public', { selector: '.badge' })).toBeTruthy();
});

test('does not delete a note with a bad id', async () => {
  savedNotes = [{ note_id: '1/../../logout', title: 'Bad id note', content: 'should not be sent', study_status: 'learning', is_public: false, topic_id: null }];
  await renderNotes();
  expect(await screen.findByText('Bad id note')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

  expect(await screen.findByText('Could not delete the note.')).toBeTruthy();
  expect(findCall('DELETE')).toBe(null);
});

test('does not update a note with a bad id', async () => {
  savedNotes = [{ note_id: 'abc', title: 'Bad id note', content: 'should not be sent', study_status: 'learning', is_public: false, topic_id: null }];
  await renderNotes();
  expect(await screen.findByText('Bad id note')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
  fireEvent.click(screen.getByRole('button', { name: 'Update Note' }));

  expect(await screen.findByText('Could not save the note.')).toBeTruthy();
  expect(findCall('PUT')).toBe(null);
});

function searchServer(url, options) {
  if (url.startsWith('/notes/?')) {
    const params = new URLSearchParams(url.split('?')[1]);
    const found = [];
    for (let i = 0; i < savedNotes.length; i++) {
      const note = savedNotes[i];
      let keep = true;
      if (params.get('search') !== null) {
        const text = (note.title + ' ' + note.content).toLowerCase();
        if (!text.includes(params.get('search').toLowerCase())) {
          keep = false;
        }
      }
      if (params.get('study_status') !== null && note.study_status !== params.get('study_status')) {
        keep = false;
      }
      if (params.get('topic_id') !== null && String(note.topic_id) !== params.get('topic_id')) {
        keep = false;
      }
      if (params.get('visibility') === 'public' && note.is_public !== true) {
        keep = false;
      }
      if (params.get('visibility') === 'private' && note.is_public === true) {
        keep = false;
      }
      if (keep) {
        found.push(note);
      }
    }
    return Promise.resolve({ json: () => Promise.resolve({ success: true, notes: found }) });
  }
  return fakeServer(url, options);
}

function lastNotesUrl() {
  let last = null;
  for (let i = 0; i < fetch.mock.calls.length; i++) {
    const url = fetch.mock.calls[i][0];
    if (url.startsWith('/notes/') && !fetch.mock.calls[i][1].method) {
      last = url;
    }
  }
  return last;
}

function addSearchNotes() {
  savedNotes = [
    { note_id: 1, title: 'Subnetting', content: 'A /24 has 256 addresses', study_status: 'learning', is_public: false, topic_id: null },
    { note_id: 2, title: 'Peering', content: 'Peering is not transitive', study_status: 'confident', is_public: true, topic_id: 3 },
  ];
  globalThis.fetch = vi.fn(searchServer);
}

async function changeFilter(label, value, hiddenTitle, shownTitle, expectedUrl) {
  addSearchNotes();
  await renderNotes();
  expect(await screen.findByText(hiddenTitle)).toBeTruthy();

  fireEvent.change(screen.getByLabelText(label), { target: { value: value } });

  await waitFor(() => expect(screen.queryByText(hiddenTitle)).toBe(null));
  expect(screen.getByText(shownTitle)).toBeTruthy();
  expect(lastNotesUrl()).toBe(expectedUrl);
}

test('searching sends the search text to the backend and shows the matches', async () => {
  await changeFilter('Search notes', 'transitive', 'Subnetting', 'Peering', '/notes/?search=transitive');
});

test('filters notes by study status through the API', async () => {
  await changeFilter('Filter by study status', 'confident', 'Subnetting', 'Peering', '/notes/?study_status=confident');
});

test('filters notes by public or private through the API', async () => {
  await changeFilter('Filter by public or private', 'private', 'Peering', 'Subnetting', '/notes/?visibility=private');
});

test('search text is encoded before it is sent', async () => {
  addSearchNotes();
  await renderNotes();

  fireEvent.change(screen.getByLabelText('Search notes'), { target: { value: 'a&b=c/../logout' } });

  await waitFor(() => expect(lastNotesUrl()).toBe('/notes/?search=a%26b%3Dc%2F..%2Flogout'));
});

test('the search box allows at most 200 characters', async () => {
  await renderNotes();

  expect(screen.getByLabelText('Search notes').getAttribute('maxLength')).toBe('200');
});

test('filters notes by exam and topic through the API', async () => {
  addSearchNotes();
  await renderNotes();
  expect(await screen.findByRole('option', { name: 'AWS' })).toBeTruthy();

  fireEvent.change(screen.getByLabelText('Filter by exam'), { target: { value: '1' } });
  await waitFor(() => expect(lastNotesUrl()).toBe('/notes/?exam_id=1'));

  fireEvent.change(screen.getByLabelText('Filter by topic'), { target: { value: '3' } });
  await waitFor(() => expect(lastNotesUrl()).toBe('/notes/?exam_id=1&topic_id=3'));
  expect(screen.queryByText('Subnetting')).toBe(null);
});

test('shows a message when no notes match the search', async () => {
  addSearchNotes();
  await renderNotes();

  fireEvent.change(screen.getByLabelText('Search notes'), { target: { value: 'kubernetes' } });

  expect(await screen.findByText('No notes match your search.')).toBeTruthy();
});

test('clear filters shows all the notes again', async () => {
  addSearchNotes();
  await renderNotes();
  fireEvent.change(screen.getByLabelText('Search notes'), { target: { value: 'transitive' } });
  fireEvent.change(screen.getByLabelText('Filter by study status'), { target: { value: 'confident' } });
  await waitFor(() => expect(screen.queryByText('Subnetting')).toBe(null));

  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));

  expect(await screen.findByText('Subnetting')).toBeTruthy();
  expect(lastNotesUrl()).toBe('/notes/');
  expect(screen.getByLabelText('Search notes').value).toBe('');
  expect(screen.queryByRole('button', { name: 'Clear filters' })).toBe(null);
});
