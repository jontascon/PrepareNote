import { useState } from 'react';

function Notes() {
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);

  function handleTitleChange(event) {
    setTitle(event.target.value);
  }

  function handleContentChange(event) {
    setContent(event.target.value);
  }

  function handleSearchChange(event) {
    setSearch(event.target.value);
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (title === '' || content === '') {
      alert('Please add a title and some text for your note.');
      return;
    }

    if (editingId === null) {
      const newNote = {
        id: Date.now(),
        title: title,
        content: content,
      };
      setNotes(notes.concat(newNote));
    } else {
      const updatedNotes = [];
      for (let i = 0; i < notes.length; i++) {
        if (notes[i].id === editingId) {
          updatedNotes.push({ id: notes[i].id, title: title, content: content });
        } else {
          updatedNotes.push(notes[i]);
        }
      }
      setNotes(updatedNotes);
      setEditingId(null);
    }

    setTitle('');
    setContent('');
  }

  function startEditing(note) {
    setTitle(note.title);
    setContent(note.content);
    setEditingId(note.id);
  }

  function cancelEditing() {
    setTitle('');
    setContent('');
    setEditingId(null);
  }

  function deleteNote(id) {
    const newNotes = [];
    for (let i = 0; i < notes.length; i++) {
      if (notes[i].id !== id) {
        newNotes.push(notes[i]);
      }
    }
    setNotes(newNotes);

    if (id === editingId) {
      cancelEditing();
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

          <p>{message}</p>

          {shownNotes.map((note) => (
            <div className="card mb-3" key={note.id}>
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
                  onClick={() => deleteNote(note.id)}
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
