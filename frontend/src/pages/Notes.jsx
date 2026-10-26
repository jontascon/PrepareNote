import { useState, useEffect } from 'react';

function Notes(props) {
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const authHeader = 'Token ' + props.user.token;

  useEffect(() => {
    async function loadNotes() {
      try {
        const response = await fetch('/notes/', {
          headers: { Authorization: authHeader },
        });
        const data = await response.json();

        if (data.success) {
          setNotes(data.notes);
        } else {
          setErrorMessage('Could not load your notes.');
        }
      } catch (error) {
        console.log(error);
        setErrorMessage('Could not connect to the server. Please try again later.');
      }
    }

    loadNotes();
  }, [authHeader]);

  function handleTitleChange(event) {
    setTitle(event.target.value);
  }

  function handleContentChange(event) {
    setContent(event.target.value);
  }

  function handleSearchChange(event) {
    setSearch(event.target.value);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (title === '' || content === '') {
      alert('Please add a title and some text for your note.');
      return;
    }

    let url = '/notes/';
    let method = 'POST';
    if (editingId !== null) {
      url = '/notes/' + editingId + '/';
      method = 'PUT';
    }

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({
          title: title,
          content: content,
        }),
      });
      const data = await response.json();

      if (data.success) {
        if (editingId === null) {
          setNotes(notes.concat(data.note));
        } else {
          const updatedNotes = [];
          for (let i = 0; i < notes.length; i++) {
            if (notes[i].note_id === editingId) {
              updatedNotes.push(data.note);
            } else {
              updatedNotes.push(notes[i]);
            }
          }
          setNotes(updatedNotes);
          setEditingId(null);
        }

        setTitle('');
        setContent('');
        setErrorMessage('');
      } else {
        setErrorMessage('Could not save the note: ' + data.error);
      }
    } catch (error) {
      console.log(error);
      setErrorMessage('Could not connect to the server. Please try again later.');
    }
  }

  function startEditing(note) {
    setTitle(note.title);
    setContent(note.content);
    setEditingId(note.note_id);
  }

  function cancelEditing() {
    setTitle('');
    setContent('');
    setEditingId(null);
  }

  async function deleteNote(id) {
    try {
      const response = await fetch('/notes/' + id + '/', {
        method: 'DELETE',
        headers: { Authorization: authHeader },
      });
      const data = await response.json();

      if (data.success) {
        const newNotes = [];
        for (let i = 0; i < notes.length; i++) {
          if (notes[i].note_id !== id) {
            newNotes.push(notes[i]);
          }
        }
        setNotes(newNotes);

        if (id === editingId) {
          cancelEditing();
        }
      } else {
        setErrorMessage('Could not delete the note.');
      }
    } catch (error) {
      console.log(error);
      setErrorMessage('Could not connect to the server. Please try again later.');
    }
  }

  const shownNotes = [];
  for (let i = 0; i < notes.length; i++) {
    const noteTitle = notes[i].title.toLowerCase();
    if (noteTitle.includes(search.toLowerCase())) {
      shownNotes.push(notes[i]);
    }
  }

  let message = '';
  if (notes.length === 0) {
    message = 'No notes yet. Write your first one!';
  } else if (shownNotes.length === 0) {
    message = 'No notes match your search.';
  }

  let formHeading = 'New Note';
  let saveButtonText = 'Save Note';
  let cancelButton = null;
  if (editingId !== null) {
    formHeading = 'Edit Note';
    saveButtonText = 'Update Note';
    cancelButton = (
      <button type="button" className="btn btn-secondary ms-2" onClick={cancelEditing}>
        Cancel
      </button>
    );
  }

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-md-5 mb-4">
          <h2 className="mb-3">{formHeading}</h2>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="title" className="form-label">Title</label>
              <input
                type="text"
                className="form-control"
                id="title"
                value={title}
                onChange={handleTitleChange}
              />
            </div>

            <div className="mb-3">
              <label htmlFor="content" className="form-label">Note</label>
              <textarea
                className="form-control"
                id="content"
                rows="8"
                value={content}
                onChange={handleContentChange}
              ></textarea>
            </div>

            <button type="submit" className="btn btn-primary">{saveButtonText}</button>
            {cancelButton}
          </form>
        </div>

        <div className="col-md-7">
          <h2 className="mb-3">My Notes</h2>

          <input
            type="text"
            className="form-control mb-3"
            placeholder="Search notes by title..."
            value={search}
            onChange={handleSearchChange}
          />

          <p className="text-danger">{errorMessage}</p>

          <p>{message}</p>

          {shownNotes.map((note) => (
            <div className="card mb-3" key={note.note_id}>
              <div className="card-body">
                <h5 className="card-title">{note.title}</h5>
                <p className="card-text note-text">{note.content}</p>
                <button
                  className="btn btn-sm btn-outline-primary me-2"
                  onClick={() => startEditing(note)}
                >
                  Edit
                </button>
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => deleteNote(note.note_id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Notes;
