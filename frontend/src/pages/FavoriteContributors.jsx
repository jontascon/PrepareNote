import { useEffect, useState } from 'react';

function FavoriteContributors({ user }) {
  const [contributors, setContributors] = useState([]);
  const [selectedContributor, setSelectedContributor] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [notesError, setNotesError] = useState('');
  const [removingId, setRemovingId] = useState(null);
  const authHeader = `Token ${user.token}`;

  useEffect(() => {
    async function loadFavoriteContributors() {
      try {
        const response = await fetch('/contributors/favorites/', {
          headers: { Authorization: authHeader },
        });
        const data = await response.json();

        if (response.ok && data.success) {
          setContributors(data.contributors);
        } else {
          setErrorMessage('Could not load favorite contributors.');
        }
      } catch (error) {
        console.log(error);
        setErrorMessage('Could not connect to the server.');
      } finally {
        setLoading(false);
      }
    }

    void loadFavoriteContributors();
  }, [authHeader]);

  async function loadContributorNotes(contributor) {
    setSelectedContributor(contributor);
    setNotes([]);
    setNotesError('');
    setLoadingNotes(true);

    try {
      const response = await fetch(
        `/contributors/${contributor.id}/notes/`,
        {
          headers: { Authorization: authHeader },
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setNotes(data.notes);
      } else {
        setNotesError('Could not load contributor notes.');
      }
    } catch (error) {
      console.log(error);
      setNotesError('Could not connect to the server.');
    } finally {
      setLoadingNotes(false);
    }
  }

  async function removeFavoriteContributor(contributorId) {
    if (removingId !== null) {
      return;
    }

    setRemovingId(contributorId);
    setErrorMessage('');

    try {
      const response = await fetch(
        `/contributors/${contributorId}/favorite/`,
        {
          method: 'DELETE',
          headers: { Authorization: authHeader },
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setContributors((currentContributors) =>
          currentContributors.filter(
            (contributor) => contributor.id !== contributorId
          )
        );

        if (selectedContributor?.id === contributorId) {
          setSelectedContributor(null);
          setNotes([]);
          setNotesError('');
        }
      } else {
        setErrorMessage(
          data.error || 'Could not remove favorite contributor.'
        );
      }
    } catch (error) {
      console.log(error);
      setErrorMessage('Could not connect to the server.');
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="container mt-4">
      <h2>My Favorite Contributors</h2>

      {loading && <p>Loading favorite contributors...</p>}

      {errorMessage && (
        <p className="text-danger">{errorMessage}</p>
      )}

      {!loading && !errorMessage && contributors.length === 0 && (
        <p>You have not saved any favorite contributors yet.</p>
      )}

      {!loading && !errorMessage && contributors.length > 0 && (
        <div className="row">
          {contributors.map((contributor) => (
            <div className="col-md-6 mb-3" key={contributor.id}>
              <div className="card">
                <div className="card-body">
                  <h5 className="card-title">
                    {contributor.username}
                  </h5>

                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      void loadContributorNotes(contributor);
                    }}
                  >
                    View Public Notes
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm ms-2"
                    onClick={() => {
                      void removeFavoriteContributor(contributor.id);
                    }}
                    disabled={removingId !== null}
                  >
                    {removingId === contributor.id
                      ? 'Removing...'
                      : 'Remove Favorite'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedContributor && (
        <div className="mt-4">
          <h3>{selectedContributor.username}'s Public Notes</h3>

          {loadingNotes && <p>Loading notes...</p>}

          {notesError && (
            <p className="text-danger">{notesError}</p>
          )}

          {!loadingNotes && !notesError && notes.length === 0 && (
            <p>This contributor has no public notes.</p>
          )}

          {!loadingNotes && !notesError && notes.length > 0 && (
            <div className="row">
              {notes.map((note) => (
                <div className="col-md-6 mb-3" key={note.note_id}>
                  <div className="card">
                    <div className="card-body">
                      <h5 className="card-title">{note.title}</h5>

                      <p className="card-text">{note.content}</p>

                      <p className="small text-muted">
                        Topic: {note.topic_name}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FavoriteContributors;