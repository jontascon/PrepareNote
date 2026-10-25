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

test('new notes start as Learning', () => {
  render(<Notes />);
  writeNote('Subnetting', 'A /24 network has 256 addresses');

  expect(screen.getByText('Learning', { selector: '.badge' })).toBeTruthy();
});

test('saves the study status picked for a note', () => {
  render(<Notes />);
  fireEvent.change(screen.getByLabelText('Study Status'), { target: { value: 'reviewing' } });
  writeNote('Subnetting', 'A /24 network has 256 addresses');

  expect(screen.getByText('Reviewing', { selector: '.badge' })).toBeTruthy();
  expect(screen.getByLabelText('Study Status').value).toBe('learning');
});

test('editing a note can change its study status', () => {
  render(<Notes />);
  writeNote('Subnetting', 'A /24 network has 256 addresses');

  fireEvent.click(screen.getByText('Edit'));
  expect(screen.getByLabelText('Study Status').value).toBe('learning');
  fireEvent.change(screen.getByLabelText('Study Status'), { target: { value: 'confident' } });
  writeNote('Subnetting', 'A /24 network has 256 addresses');

  expect(screen.getByText('Confident', { selector: '.badge' })).toBeTruthy();
  expect(screen.queryByText('Learning', { selector: '.badge' })).toBeNull();
});

test('shows how many notes are in each study status', () => {
  render(<Notes />);
  writeNote('Subnetting', 'A /24 network has 256 addresses');
  fireEvent.change(screen.getByLabelText('Study Status'), { target: { value: 'confident' } });
  writeNote('VPC Peering', 'Peering is not transitive');

  expect(screen.getByText('Learning: 1 | Reviewing: 0 | Confident: 1')).toBeTruthy();
});

test('new notes are private by default', () => {
  render(<Notes />);
  writeNote('Subnetting', 'A /24 network has 256 addresses');

  expect(screen.getByText('Private', { selector: '.badge' })).toBeTruthy();
  expect(screen.queryByText('Public', { selector: '.badge' })).toBeNull();
});

test('a note can be made public', () => {
  render(<Notes />);
  fireEvent.click(screen.getByLabelText('Make this note public'));
  writeNote('Subnetting', 'A /24 network has 256 addresses');

  expect(screen.getByText('Public', { selector: '.badge' })).toBeTruthy();
  expect(screen.getByLabelText('Make this note public').checked).toBe(false);
});

test('editing a public note can make it private again', () => {
  render(<Notes />);
  fireEvent.click(screen.getByLabelText('Make this note public'));
  writeNote('Subnetting', 'A /24 network has 256 addresses');

  fireEvent.click(screen.getByText('Edit'));
  expect(screen.getByLabelText('Make this note public').checked).toBe(true);
  fireEvent.click(screen.getByLabelText('Make this note public'));
  writeNote('Subnetting', 'A /24 network has 256 addresses');

  expect(screen.getByText('Private', { selector: '.badge' })).toBeTruthy();
  expect(screen.queryByText('Public', { selector: '.badge' })).toBeNull();
});
