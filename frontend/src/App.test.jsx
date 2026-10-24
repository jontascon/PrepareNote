import { render, screen } from '@testing-library/react';
import App from './App.jsx';

test('shows the PrepareNote name', () => {
  render(<App />);
  expect(screen.getByText('PrepareNote')).toBeTruthy();
});

test('shows the Create Account form', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Create Account' })).toBeTruthy();
});

test('shows a message when there are no notes', () => {
  render(<App />);
  expect(screen.getByText('No notes yet. Write your first one!')).toBeTruthy();
});
