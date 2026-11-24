import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import Bookmarks from './Bookmarks.jsx';

const user = { id: 1, username: 'student1', token: 'abc123' };

const savedNotes = [
  {
    note_id: 9,
    title: 'Algebra Review',
    username: 'student2',
    topic_name: 'Math > Algebra',
    content: 'Review quadratic equations.',
    source: 'Textbook',
    bookmarked: true,
  },
  {
    note_id: 10,
    title: 'Biology Review',
    username: 'student3',
    topic_name: 'Science > Biology',
    content: 'Review cell structures.',
    source: '',
    bookmarked: true,
  },
];

beforeEach(() => {
  vi.restoreAllMocks();
});

function bookmarkServer(notes = savedNotes) {
  return vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true, notes }),
    })
  );
}

test('loads bookmarks using token authentication', async () => {
  globalThis.fetch = bookmarkServer();

  render(<Bookmarks user={user} />);

  expect(await screen.findByText('Algebra Review')).toBeTruthy();

  expect(fetch).toHaveBeenCalledWith('/bookmarks/', {
    headers: { Authorization: 'Token abc123' },
  });
});

test('displays bookmarked notes', async () => {
  globalThis.fetch = bookmarkServer();

  render(<Bookmarks user={user} />);

  expect(await screen.findByText('Algebra Review')).toBeTruthy();
  expect(screen.getByText('Biology Review')).toBeTruthy();
  expect(screen.getByText('Review quadratic equations.')).toBeTruthy();
  expect(screen.getByText('By student2 | Math > Algebra')).toBeTruthy();
  expect(screen.getByText('Source: Textbook')).toBeTruthy();
  expect(screen.getAllByRole('button', { name: 'Remove Bookmark' })).toHaveLength(2);
});

test('shows a message when there are no bookmarks', async () => {
  globalThis.fetch = bookmarkServer([]);

  render(<Bookmarks user={user} />);

  expect(
    await screen.findByText('You have not bookmarked any notes yet.')
  ).toBeTruthy();
});

test('shows an error when bookmarks cannot be loaded', async () => {
  globalThis.fetch = vi.fn(() =>
    Promise.resolve({
      ok: false,
      json: () => Promise.resolve({
        success: false,
        error: 'Could not load bookmarks.',
      }),
    })
  );

  render(<Bookmarks user={user} />);

  expect(await screen.findByText('Could not load bookmarks.')).toBeTruthy();
});

test('removes a bookmark through the API', async () => {
  globalThis.fetch = vi.fn((url, options) => {
    if (options?.method === 'DELETE') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          bookmarked: false,
        }),
      });
    }

    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        notes: savedNotes,
      }),
    });
  });

  render(<Bookmarks user={user} />);

  const buttons = await screen.findAllByRole('button', {
    name: 'Remove Bookmark',
  });

  fireEvent.click(buttons[0]);

  await waitFor(() => {
    expect(screen.queryByText('Algebra Review')).toBeNull();
  });

  expect(screen.getByText('Biology Review')).toBeTruthy();

  expect(fetch).toHaveBeenCalledWith('/notes/9/bookmark/', {
    method: 'DELETE',
    headers: { Authorization: 'Token abc123' },
  });
});

test('shows an error when removing a bookmark fails', async () => {
  globalThis.fetch = vi.fn((url, options) => {
    if (options?.method === 'DELETE') {
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({
          success: false,
          error: 'Could not remove bookmark.',
        }),
      });
    }

    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        notes: savedNotes,
      }),
    });
  });

  render(<Bookmarks user={user} />);

  const buttons = await screen.findAllByRole('button', {
    name: 'Remove Bookmark',
  });

  fireEvent.click(buttons[0]);

  expect(await screen.findByText('Could not remove bookmark.')).toBeTruthy();
  expect(screen.getByText('Algebra Review')).toBeTruthy();
});