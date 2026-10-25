import { useState } from 'react';

const studyStatuses = [
  { value: 'learning', label: 'Learning', badge: 'bg-secondary' },
  { value: 'reviewing', label: 'Reviewing', badge: 'bg-warning text-dark' },
  { value: 'confident', label: 'Confident', badge: 'bg-success' },
];

function findStudyStatus(value) {
  for (let i = 0; i < studyStatuses.length; i++) {
    if (studyStatuses[i].value === value) {
      return studyStatuses[i];
    }
  }
  return studyStatuses[0];
}

function Notes() {
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [studyStatus, setStudyStatus] = useState('learning');
  const [isPublic, setIsPublic] = useState(false);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);

  function handleTitleChange(event) {
    setTitle(event.target.value);
  }

  function handleContentChange(event) {
    setContent(event.target.value);
  }

  function handleStudyStatusChange(event) {
    setStudyStatus(event.target.value);
  }

  function handlePublicChange(event) {
    setIsPublic(event.target.checked);
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
        studyStatus: studyStatus,
        isPublic: isPublic,
      };
      setNotes(notes.concat(newNote));
    } else {
      const updatedNotes = [];
      for (let i = 0; i < notes.length; i++) {
        if (notes[i].id === editingId) {
          updatedNotes.push({
            id: notes[i].id,
            title: title,
            content: content,
            studyStatus: studyStatus,
            isPublic: isPublic,
          });
        } else {
          updatedNotes.push(notes[i]);
        }
      }
      setNotes(updatedNotes);
      setEditingId(null);
    }

    setTitle('');
    setContent('');
    setStudyStatus('learning');
    setIsPublic(false);
  }

  function startEditing(note) {
    setTitle(note.title);
    setContent(note.content);
    setStudyStatus(note.studyStatus);
    setIsPublic(note.isPublic);
    setEditingId(note.id);
  }

  function cancelEditing() {
    setTitle('');
    setContent('');
    setStudyStatus('learning');
    setIsPublic(false);
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

  const statusCounts = { learning: 0, reviewing: 0, confident: 0 };
  for (let i = 0; i < notes.length; i++) {
    statusCounts[notes[i].studyStatus] = statusCounts[notes[i].studyStatus] + 1;
  }

  let progress = null;
  if (notes.length > 0) {
    progress = (
      <p className="text-muted">
        {'Learning: ' + statusCounts.learning +
          ' | Reviewing: ' + statusCounts.reviewing +
          ' | Confident: ' + statusCounts.confident}
      </p>
    );
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

            <div className="mb-3">
              <label htmlFor="study-status" className="form-label">Study Status</label>
              <select
                className="form-select"
                id="study-status"
                value={studyStatus}
                onChange={handleStudyStatusChange}
              >
                {studyStatuses.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="form-check mb-3">
              <input
                type="checkbox"
                className="form-check-input"
                id="is-public"
                checked={isPublic}
                onChange={handlePublicChange}
              />
              <label htmlFor="is-public" className="form-check-label">
                Make this note public
              </label>
              <div className="form-text">Public notes can be viewed by other users. Private notes are only visible to you.</div>
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

          {progress}
          <p>{message}</p>

          {shownNotes.map((note) => (
            <div className="card mb-3" key={note.id}>
              <div className="card-body">
                <h5 className="card-title">{note.title}</h5>
                <span className={'badge mb-2 me-2 ' + findStudyStatus(note.studyStatus).badge}>
                  {findStudyStatus(note.studyStatus).label}
                </span>
                {note.isPublic ? (
                  <span className="badge mb-2 bg-primary">Public</span>
                ) : (
                  <span className="badge mb-2 bg-dark">Private</span>
                )}
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
