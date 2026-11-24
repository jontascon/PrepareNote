import { useState, useEffect } from 'react';

const studyStatuses = [
  { value: 'learning', label: 'Learning', badge: 'bg-secondary' },
  { value: 'reviewing', label: 'Reviewing', badge: 'bg-warning text-dark' },
  { value: 'confident', label: 'Confident', badge: 'bg-success' },
];

function toFilterId(value) {
  const id = Number(value);
  if (value !== '' && Number.isInteger(id) && id > 0) {
    return id;
  }
  return null;
}

function notesUrl(search, studyStatus, examId, topicId, visibility) {
  const parts = [];

  if (search.trim() !== '') {
    parts.push('search=' + encodeURIComponent(search.trim()));
  }

  for (let i = 0; i < studyStatuses.length; i++) {
    if (studyStatuses[i].value === studyStatus) {
      parts.push('study_status=' + encodeURIComponent(studyStatus));
    }
  }

  const exam = toFilterId(examId);
  if (exam !== null) {
    parts.push('exam_id=' + exam);
  }

  const topic = toFilterId(topicId);
  if (topic !== null) {
    parts.push('topic_id=' + topic);
  }

  if (visibility === 'public' || visibility === 'private') {
    parts.push('visibility=' + visibility);
  }

  if (parts.length === 0) {
    return '/notes/';
  }
  return '/notes/?' + parts.join('&');
}

function findStudyStatus(value) {
  for (let i = 0; i < studyStatuses.length; i++) {
    if (studyStatuses[i].value === value) {
      return studyStatuses[i];
    }
  }
  return studyStatuses[0];
}

function toNoteId(value) {
  const id = Number(value);
  if (Number.isInteger(id) && id > 0) {
    return id;
  }
  return null;
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
  const [filterExam, setFilterExam] = useState('');
  const [filterTopic, setFilterTopic] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterVisibility, setFilterVisibility] = useState('');
  const [exams, setExams] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const authHeader = 'Token ' + props.user.token;

  useEffect(() => {
    let ignore = false;

    async function loadNotes() {
      try {
        const url = notesUrl(search, filterStatus, filterExam, filterTopic, filterVisibility);
        const response = await fetch(url, {
          headers: { Authorization: authHeader },
        });
        const data = await response.json();

        if (ignore) {
          return;
        }
        if (data.success) {
          setNotes(data.notes);
          setErrorMessage('');
        } else {
          setErrorMessage('Could not load your notes.');
        }
      } catch (error) {
        console.log(error);
        if (!ignore) {
          setErrorMessage('Could not connect to the server. Please try again later.');
        }
      }
    }

    loadNotes();

    return () => {
      ignore = true;
    };
  }, [authHeader, search, filterStatus, filterExam, filterTopic, filterVisibility]);

  useEffect(() => {
    async function loadTopics() {
      try {
        const response = await fetch('/exams/', {
          headers: { Authorization: authHeader },
        });
        const data = await response.json();

        if (data.success) {
          const topicList = [];
          const examList = [];
          for (let i = 0; i < data.exams.length; i++) {
            const exam = data.exams[i];
            examList.push({ id: exam.exam_id, name: exam.name });
            for (let j = 0; j < exam.sections.length; j++) {
              const section = exam.sections[j];
              for (let k = 0; k < section.topics.length; k++) {
                const topic = section.topics[k];
                topicList.push({
                  id: topic.topic_id,
                  examId: exam.exam_id,
                  name: exam.name + ' > ' + section.name + ' > ' + topic.name,
                });
              }
            }
          }
          setTopics(topicList);
          setExams(examList);
        }
      } catch (error) {
        console.log(error);
      }
    }

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

  function handleFilterExamChange(event) {
    setFilterExam(event.target.value);
    setFilterTopic('');
  }

  function handleFilterTopicChange(event) {
    setFilterTopic(event.target.value);
  }

  function handleFilterStatusChange(event) {
    setFilterStatus(event.target.value);
  }

  function handleFilterVisibilityChange(event) {
    setFilterVisibility(event.target.value);
  }

  function clearFilters() {
    setSearch('');
    setFilterExam('');
    setFilterTopic('');
    setFilterStatus('');
    setFilterVisibility('');
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
      const noteId = toNoteId(editingId);
      if (noteId === null) {
        setErrorMessage('Could not save the note.');
        return;
      }
      url = '/notes/' + encodeURIComponent(noteId) + '/';
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
    const noteId = toNoteId(id);
    if (noteId === null) {
      setErrorMessage('Could not delete the note.');
      return;
    }

    try {
      const response = await fetch('/notes/' + encodeURIComponent(noteId) + '/', {
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

  let filtering = false;
  if (search.trim() !== '' || filterExam !== '' || filterTopic !== '' || filterStatus !== '' || filterVisibility !== '') {
    filtering = true;
  }

  const filterTopics = [];
  for (let i = 0; i < topics.length; i++) {
    if (filterExam === '' || String(topics[i].examId) === filterExam) {
      filterTopics.push(topics[i]);
    }
  }

  let clearButton = null;
  if (filtering) {
    clearButton = (
      <button type="button" className="btn btn-sm btn-outline-secondary mt-2" onClick={clearFilters}>
        Clear filters
      </button>
    );
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
    if (filtering) {
      message = 'No notes match your search.';
    } else {
      message = 'No notes yet. Write your first one!';
    }
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

          <div className="mb-3">
            <input
              type="text"
              className="form-control mb-2"
              placeholder="Search notes by title or text..."
              aria-label="Search notes"
              maxLength="200"
              value={search}
              onChange={handleSearchChange}
            />
            <div className="row g-2">
              <div className="col-sm-6 col-xl-3">
                <select
                  className="form-select form-select-sm"
                  aria-label="Filter by exam"
                  value={filterExam}
                  onChange={handleFilterExamChange}
                >
                  <option value="">All exams</option>
                  {exams.map((exam) => (
                    <option key={exam.id} value={exam.id}>{exam.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-sm-6 col-xl-3">
                <select
                  className="form-select form-select-sm"
                  aria-label="Filter by topic"
                  value={filterTopic}
                  onChange={handleFilterTopicChange}
                >
                  <option value="">All topics</option>
                  {filterTopics.map((topic) => (
                    <option key={topic.id} value={topic.id}>{topic.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-sm-6 col-xl-3">
                <select
                  className="form-select form-select-sm"
                  aria-label="Filter by study status"
                  value={filterStatus}
                  onChange={handleFilterStatusChange}
                >
                  <option value="">All statuses</option>
                  {studyStatuses.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="col-sm-6 col-xl-3">
                <select
                  className="form-select form-select-sm"
                  aria-label="Filter by public or private"
                  value={filterVisibility}
                  onChange={handleFilterVisibilityChange}
                >
                  <option value="">Public and private</option>
                  <option value="public">Public only</option>
                  <option value="private">Private only</option>
                </select>
              </div>
            </div>
            {clearButton}
          </div>

          <p className="text-danger">{errorMessage}</p>

          {progress}

          <p>{message}</p>

          {notes.map((note) => (
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
