import { useEffect, useState } from 'react';

function Bookmarks({ user }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [removingId, setRemovingId] = useState(null);
  const [removeError, setRemoveError] = useState('');

  useEffect(() => {
    async function loadBookmarks() {
      try {
        const response = await fetch('/bookmarks/', {
          headers: { Authorization: 'Token ' + user.token },
        });
        const data = await response.json();

        if (response.ok && data.success) {
          setNotes(data.notes);
        } else {
          setErrorMessage(data.error || 'Could not load bookmarks.');
        }
      } catch (error) {
        console.log(error);
        setErrorMessage('Could not connect to the server. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    loadBookmarks();
  }, [user.token]);

  async function removeBookmark(noteId) {
    if (removingId !== null) {
      return;
    }

    setRemovingId(noteId);
    setRemoveError('');

    try {
      const response = await fetch(`/notes/${noteId}/bookmark/`, {
        method: 'DELETE',
        headers: { Authorization: 'Token ' + user.token },
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setNotes((currentNotes) =>
          currentNotes.filter((note) => note.note_id !== noteId)
        );
      } else {
        setRemoveError(data.error || 'Could not remove bookmark.');
      }
    } catch (error) {
      console.log(error);
      setRemoveError('Could not connect to the server. Please try again later.');
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="container mt-4">
      <h2>My Bookmarks</h2>

      {loading && <p>Loading bookmarks...</p>}
      {errorMessage && <p className="text-danger">{errorMessage}</p>}
      {removeError && <p className="text-danger">{removeError}</p>}
      {!loading && !errorMessage && notes.length === 0 && (
        <p>You have not bookmarked any notes yet.</p>
      )}

      {!loading && !errorMessage && notes.map((note) => (
        <div className="card mb-3" key={note.note_id}>
          <div className="card-body">
            <h5 className="card-title">{note.title}</h5>
            <p className="card-subtitle mb-2 text-muted">
              By {note.username} | {note.topic_name}
            </p>
            {note.source && (
              <p className="card-text">
                Source: {note.source}
              </p>
            )}
            <p className="card-text note-text">{note.content}</p>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={() => removeBookmark(note.note_id)}
              disabled={removingId !== null}
            >
              {removingId === note.note_id ? 'Removing...' : 'Remove Bookmark'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default Bookmarks;