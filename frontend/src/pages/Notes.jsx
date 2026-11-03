import { useState, useEffect } from 'react';

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

function Notes(props) {
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [studyStatus, setStudyStatus] = useState('learning');
  const [isPublic, setIsPublic] = useState(false);
  const [topicId, setTopicId] = useState('');
  const [topics, setTopics] = useState([]);
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

    async function loadTopics() {
      try {
        const response = await fetch('/exams/', {
          headers: { Authorization: authHeader },
        });
        const data = await response.json();

        if (data.success) {
          const topicList = [];
          for (let i = 0; i < data.exams.length; i++) {
            const exam = data.exams[i];
            for (let j = 0; j < exam.sections.length; j++) {
              const section = exam.sections[j];
              for (let k = 0; k < section.topics.length; k++) {
                const topic = section.topics[k];
                topicList.push({
                  id: topic.topic_id,
                  name: exam.name + ' > ' + section.name + ' > ' + topic.name,
                });
              }
            }
          }
          setTopics(topicList);
        }
      } catch (error) {
        console.log(error);
      }
    }

    loadNotes();
    loadTopics();
  }, [authHeader]);

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

  function handleTopicChange(event) {
    setTopicId(event.target.value);
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

    let topicToSend = null;
    if (topicId !== '') {
      topicToSend = Number(topicId);
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
          study_status: studyStatus,
          is_public: isPublic,
          topic_id: topicToSend,
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
        setStudyStatus('learning');
        setIsPublic(false);
        setTopicId('');
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
    setStudyStatus(findStudyStatus(note.study_status).value);
    setIsPublic(note.is_public === true);
    if (note.topic_id) {
      setTopicId(String(note.topic_id));
    } else {
      setTopicId('');
    }
    setEditingId(note.note_id);
  }

  function cancelEditing() {
    setTitle('');
    setContent('');
    setStudyStatus('learning');
    setIsPublic(false);
    setTopicId('');
    setEditingId(null);
  }

  function showTopic(note) {
    for (let i = 0; i < topics.length; i++) {
      if (topics[i].id === note.topic_id) {
        return <p className="card-subtitle text-muted small mb-2">{topics[i].name}</p>;
      }
    }
    return null;
  }

  function showVisibility(note) {
    if (note.is_public === true) {
      return <span className="badge mb-2 ms-2 bg-primary">Public</span>;
    }
    return <span className="badge mb-2 ms-2 bg-dark">Private</span>;
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

  const statusCounts = { learning: 0, reviewing: 0, confident: 0 };
  for (let i = 0; i < notes.length; i++) {
    const noteStatus = findStudyStatus(notes[i].study_status).value;
    statusCounts[noteStatus] = statusCounts[noteStatus] + 1;
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

            <div className="mb-3">
              <label htmlFor="topic" className="form-label">Topic</label>
              <select
                className="form-select"
                id="topic"
                value={topicId}
                onChange={handleTopicChange}
              >
                <option value="">No topic</option>
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>{topic.name}</option>
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

          <p className="text-danger">{errorMessage}</p>

          {progress}

          <p>{message}</p>

          {shownNotes.map((note) => (
            <div className="card mb-3" key={note.note_id}>
              <div className="card-body">
                <h5 className="card-title">{note.title}</h5>
                {showTopic(note)}
                <span className={'badge mb-2 ' + findStudyStatus(note.study_status).badge}>
                  {findStudyStatus(note.study_status).label}
                </span>
                {showVisibility(note)}
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
