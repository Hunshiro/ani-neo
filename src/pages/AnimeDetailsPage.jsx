import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useParams } from 'react-router-dom';
import { getAnimeInfo } from '../services/api';

const NAV_ITEMS = [
  { label: 'Home', to: '/' },
  { label: 'Explore', to: '/explore' },
  { label: 'Trending', to: '/explore' },
  { label: 'Schedule', to: '/explore' },
];

export function AnimeDetailsPage() {
  const { animeId } = useParams();
  const [anime, setAnime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [posterFailed, setPosterFailed] = useState(false);
  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [animeId]);

  useEffect(() => {
    setPosterFailed(false);
  }, [animeId, anime?.poster]);

  useEffect(() => {
    setIsSynopsisExpanded(false);
  }, [animeId]);

  useEffect(() => {
    let cancelled = false;

    async function loadAnime() {
      setLoading(true);
      try {
        const payload = await getAnimeInfo(animeId);
        if (!cancelled) {
          setAnime(payload);
        }
      } catch {
        if (!cancelled) {
          setAnime(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (animeId) {
      void loadAnime();
    }

    return () => {
      cancelled = true;
    };
  }, [animeId]);

  const recommendations = useMemo(() => {
    if (!anime) return [];
    return [
      ...(anime.recommended || []),
      ...(anime.related || []),
      ...(anime.mostPopular || []),
    ]
      .filter((item, index, array) => item?.id && array.findIndex((candidate) => candidate?.id === item.id) === index)
      .slice(0, 6);
  }, [anime]);

  const genres = anime?.genres?.slice(0, 5) || [];
  const description = anime?.synopsis || 'Loading anime details from the source...';
  const shouldClampSynopsis = description.trim().split(/\s+/).filter(Boolean).length > 36;
  const posterUrl = !posterFailed ? anime?.poster || null : null;
  const hasPoster = Boolean(posterUrl);
  const watchAnimeId = anime?.id || animeId;
  const titleClassName = `detail-hero__heading${anime?.title?.length > 24 ? ' is-long' : ''}${anime?.title?.length > 40 ? ' is-xlong' : ''}`;
  const heroStats = [
    { label: 'Score', value: anime?.MAL_score || anime?.rating || 'N/A' },
    { label: 'Episodes', value: anime?.episodes?.eps || anime?.episodes?.sub || 'TBA' },
    { label: 'Duration', value: anime?.duration || 'Unknown' },
    { label: 'Type', value: anime?.type || 'TV' },
  ];
  const infoRows = [
    { label: 'Japanese', value: anime?.japanese || anime?.title },
    { label: 'Synonyms', value: formatListValue(anime?.synonyms, 2) || 'Unknown' },
    { label: 'Aired', value: formatAired(anime) },
    { label: 'Status', value: anime?.status || 'Unknown' },
    { label: 'Studios', value: formatListValue(anime?.studios) || 'Unknown' },
    { label: 'Producers', value: formatListValue(anime?.producers) || 'Unknown' },
  ];

  if (loading) {
    return (
      <div className="detail-page detail-page--ankai">
        <header className="detail-topbar detail-topbar--ankai">
          <nav className="detail-topbar__nav">
            <Link to="/" className="detail-brand">Ani Neo</Link>
          </nav>
        </header>
        <main className="detail-main detail-main--state">
          <div className="detail-state-card glass-panel">
            <h2>Loading anime details...</h2>
            <p>Pulling metadata, artwork, and recommendations for this title.</p>
          </div>
        </main>
      </div>
    );
  }

  if (!anime) {
    return (
      <div className="detail-page detail-page--ankai">
        <header className="detail-topbar detail-topbar--ankai">
          <nav className="detail-topbar__nav">
            <Link to="/" className="detail-brand">Ani Neo</Link>
          </nav>
        </header>
        <main className="detail-main detail-main--state">
          <div className="detail-state-card glass-panel">
            <h2>Anime not found</h2>
            <p>The selected title could not be loaded right now. Try opening it again from explore.</p>
            <Link to="/explore" className="detail-cta detail-cta--primary">
              Back To Explore
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="detail-page detail-page--ankai">
      <header className="detail-topbar detail-topbar--ankai">
        <nav className="detail-topbar__nav">
          <div className="detail-topbar__brand-row">
            <Link to="/" className="detail-brand">Ani Neo</Link>
            <div className="detail-topbar__links">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.label}
                  to={item.to}
                  className={({ isActive }) => `detail-topbar__link${isActive ? ' is-active' : ''}`}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>

          <div className="detail-topbar__actions">
            <div className="detail-search">
              <span className="material-symbols-outlined">search</span>
              <input placeholder="Search anime..." />
            </div>
            <div className="detail-icon-group">
              <button type="button" className="detail-icon-button">
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <div className="detail-avatar-shell">
                <div className="detail-avatar">AK</div>
              </div>
            </div>
          </div>
        </nav>
      </header>

      <main className="detail-main">
        <section className="detail-hero detail-hero--ankai">
          <div className="detail-hero__background detail-hero__background--soft">
            {posterUrl ? <img src={posterUrl} alt={anime.title} onError={() => setPosterFailed(true)} /> : null}
            <div className="detail-hero__wash detail-hero__wash--right" />
            <div className="detail-hero__wash detail-hero__wash--bottom" />
          </div>

          <div className={`detail-hero__shell${hasPoster ? '' : ' no-poster'}`}>
            {hasPoster ? (
              <div className="detail-poster-panel glass-panel">
                <div className="detail-poster-panel__image">
                  <img src={posterUrl} alt={anime.title} onError={() => setPosterFailed(true)} />
                </div>
              </div>
            ) : null}

            <div className="detail-hero__content detail-hero__content--ankai">
              <div className="detail-topline">
                <span className="detail-topline__badge">Anime</span>
                <span className="detail-topline__sub">{anime.japanese || anime.title}</span>
              </div>

              <h1 className={titleClassName}>{anime.title || 'Unknown title'}</h1>

              <div className="detail-rating-strip glass-panel">
                <div className="detail-rating-strip__score">
                  <span className="material-symbols-outlined fill-icon">star</span>
                  <strong>{anime.MAL_score || anime.rating || 'N/A'}</strong>
                </div>
                <span>{formatAired(anime)}</span>
                <span>{anime.duration || 'Unknown duration'}</span>
                <span>{anime.episodes?.eps || anime.episodes?.sub || 'TBA'} eps</span>
              </div>

              <div className="detail-genre-chips">
                {genres.length
                  ? genres.map((genre) => (
                      <span key={genre} className="detail-genre-chip">{genre}</span>
                    ))
                  : null}
              </div>

              <div className="detail-synopsis-block">
                <p className={`detail-hero__summary${isSynopsisExpanded ? ' is-expanded' : ''}${shouldClampSynopsis ? ' is-clamped' : ''}`}>
                  {description}
                </p>
                {shouldClampSynopsis ? (
                  <button
                    type="button"
                    className={`detail-synopsis-toggle${isSynopsisExpanded ? ' is-expanded' : ''}`}
                    onClick={() => setIsSynopsisExpanded((current) => !current)}
                  >
                    <span>{isSynopsisExpanded ? 'View Less' : 'View More'}</span>
                    <span className="material-symbols-outlined">
                      {isSynopsisExpanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
                    </span>
                  </button>
                ) : null}
              </div>

              <div className="detail-hero__buttons detail-hero__buttons--ankai">
                <Link to={`/watch/${watchAnimeId}`} className="detail-cta detail-cta--primary">
                  <span className="material-symbols-outlined fill-icon">play_arrow</span>
                  Start Watching
                </Link>
                <button type="button" className="detail-cta detail-cta--secondary">
                  <span className="material-symbols-outlined">bookmark_add</span>
                  Add to List
                </button>
              </div>

              <div className="detail-stat-strip">
                {heroStats.map((item) => (
                  <div key={item.label} className="detail-stat-strip__item glass-panel">
                    <small>{item.label}</small>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="detail-overview-grid">
          <div className="detail-overview-card glass-panel">
            <div className="detail-section__header detail-section__header--tight">
              <div>
                <span>Overview</span>
                <h2>Series Information</h2>
              </div>
            </div>
            <div className="detail-info-list">
              {infoRows.map((item) => (
                <div key={item.label} className="detail-info-list__row">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>

        {anime?.moreSeasons?.length ? (
          <section className="detail-section detail-section--ankai detail-section--seasons">
            <div className="detail-section__header">
              <div>
                <span>Franchise</span>
                <h2>More Seasons</h2>
              </div>
            </div>

            <div className="detail-season-row custom-scrollbar">
              {anime.moreSeasons.map((season, index) => (
                <Link
                  key={`${season.id || season.title}-${index}`}
                  to={season?.id ? `/anime/${season.id}` : '#'}
                  className={`detail-season-card${season?.isActive ? ' is-active' : ''}`}
                >
                  <div className="detail-season-card__poster">
                    {season?.poster ? <img src={season.poster} alt={season.title || season.alternativeTitle} loading="lazy" /> : null}
                    <div className="detail-season-card__overlay" />
                    {season?.isActive ? <span className="detail-season-card__badge">Current</span> : null}
                  </div>
                  <div className="detail-season-card__copy">
                    <h3>{season?.title || season?.alternativeTitle || 'Season'}</h3>
                    <p>{season?.alternativeTitle || 'Open details'}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="detail-section detail-section--ankai">
          <div className="detail-section__header">
            <div>
              <span>Recommendations</span>
              <h2>More Like This</h2>
            </div>
          </div>

          <div className="detail-recommendations detail-recommendations--ankai custom-scrollbar">
            {recommendations.length
              ? recommendations.map((item, index) => (
                  <Link key={`${item.id}-${index}`} to={`/anime/${item.id}`} className="detail-rec-card">
                    <div className="detail-rec-card__poster">
                      {item.poster ? <img src={item.poster} alt={item.title} loading="lazy" /> : null}
                      <div className="detail-rec-card__score glass-panel">
                        <span className="material-symbols-outlined fill-icon">star</span>
                        <span>{item.rank || anime?.MAL_score || '8.9'}</span>
                      </div>
                      <div className="detail-rec-card__overlay">
                        <div className="detail-rec-card__button">View Details</div>
                      </div>
                    </div>
                    <h3>{item.title}</h3>
                    <p>{detailGenreLine(item)}</p>
                  </Link>
                ))
              : Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="detail-rec-card detail-rec-card--placeholder" />
                ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function detailGenreLine(item) {
  const genres = item?.genres?.slice?.(0, 2);
  if (genres?.length) return genres.join(' | ');
  return `${item?.type || 'Action'} | ${item?.duration || 'Unknown'}`;
}

function formatAired(anime) {
  if (anime?.aired?.from && anime?.aired?.to) {
    return `${anime.aired.from} to ${anime.aired.to}`;
  }
  return anime?.aired?.from || anime?.premiered || 'Unknown';
}

function formatListValue(value, limit) {
  if (Array.isArray(value)) {
    const items = typeof limit === 'number' ? value.slice(0, limit) : value;
    return items.filter(Boolean).join(', ');
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  return '';
}
