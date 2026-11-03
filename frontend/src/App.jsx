import { useState } from 'react';
import NavBar from './components/NavBar.jsx';
import SignUp from './components/SignUp.jsx';
import Login from './components/Login.jsx';
import Notes from './pages/Notes.jsx';
import PublicNotes from './pages/PublicNotes.jsx';
import './App.css';

function loadSavedUser() {
  const savedUser = localStorage.getItem('user');
  if (savedUser === null) {
    return null;
  }

  const user = JSON.parse(savedUser);
  if (user.token === undefined) {
    return null;
  }
  return user;
}

function App() {
  const [user, setUser] = useState(loadSavedUser());
  const [page, setPage] = useState('my-notes');

  function handleLogin(loggedInUser) {
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    setUser(loggedInUser);
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
  }

  return (
    <div>
      <NavBar user={user} page={page} onChangePage={setPage} onLogout={handleLogout} />
      {currentPage}
    </div>
  );
}

export default App;
