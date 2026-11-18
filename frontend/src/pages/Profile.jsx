import { useState, useEffect } from 'react';

function Profile(props) {
  const [profile, setProfile] = useState(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const authHeader = 'Token ' + props.user.token;

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch('/profile/', {
          headers: { Authorization: authHeader },
        });
        const data = await response.json();

        if (data.success) {
          setProfile(data.profile);
          setUsername(data.profile.username);
          setEmail(data.profile.email);
        } else {
          setErrorMessage('Could not load your profile.');
        }
      } catch (error) {
        console.log(error);
        setErrorMessage('Could not connect to the server. Please try again later.');
      }
    }

    loadProfile();
  }, [authHeader]);

  function handleUsernameChange(event) {
    setUsername(event.target.value);
  }

  function handleEmailChange(event) {
    setEmail(event.target.value);
  }

  function handleCurrentPasswordChange(event) {
    setCurrentPassword(event.target.value);
  }

  function handleNewPasswordChange(event) {
    setNewPassword(event.target.value);
  }

  function handleConfirmPasswordChange(event) {
    setConfirmPassword(event.target.value);
  }

  async function saveProfile(event) {
    event.preventDefault();
    setProfileMessage('');

    if (username.trim() === '' || email.trim() === '') {
      setProfileError('Please enter a username and an email.');
      return;
    }
    if (username.length > 150) {
      setProfileError('Username must be 150 characters or fewer.');
      return;
    }
    if (!/^[\w.@+-]+$/.test(username.trim())) {
      setProfileError('Username can only use letters, numbers and @ . + - _');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setProfileError('Please enter a valid email address.');
      return;
    }

    try {
      const response = await fetch('/profile/', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({ username: username.trim(), email: email.trim() }),
      });
      const data = await response.json();

      if (data.success) {
        setProfile(data.profile);
        setUsername(data.profile.username);
        setEmail(data.profile.email);
        setProfileError('');
        setProfileMessage('Your profile was saved.');
        props.onUserChange({
          ...props.user,
          username: data.profile.username,
          email: data.profile.email,
        });
      } else {
        setProfileError('Could not save your profile: ' + data.error);
      }
    } catch (error) {
      console.log(error);
      setProfileError('Could not connect to the server. Please try again later.');
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    setPasswordMessage('');

    if (currentPassword === '' || newPassword === '' || confirmPassword === '') {
      setPasswordError('Please fill in all three password boxes.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('The new passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Your new password must be at least 8 characters.');
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError('Your new password must be different from your current password.');
      return;
    }

    try {
      const response = await fetch('/profile/password/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      const data = await response.json();

      if (data.success) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordError('');
        setPasswordMessage('Your password was changed.');
        props.onUserChange({ ...props.user, token: data.token });
      } else {
        setPasswordError('Could not change your password: ' + data.error);
      }
    } catch (error) {
      console.log(error);
      setPasswordError('Could not connect to the server. Please try again later.');
    }
  }

  if (profile === null) {
    let loadingMessage = 'Loading your profile...';
    if (errorMessage !== '') {
      loadingMessage = errorMessage;
    }
    return (
      <div className="container mt-4">
        <h2 className="mb-3">My Profile</h2>
        <p>{loadingMessage}</p>
      </div>
    );
  }

  let role = 'Student';
  if (profile.is_moderator) {
    role = 'Moderator';
  }

  return (
    <div className="container mt-4">
      <h2 className="mb-3">My Profile</h2>

      <div className="row">
        <div className="col-md-4 mb-4">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">{profile.username}</h5>
              <p className="card-text mb-1">{profile.email}</p>
              <p className="card-text mb-1">{'Role: ' + role}</p>
              <p className="card-text mb-1">{'Member since ' + profile.date_joined}</p>
              <p className="card-text">
                {'Notes: ' + profile.note_count + ' (' + profile.public_note_count + ' public)'}
              </p>
            </div>
          </div>
        </div>

        <div className="col-md-4 mb-4">
          <h4 className="mb-3">Edit Profile</h4>
          <form onSubmit={saveProfile} noValidate>
            <div className="mb-3">
              <label htmlFor="profile-username" className="form-label">Username</label>
              <input
                type="text"
                className="form-control"
                id="profile-username"
                maxLength="150"
                value={username}
                onChange={handleUsernameChange}
              />
            </div>
            <div className="mb-3">
              <label htmlFor="profile-email" className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                id="profile-email"
                maxLength="254"
                value={email}
                onChange={handleEmailChange}
              />
            </div>
            <p className="text-danger">{profileError}</p>
            <p className="text-success">{profileMessage}</p>
            <button type="submit" className="btn btn-primary">Save Profile</button>
          </form>
        </div>

        <div className="col-md-4 mb-4">
          <h4 className="mb-3">Change Password</h4>
          <form onSubmit={changePassword}>
            <div className="mb-3">
              <label htmlFor="current-password" className="form-label">Current password</label>
              <input
                type="password"
                className="form-control"
                id="current-password"
                value={currentPassword}
                onChange={handleCurrentPasswordChange}
              />
            </div>
            <div className="mb-3">
              <label htmlFor="new-password" className="form-label">New password</label>
              <input
                type="password"
                className="form-control"
                id="new-password"
                value={newPassword}
                onChange={handleNewPasswordChange}
              />
              <div className="form-text">At least 8 characters, and not a common or all-number password.</div>
            </div>
            <div className="mb-3">
              <label htmlFor="confirm-password" className="form-label">Confirm new password</label>
              <input
                type="password"
                className="form-control"
                id="confirm-password"
                value={confirmPassword}
                onChange={handleConfirmPasswordChange}
              />
            </div>
            <p className="text-danger">{passwordError}</p>
            <p className="text-success">{passwordMessage}</p>
            <button type="submit" className="btn btn-primary">Change Password</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Profile;
