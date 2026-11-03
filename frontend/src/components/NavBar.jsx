function NavBar(props) {
  let pageButtons = null;
  let rightSide = null;

  function pageButton(name, label) {
    let className = 'btn btn-sm btn-outline-light me-2';
    let current = null;
    if (props.page === name) {
      className = 'btn btn-sm btn-light me-2';
      current = 'page';
    }

    return (
      <button className={className} aria-current={current} onClick={() => props.onChangePage(name)}>
        {label}
      </button>
    );
  }

  if (props.user !== null) {
    let moderatorLabel = null;
    if (props.user.isModerator) {
      moderatorLabel = <span className="badge bg-warning text-dark me-2">Moderator</span>;
    }

    if (props.onChangePage) {
      pageButtons = (
        <div>
          {pageButton('my-notes', 'My Notes')}
          {pageButton('public-notes', 'Public Notes')}
        </div>
      );
    }

    rightSide = (
      <div>
        {moderatorLabel}
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
        {pageButtons}
        {rightSide}
      </div>
    </nav>
  );
}

export default NavBar;
