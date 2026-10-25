function NavBar(props) {
  let rightSide = null;

  if (props.user !== null) {
    rightSide = (
      <div>
        <span className="navbar-text text-white me-3">
          {'Logged in as ' + props.user.username}
        </span>
        <button className="btn btn-outline-light btn-sm" onClick={props.onLogout}>
          Log Out
        </button>
      </div>
    );
  }

  return (
    <nav className="navbar navbar-dark bg-primary">
      <div className="container">
        <span className="navbar-brand">PrepareNote</span>
        {rightSide}
      </div>
    </nav>
  );
}

export default NavBar;
