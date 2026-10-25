import { useState } from 'react';
import NavBar from './components/NavBar.jsx';
import SignUp from './components/SignUp.jsx';
import Login from './components/Login.jsx';
import Notes from './pages/Notes.jsx';
import './App.css';

function App() {
  const [user, setUser] = useState(null);

  function handleLogin(loggedInUser) {
    setUser(loggedInUser);
  }

  function handleLogout() {
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

  return (
    <div>
      <NavBar user={user} onLogout={handleLogout} />
      <Notes />
    </div>
  );
}

export default App;
