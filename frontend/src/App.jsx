import { useState } from 'react';
import NavBar from './components/NavBar.jsx';
import SignUp from './components/SignUp.jsx';
import Login from './components/Login.jsx';
import Notes from './pages/Notes.jsx';
import PublicNotes from './pages/PublicNotes.jsx';
import Bookmarks from './pages/Bookmarks.jsx';
import FavoriteContributors from './pages/FavoriteContributors.jsx';
import './App.css';

function cleanUser(user) {
  if (user === null || typeof user !== 'object') {
    return null;
  }
  if (typeof user.token !== 'string' || typeof user.username !== 'string') {
    return null;
  }

  const id = Number(user.id);
  const username = String(user.username);
  const email = String(user.email);
  const token = String(user.token);

  if (!Number.isInteger(id) || id < 1) {
    return null;
  }
  if (!/^[\w.@+-]{1,150}$/.test(username)) {
    return null;
  }
  if (!/^[A-Za-z0-9]{1,64}$/.test(token)) {
    return null;
  }

  let cleanEmail = '';
  if (email.length <= 254 && /^[^\s<>"']*$/.test(email)) {
    cleanEmail = email;
  }

  return {
    id: id,
    username: username,
    email: cleanEmail,
    isModerator: user.isModerator === true,
    token: token,
  };
}

function loadSavedUser() {
  const savedUser = localStorage.getItem('user');
  if (savedUser === null) {
    return null;
  }

  try {
    return cleanUser(JSON.parse(savedUser));
  } catch (error) {
    console.log(error);
    return null;
  }
}

function App() {
  const [user, setUser] = useState(loadSavedUser());
  const [page, setPage] = useState('my-notes');

  function handleLogin(loggedInUser) {
    const safeUser = cleanUser(loggedInUser);
    if (safeUser === null) {
      return;
    }

    localStorage.setItem('user', JSON.stringify(safeUser));
    setUser(safeUser);
    setPage('my-notes');
  }

  async function handleLogout() {
    try {
      await fetch('/logout/', {
        method: 'POST',
        headers: { Authorization: 'Token ' + user.token },
      });
    } catch (error) {
      console.log(error);
    }

    localStorage.removeItem('user');
    setUser(null);
  }

  if (user === null) {
    return (
      <div>
        <NavBar user={user} onLogout={handleLogout} />
        <div className="container mt-4">
          <div className="row">
            <div className="col-md-6 mb-4">
              <SignUp />
            </div>
            <div className="col-md-6 mb-4">
              <Login onLogin={handleLogin} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  let currentPage = <Notes user={user} />;
  if (page === 'public-notes') {
    currentPage = <PublicNotes user={user} />;
  } else if (page === 'bookmarks') {
    currentPage = <Bookmarks user={user} />;
  } else if (page === 'favorite-contributors') {
    currentPage = <FavoriteContributors user={user} />;
  }

  return (
    <div>
      <NavBar user={user} page={page} onChangePage={setPage} onLogout={handleLogout} />
      {currentPage}
    </div>
  );
}

export default App;
