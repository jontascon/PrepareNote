import { useState, useEffect } from 'react';

function PublicNotes(props) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [reportingId, setReportingId] = useState(null);
  const [reason, setReason] = useState('');
  const [reportError, setReportError] = useState('');
  const [thanksMessage, setThanksMessage] = useState('');

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

  function handleReasonChange(event) {
    setReason(event.target.value);
  }

  function startReporting(id) {
    setReportingId(id);
    setReason('');
    setReportError('');
    setThanksMessage('');
  }

  function cancelReporting() {
    setReportingId(null);
    setReason('');
    setReportError('');
  }

  async function sendReport(event) {
    event.preventDefault();

    if (reason.trim() === '') {
      setReportError('Please tell us why you are reporting this note.');
      return;
    }

    try {
      const response = await fetch('/notes/' + reportingId + '/report/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({ reason: reason }),
      });
      const data = await response.json();

      if (data.success) {
        const updatedNotes = [];
        for (let i = 0; i < notes.length; i++) {
          if (notes[i].note_id === reportingId) {
            updatedNotes.push({ ...notes[i], reported: true });
          } else {
            updatedNotes.push(notes[i]);
          }
        }
        setNotes(updatedNotes);
        setReportingId(null);
        setReason('');
        setReportError('');
        setThanksMessage('Thanks for reporting. A moderator will review this note.');
      } else {
        setReportError('Could not report the note: ' + data.error);
      }
    } catch (error) {
      console.log(error);
      setReportError('Could not connect to the server. Please try again later.');
    }
  }

  function showTopic(note) {
    if (note.topic_name) {
      return <p className="card-subtitle text-muted small mb-2">{note.topic_name}</p>;
    }
    return null;
  }

  function showReport(note) {
    if (note.reported === true) {
      return <span className="badge bg-danger">Reported</span>;
    }

    if (note.note_id === reportingId) {
      return (
        <form onSubmit={sendReport}>
          <label htmlFor="report-reason" className="form-label">Why are you reporting this note?</label>
          <textarea
            className="form-control mb-2"
            id="report-reason"
            rows="3"
            maxLength="500"
            value={reason}
            onChange={handleReasonChange}
          ></textarea>
          <p className="text-danger small">{reportError}</p>
          <button type="submit" className="btn btn-sm btn-danger">Send Report</button>
          <button type="button" className="btn btn-sm btn-secondary ms-2" onClick={cancelReporting}>
            Cancel
          </button>
        </form>
      );
    }

    return (
      <button className="btn btn-sm btn-outline-danger" onClick={() => startReporting(note.note_id)}>
        Report
      </button>
    );
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
      <p className="text-success">{thanksMessage}</p>

      <p>{message}</p>

      {notes.map((note) => (
        <div className="card mb-3" key={note.note_id}>
          <div className="card-body">
            <h5 className="card-title">{note.title}</h5>
            {showTopic(note)}
            <p className="small mb-2">{'Shared by ' + note.username}</p>
            <p className="card-text note-text">{note.content}</p>
            {showReport(note)}
          </div>
        </div>
      ))}
    </div>
  );
}

export default PublicNotes;
