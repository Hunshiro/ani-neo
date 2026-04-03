import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <section className="center-card">
      <p className="eyebrow">404</p>
      <h1>That route does not exist.</h1>
      <p className="copy">
        The Vite frontend is wired, but this page was not part of the initial scaffold.
      </p>
      <Link className="soft-button" to="/">
        Return home
      </Link>
    </section>
  );
}
