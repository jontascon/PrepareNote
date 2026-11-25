import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import FavoriteContributors from './FavoriteContributors.jsx';

const user = { id: 1, username: 'student1', token: 'abc123' };

const favoriteContributors = [
  {
    id: 2,
    username: 'student2',
  },
  {
    id: 3,
    username: 'student3',
  },
];

const publicNotes = [
  {
    note_id: 9,
    title: 'Algebra Review',
    content: 'Review quadratic equations.',
    topic_name: 'Math > Algebra',
  },
];

beforeEach(() => {
  vi.restoreAllMocks();
});

function favoriteContributorsServer(contributors = favoriteContributors) {
  return vi.fn((url, options = {}) => {
    if (url === '/contributors/favorites/') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          contributors,
        }),
      });
    }

    if (
      url === '/contributors/2/favorite/' &&
      options.method === 'DELETE'
    ) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
        }),
      });
    }

    if (url === '/contributors/2/notes/') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          contributor: contributors[0],
          notes: publicNotes,
        }),
      });
    }

    return Promise.resolve({
      ok: false,
      json: () => Promise.resolve({
        success: false,
        error: 'Not found.',
      }),
    });
  });
}

test('loads favorite contributors with token authentication', async () => {
  const mockFetch = favoriteContributorsServer();
  vi.stubGlobal('fetch', mockFetch);

  render(<FavoriteContributors user={user} />);

  expect(await screen.findByText('student2')).toBeTruthy();
  expect(screen.getByText('student3')).toBeTruthy();

  expect(mockFetch).toHaveBeenCalledWith(
    '/contributors/favorites/',
    expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: 'Token abc123',
      }),
    }),
  );
});

test('shows a message when there are no favorite contributors', async () => {
  const mockFetch = favoriteContributorsServer([]);
  vi.stubGlobal('fetch', mockFetch);

  render(<FavoriteContributors user={user} />);

  await waitFor(() => {
    expect(screen.getByText(/you have not saved any favorite contributors yet/i)).toBeTruthy();
  });
});

test('displays public notes for a selected contributor', async () => {
  const mockFetch = favoriteContributorsServer();
  vi.stubGlobal('fetch', mockFetch);

  render(<FavoriteContributors user={user} />);

  expect(await screen.findByText('student2')).toBeTruthy();

  const viewButtons = screen.getAllByRole('button', {
    name: 'View Public Notes',
  });

  fireEvent.click(viewButtons[0]);

  expect(await screen.findByText('Algebra Review')).toBeTruthy();
  expect(screen.getByText('Review quadratic equations.')).toBeTruthy();

  expect(mockFetch).toHaveBeenCalledWith(
    '/contributors/2/notes/',
    expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: 'Token abc123',
      }),
    }),
  );
});

test('removes a favorite contributor', async () => {
  const mockFetch = favoriteContributorsServer();
  vi.stubGlobal('fetch', mockFetch);

  render(<FavoriteContributors user={user} />);

  expect(await screen.findByText('student2')).toBeTruthy();

  const removeButtons = screen.getAllByRole('button', {
    name: 'Remove Favorite',
  });

  fireEvent.click(removeButtons[0]);

  await waitFor(() => {
    expect(screen.queryByText('student2')).toBeNull();
  });

  expect(screen.getByText('student3')).toBeTruthy();

  expect(mockFetch).toHaveBeenCalledWith(
    '/contributors/2/favorite/',
    expect.objectContaining({
      method: 'DELETE',
      headers: expect.objectContaining({
        Authorization: 'Token abc123',
      }),
    }),
  );
});

test('shows an error when favorite contributors cannot be loaded', async () => {
  const mockFetch = vi.fn(() => Promise.reject(new Error('Failed to fetch')));
  vi.stubGlobal('fetch', mockFetch);

  render(<FavoriteContributors user={user} />);

expect(
  await screen.findByText(/could not connect to the server/i)
).toBeTruthy();
});