import { useState } from 'react';

function SignUp() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  function handleUsernameChange(event) {
    setUsername(event.target.value);
  }

  function handleEmailChange(event) {
    setEmail(event.target.value);
  }

  function handlePasswordChange(event) {
    setPassword(event.target.value);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (username === '' || email === '' || password === '') {
      setMessage('Please fill in all the fields.');
      return;
    }

    try {
      const response = await fetch('/createUser/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username,
          email: email,
          password: password,
        }),
      });
      const data = await response.json();

      if (data.success) {
        setMessage('Account created for ' + username + ' (' + email + '). You can log in now.');
        setUsername('');
        setEmail('');
        setPassword('');
      } else {
        setMessage('Could not create account: ' + data.error);
      }
    } catch (error) {
      console.log(error);
      setMessage('Could not reach the server. Is the Django backend running?');
    }
  }

  return (
    <div className="card">
      <div className="card-body">
        <h2 className="mb-3">Create Account</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="username" className="form-label">Username</label>
            <input
              type="text"
              className="form-control"
              id="username"
              value={username}
              onChange={handleUsernameChange}
            />
          </div>

          <div className="mb-3">
            <label htmlFor="email" className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              id="email"
              value={email}
              onChange={handleEmailChange}
            />
          </div>

          <div className="mb-3">
            <label htmlFor="password" className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              id="password"
              value={password}
              onChange={handlePasswordChange}
            />
          </div>

          <button type="submit" className="btn btn-primary">Sign Up</button>
        </form>

        <p className="mt-3 mb-0">{message}</p>
      </div>
    </div>
  );
}

export default SignUp;
