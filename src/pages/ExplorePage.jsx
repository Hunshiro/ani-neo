import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { searchAnime } from '../services/api';

const NAV_ITEMS = [
  { label: 'Explore', to: '/explore' },
  { label: 'Series', to: '/explore' },
  { label: 'Movies', to: '/explore' },
  { label: 'My List', to: '/explore' },
];
const SIDEBAR_ITEMS = [
  { label: 'Home', icon: 'home', to: '/' },
  { label: 'Trending', icon: 'bolt', to: '/explore', accent: true },
  { label: 'Library', icon: 'video_library', to: '/explore' },
  { label: 'Schedule', icon: 'calendar_today', to: '/explore' },
];
const MOBILE_ITEMS = [
  { label: 'Home', icon: 'home', to: '/' },
  { label: 'Search', icon: 'search', to: '/explore' },
  { label: 'List', icon: 'auto_awesome_motion', to: '/explore' },
  { label: 'User', icon: 'person', to: '/explore' },
];
const FILTERS = ['All Eras', 'Newest First', 'Trending Now', 'Top Movies'];

export function ExplorePage() {
  const [query, setQuery] = useState('cyberpunk');
  const [results, setResults] = useState([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('Newest First');
  const [sortBy, setSortBy] = useState('Popularity');

  const suggestions = useMemo(() => results.slice(0, 2), [results]);

  useEffect(() => {
    void runSearch('cyberpunk', 1, false);
  }, []);

  async function runSearch(nextQuery = query, nextPage = 1, append = false) {
    if (!nextQuery.trim()) return;

    setLoading(true);
    try {
      const payload = await searchAnime(nextQuery, nextPage);
      const items = payload.response || [];
      const pageInfo = payload.pageInfo || {};

      setResults((current) => (append ? [...current, ...items] : items));
      setHasNextPage(Boolean(pageInfo.hasNextPage));
      setPage(pageInfo.currentPage || nextPage);
      setTotalResults(
        (append ? results.length : 0) +
          items.length +
          ((pageInfo.totalPages || 1) - (pageInfo.currentPage || nextPage)) * items.length
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    void runSearch(query, 1, false);
  }

  function handleLoadMore() {
    if (!hasNextPage || loading) return;
    void runSearch(query, page + 1, true);
  }

  return (
    <div className="explore-page">
      <header className="explore-topbar">
        <nav className="explore-topbar__nav">
          <div className="explore-topbar__brand-row">
            <Link to="/" className="explore-brand">Ani Neo</Link>
            <div className="explore-topbar__links">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.label}
                  to={item.to}
                  className={({ isActive }) => `explore-topbar__link${isActive ? ' is-active' : ''}`}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>

          <div className="explore-topbar__actions">
            <div className="explore-topbar__search">
              <input
                placeholder="Search the void..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <span className="material-symbols-outlined">search</span>
            </div>
            <button type="button" className="explore-icon-button">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="explore-avatar-shell">
              <div className="explore-avatar">AN</div>
            </div>
          </div>
        </nav>
      </header>

      <aside className="explore-sidebar">
        <div className="explore-sidebar__items">
          {SIDEBAR_ITEMS.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) => `explore-sidebar__item${isActive ? ' is-active' : ''}${item.accent ? ' is-accent' : ''}`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="explore-sidebar__label">{item.label}</span>
            </NavLink>
          ))}
        </div>

        <div className="explore-sidebar__footer">
          <button type="button" className="explore-sidebar__item">
            <span className="material-symbols-outlined">settings</span>
            <span className="explore-sidebar__label">Settings</span>
          </button>
          <div className="explore-sidebar__upgrade-wrap">
            <button type="button" className="explore-upgrade-button">
              Upgrade
            </button>
          </div>
        </div>
      </aside>

      <main className="explore-main">
        <section className="explore-search-hero">
          <h1>
            Explore the <span>Aether</span>
          </h1>

          <form className="explore-search-panel" onSubmit={handleSubmit}>
            <div className="explore-search-panel__glow" />
            <div className="explore-search-panel__inner glass-panel">
              <span className="material-symbols-outlined explore-search-panel__icon">search</span>
              <input
                type="text"
                placeholder="Search the void..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <div className="explore-search-panel__actions">
                <kbd>CMD + K</kbd>
                <button type="submit" className="explore-filter-button">
                  <span className="material-symbols-outlined">tune</span>
                </button>
              </div>
            </div>

            <div className="explore-suggestions glass-panel">
              <div className="explore-suggestions__title">Live Suggestions</div>
              <div className="explore-suggestions__list">
                {suggestions.map((item, index) => (
                  <Link key={item.id || index} to={`/anime/${item.id}`} className="explore-suggestion-card">
                    <div className="explore-suggestion-card__image">
                      {item.poster ? <img src={item.poster} alt={item.title} loading="lazy" /> : null}
                    </div>
                    <div className="explore-suggestion-card__body">
                      <h4>{item.title}</h4>
                      <p>
                        {item.type || 'Anime'} | {item.episodes?.sub || item.episodes?.eps || '?'} Episodes
                      </p>
                    </div>
                    <span className="material-symbols-outlined explore-suggestion-card__trend">
                      {index === 0 ? 'trending_up' : 'history'}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </form>

          <div className="explore-filter-chips">
            {FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                className={`explore-chip${activeFilter === filter ? ' is-active' : ''}`}
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
        </section>

        <section className="explore-results-section">
          <div className="explore-results-header">
            <h3>
              <span className="explore-results-header__bar" />
              Search Results
              <small>{results.length || totalResults} titles found</small>
            </h3>

            <div className="explore-sort-box">
              <span>Sort by:</span>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                <option>Popularity</option>
                <option>Release Date</option>
                <option>Score</option>
              </select>
            </div>
          </div>

          <div className="explore-grid">
            {results.map((item, index) => (
              <Link key={`${item.id}-${index}`} to={`/anime/${item.id}`} className="explore-card">
                <div className="explore-card__poster">
                  {item.poster ? <img src={item.poster} alt={item.title} loading="lazy" /> : null}
                  <div className="explore-card__overlay" />
                  <div className="explore-card__score">{displayScore(item, index)}</div>
                  <div className="explore-card__badges">
                    <span>Sub</span>
                  </div>
                  <div className="explore-card__play">
                    <div className="explore-card__play-button">
                      <span className="material-symbols-outlined fill-icon">play_arrow</span>
                    </div>
                  </div>
                </div>
                <div className="explore-card__body">
                  <span>{exploreGenres(item)}</span>
                  <h4>{item.title}</h4>
                  <p>
                    {truncateText(
                      item.synopsis ||
                        `${item.type || 'Anime'} series with ${item.episodes?.sub || item.episodes?.eps || '?'} episodes available.`,
                      14
                    )}
                  </p>
                </div>
              </Link>
            ))}

            {!results.length && loading
              ? Array.from({ length: 10 }).map((_, index) => (
                  <div key={index} className="explore-card explore-card--skeleton" />
                ))
              : null}
          </div>

          <div className="explore-load-more">
            <button type="button" onClick={handleLoadMore} disabled={!hasNextPage || loading}>
              {loading ? 'Loading...' : hasNextPage ? 'Load More Titles' : 'No More Titles'}
            </button>
          </div>
        </section>
      </main>

      <nav className="explore-mobile-nav glass-panel">
        {MOBILE_ITEMS.map((item) => (
          <NavLink key={item.label} to={item.to} className={({ isActive }) => `explore-mobile-nav__item${isActive ? ' is-active' : ''}`}>
            <span className="material-symbols-outlined">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function displayScore(item, index) {
  return item?.rank ? String(item.rank) : (9.8 - index * 0.2).toFixed(1);
}

function exploreGenres(item) {
  const type = item?.type || 'Anime';
  const genre = item?.duration ? 'Fantasy' : 'Action';
  return `${genre} • ${type}`;
}

function truncateText(text, maxWords) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(' ');
  return `${words.slice(0, maxWords).join(' ')}...`;
}

