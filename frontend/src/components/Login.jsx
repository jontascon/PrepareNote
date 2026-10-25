import { useState } from 'react';

function Login(props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  function handleUsernameChange(event) {
    setUsername(event.target.value);
  }

  function handlePasswordChange(event) {
    setPassword(event.target.value);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (username === '' || password === '') {
      setMessage('Please enter your username and password.');
      return;
    }

    try {
      const response = await fetch('/getUser/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username,
          password: password,
        }),
      });
      const data = await response.json();

      if (data.success) {
        const user = {
          id: data.id,
          username: data.username,
          email: data.email,
        };
        props.onLogin(user);
      } else {
        setMessage(data.error);
      }
    } catch (error) {
      console.log(error);
      setMessage('Could not reach the server. Is the Django backend running?');
    }
  }

  return (
    <div className="card">
      <div className="card-body">
        <h2 className="mb-3">Log In</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="login-username" className="form-label">Username</label>
            <input
              type="text"
              className="form-control"
              id="login-username"
              value={username}
              onChange={handleUsernameChange}
            />
          </div>

          <div className="mb-3">
            <label htmlFor="login-password" className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              id="login-password"
              value={password}
              onChange={handlePasswordChange}
            />
          </div>

          <button type="submit" className="btn btn-primary">Log In</button>
        </form>

        <p className="mt-3 mb-0">{message}</p>
      </div>
    </div>
  );
}

export default Login;
