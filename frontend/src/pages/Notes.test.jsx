import { render, screen, fireEvent } from '@testing-library/react';
import Notes from './Notes.jsx';

function writeNote(title, content) {
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: title } });
  fireEvent.change(screen.getByLabelText('Note'), { target: { value: content } });
  fireEvent.click(screen.getByRole('button', { name: /Save Note|Update Note/ }));
}

test('adds a note to the list', () => {
  render(<Notes />);
  writeNote('Subnetting', 'A /24 network has 256 addresses');

  expect(screen.getByText('Subnetting')).toBeTruthy();
});

test('edits a note', () => {
  render(<Notes />);
  writeNote('Subneting', 'typo in the title');

  fireEvent.click(screen.getByText('Edit'));
  expect(screen.getByRole('heading', { name: 'Edit Note' })).toBeTruthy();
  expect(screen.getByLabelText('Title').value).toBe('Subneting');

  writeNote('Subnetting', 'fixed the title');

  expect(screen.getByText('Subnetting')).toBeTruthy();
  expect(screen.getByText('fixed the title')).toBeTruthy();
  expect(screen.queryByText('Subneting')).toBeNull();
  expect(screen.getByRole('heading', { name: 'New Note' })).toBeTruthy();
});

test('cancel stops editing without changing the note', () => {
  render(<Notes />);
  writeNote('Subnetting', 'A /24 network has 256 addresses');

  fireEvent.click(screen.getByText('Edit'));
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'something else' } });
  fireEvent.click(screen.getByText('Cancel'));

  expect(screen.getByText('Subnetting')).toBeTruthy();
  expect(screen.getByLabelText('Title').value).toBe('');
});

test('deletes a note', () => {
  render(<Notes />);
  writeNote('Subnetting', 'A /24 network has 256 addresses');

  fireEvent.click(screen.getByText('Delete'));

  expect(screen.queryByText('Subnetting')).toBeNull();
  expect(screen.getByText('No notes yet. Write your first one!')).toBeTruthy();
});
