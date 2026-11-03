import { useState, useEffect } from 'react';

function PublicNotes(props) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const authHeader = 'Token ' + props.user.token;

  useEffect(() => {
    async function loadPublicNotes() {
      try {
        const response = await fetch('/notes/public/', {
          headers: { Authorization: authHeader },
        });
        const data = await response.json();

        if (data.success) {
          setNotes(data.notes);
        } else {
          setErrorMessage('Could not load public notes.');
        }
      } catch (error) {
        console.log(error);
        setErrorMessage('Could not connect to the server. Please try again later.');
      }
      setLoading(false);
    }

    loadPublicNotes();
  }, [authHeader]);

  function showTopic(note) {
    if (note.topic_name) {
      return <p className="card-subtitle text-muted small mb-2">{note.topic_name}</p>;
    }
    return null;
  }

  let message = '';
  if (loading) {
    message = 'Loading public notes...';
  } else if (errorMessage === '' && notes.length === 0) {
    message = 'No public notes yet. Check back later!';
  }

  return (
    <div className="container mt-4">
      <h2 className="mb-1">Public Notes</h2>
      <p className="text-muted">Notes that other students have shared.</p>

      <p className="text-danger">{errorMessage}</p>

      <p>{message}</p>

      {notes.map((note) => (
        <div className="card mb-3" key={note.note_id}>
          <div className="card-body">
            <h5 className="card-title">{note.title}</h5>
            {showTopic(note)}
            <p className="small mb-2">{'Shared by ' + note.username}</p>
            <p className="card-text note-text">{note.content}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default PublicNotes;
