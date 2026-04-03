import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useParams } from 'react-router-dom';
import Hls from 'hls.js';
import { getAnimeInfo, getEpisodes, getServers, getStream } from '../services/api';
import discordPromoGif from '../assets/discord-promo.gif';

const DISCORD_INVITE_URL = 'https://discord.gg/y6RsGPT2DG';

const NAV_ITEMS = [
  { label: 'Home', to: '/' },
  { label: 'Explore', to: '/explore' },
  { label: 'Watch', to: '/watch' },
  { label: 'Schedule', to: '/explore' },
];

export function WatchPage() {
  const { animeId } = useParams();
  const [anime, setAnime] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [activeEpisodeId, setActiveEpisodeId] = useState('');
  const [servers, setServers] = useState({ sub: [], dub: [] });
  const [activeType, setActiveType] = useState('sub');
  const [activeServer, setActiveServer] = useState({ name: 'hd-1', type: 'sub' });
  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState({ anime: true, stream: true });
  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);
  const [isEpisodeDrawerOpen, setIsEpisodeDrawerOpen] = useState(false);
  const [isVideoPaused, setIsVideoPaused] = useState(false);
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  useEffect(() => {
    setIsSynopsisExpanded(false);
    setIsEpisodeDrawerOpen(false);
  }, [animeId, activeEpisodeId]);

  useEffect(() => {
    let cancelled = false;

    async function loadWatchBundle() {
      setLoading((current) => ({ ...current, anime: true }));
      try {
        const [animePayload, episodePayload] = await Promise.all([
          getAnimeInfo(animeId),
          getEpisodes(animeId),
        ]);

        if (cancelled) return;
        setAnime(animePayload);
        setEpisodes(episodePayload || []);
        setActiveEpisodeId(episodePayload?.[0]?.id || '');
        setActiveType('sub');
      } finally {
        if (!cancelled) {
          setLoading((current) => ({ ...current, anime: false }));
        }
      }
    }

    if (animeId) {
      void loadWatchBundle();
    }

    return () => {
      cancelled = true;
    };
  }, [animeId]);

  useEffect(() => {
    if (!activeEpisodeId) return;
    let cancelled = false;

    async function loadEpisodeServers() {
      const payload = await getServers(activeEpisodeId);
      if (cancelled) return;

      setServers(payload);

      const preferredType = payload?.sub?.length ? 'sub' : payload?.dub?.length ? 'dub' : 'sub';
      const preferredServer = pickPreferredServer(payload?.[preferredType] || []);

      setActiveType(preferredType);

      if (preferredServer) {
        setActiveServer({ name: preferredServer.name, type: preferredType });
      }
    }

    void loadEpisodeServers();
    return () => {
      cancelled = true;
    };
  }, [activeEpisodeId]);

  useEffect(() => {
    const currentServers = servers?.[activeType] || [];
    const hasActiveServer = currentServers.some((server) => server.name === activeServer.name);

    if (activeServer.type === activeType && hasActiveServer) {
      return;
    }

    const preferredServer = pickPreferredServer(currentServers);
    if (preferredServer) {
      setActiveServer({ name: preferredServer.name, type: activeType });
    }
  }, [activeType, servers, activeServer.name, activeServer.type]);

  useEffect(() => {
    if (!activeEpisodeId || !activeServer.name) return;
    let cancelled = false;

    async function loadStreamSource() {
      setLoading((current) => ({ ...current, stream: true }));
      try {
        const payload = await getStream(activeEpisodeId, activeServer.name, activeServer.type);
        if (!cancelled) {
          setStream(payload);
        }
      } finally {
        if (!cancelled) {
          setLoading((current) => ({ ...current, stream: false }));
        }
      }
    }

    void loadStreamSource();
    return () => {
      cancelled = true;
    };
  }, [activeEpisodeId, activeServer]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream?.link?.file || stream?.link?.type === 'embed') return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    video.pause();
    video.removeAttribute('src');
    video.load();

    if (stream.link.type === 'm3u8' && Hls.isSupported()) {
      const hls = new Hls({
        xhrSetup: (xhr) => {
          if (stream?.referer) {
            xhr.setRequestHeader('Referer', stream.referer);
            xhr.setRequestHeader('Origin', new URL(stream.referer).origin);
          }
        },
        fetchSetup: (context, initParams) => {
          if (stream?.referer) {
            initParams.headers = {
              ...initParams.headers,
              'Referer': stream.referer,
              'Origin': new URL(stream.referer).origin,
            };
          }
          return new Request(context.url, initParams);
        },
      });
      hls.loadSource(stream.link.file);
      hls.attachMedia(video);
      hlsRef.current = hls;
    } else {
      video.src = stream.link.file;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [stream]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || stream?.link?.type === 'embed') {
      setIsVideoPaused(false);
      return undefined;
    }

    const handlePlay = () => setIsVideoPaused(false);
    const handlePause = () => setIsVideoPaused(Boolean(video.currentSrc));
    const handleEnded = () => setIsVideoPaused(false);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    setIsVideoPaused(video.paused && Boolean(video.currentSrc));

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, [stream?.link?.file, stream?.link?.type]);

  const activeEpisode = useMemo(
    () => episodes.find((episode) => episode.id === activeEpisodeId) || episodes[0] || null,
    [episodes, activeEpisodeId]
  );

  const recommendationTiles = useMemo(() => {
    if (!anime) return [];
    return [
      ...(anime.recommended || []),
      ...(anime.related || []),
      ...(anime.mostPopular || []),
    ]
      .filter((item, index, array) => item?.id && array.findIndex((candidate) => candidate?.id === item.id) === index)
      .slice(0, 3);
  }, [anime]);

  const nextEpisode = useMemo(() => {
    if (!activeEpisode) return null;
    return episodes.find((episode) => episode.episodeNumber === activeEpisode.episodeNumber + 1) || null;
  }, [episodes, activeEpisode]);

  const currentEpisodeNumber = activeEpisode?.episodeNumber || 1;
  const totalEpisodes = episodes.length || anime?.episodes?.eps || anime?.episodes?.sub || 0;
  const genres = anime?.genres?.slice(0, 2) || ['Action', 'Sci-Fi'];
  const availableServers = servers?.[activeType] || [];
  const hasSub = (servers?.sub?.length || 0) > 0;
  const hasDub = (servers?.dub?.length || 0) > 0;
  const synopsisText =
    anime?.synopsis || 'Watch the latest episode with both sub and dub options from the available servers.';
  const shouldClampSynopsis = synopsisText.trim().split(/\s+/).filter(Boolean).length > 34;

  return (
    <div className="watch-page watch-page--ankai">
      <header className="watch-topbar watch-topbar--ankai">
        <div className="watch-topbar__left">
          <button
            type="button"
            className="watch-mobile-episodes-button"
            aria-label="Open episode list"
            aria-expanded={isEpisodeDrawerOpen}
            onClick={() => setIsEpisodeDrawerOpen(true)}
          >
            <span className="material-symbols-outlined">list</span>
            <span>Episodes</span>
          </button>
          <Link to="/" className="watch-brand">Ani Neo</Link>
          <nav className="watch-topbar__links">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.label}
                to={item.to === '/watch' ? `/watch/${animeId}` : item.to}
                className={({ isActive }) => `watch-topbar__link${isActive ? ' is-active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="watch-topbar__right">
          <div className="watch-search">
            <input placeholder="Search anime..." />
            <span className="material-symbols-outlined">search</span>
          </div>
          <div className="watch-icon-group">
            <button type="button" className="watch-icon-button"><span className="material-symbols-outlined">notifications</span></button>
            <div className="watch-avatar-shell"><div className="watch-avatar">AK</div></div>
          </div>
        </div>
      </header>

      <main className="watch-layout">
        {isEpisodeDrawerOpen ? (
          <button
            type="button"
            className="watch-episode-drawer-backdrop"
            aria-label="Close episode list"
            onClick={() => setIsEpisodeDrawerOpen(false)}
          />
        ) : null}
        <aside className="watch-episodes-sidebar watch-episodes-sidebar--ankai">
          <div className="watch-episodes-sidebar__header">
            <div className="watch-episodes-sidebar__top-row">
              <div className="watch-episodes-sidebar__meta">
                <span className="material-symbols-outlined fill-icon">play_circle</span>
                <div>
                  <span>Episodes</span>
                  <small>{totalEpisodes} total</small>
                </div>
              </div>
              <button
                type="button"
                className="watch-episodes-close-btn"
                aria-label="Close episode list"
                onClick={() => setIsEpisodeDrawerOpen(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="watch-episodes-sidebar__current">
              <h2>EP {String(currentEpisodeNumber).padStart(2, '0')}</h2>
              <p>{activeEpisode?.title || 'Loading episode...'}</p>
            </div>
          </div>

          <div className="watch-episodes-sidebar__list">
            {episodes.length === 0 ? (
              <div className="watch-episodes-empty">
                <span className="material-symbols-outlined">video_library</span>
                <p>No episodes found</p>
              </div>
            ) : (
              <div className="watch-episodes-list">
                {episodes.map((episode) => {
                  const isActive = episode.id === activeEpisodeId;
                  const epNum = episode.episodeNumber || 0;
                  return (
                    <button
                      key={episode.id}
                      type="button"
                      className={`watch-episode-card${isActive ? ' is-active' : ''}`}
                      onClick={() => setActiveEpisodeId(episode.id)}
                    >
                      <div className="watch-episode-card__number">
                        {String(epNum).padStart(2, '0')}
                      </div>
                      <div className="watch-episode-card__info">
                        <div className="watch-episode-card__title">
                          {isActive && <span className="watch-episode-card__now">NOW</span>}
                          {episode.title || `Episode ${epNum}`}
                        </div>
                        <div className="watch-episode-card__meta">
                          <span>{anime?.duration || '24m'}</span>
                          {episode.isFiller && <span className="watch-episode-card__filler">Filler</span>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <aside className={`watch-episodes-drawer watch-episodes-sidebar--ankai${isEpisodeDrawerOpen ? ' is-open' : ''}`} aria-hidden={!isEpisodeDrawerOpen}>
          <div className="watch-episodes-drawer__header">
            <div className="watch-episodes-drawer__meta">
              <span className="material-symbols-outlined fill-icon">play_circle</span>
              <div>
                <span>Episodes</span>
                <small>{totalEpisodes} total</small>
              </div>
            </div>
            <button
              type="button"
              className="watch-episodes-drawer__close"
              aria-label="Close episode list"
              onClick={() => setIsEpisodeDrawerOpen(false)}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="watch-episodes-drawer__current">
            <h2>EP {String(currentEpisodeNumber).padStart(2, '0')}</h2>
            <p>{activeEpisode?.title || 'Loading episode...'}</p>
          </div>

          <div className="watch-episodes-drawer__list">
            {episodes.length === 0 ? (
              <div className="watch-episodes-empty">
                <span className="material-symbols-outlined">video_library</span>
                <p>No episodes found</p>
              </div>
            ) : (
              <div className="watch-episodes-list">
                {episodes.map((episode) => {
                  const isActive = episode.id === activeEpisodeId;
                  const epNum = episode.episodeNumber || 0;
                  return (
                    <button
                      key={`drawer-${episode.id}`}
                      type="button"
                      className={`watch-episode-card${isActive ? ' is-active' : ''}`}
                      onClick={() => {
                        setActiveEpisodeId(episode.id);
                        setIsEpisodeDrawerOpen(false);
                      }}
                    >
                      <div className="watch-episode-card__number">
                        {String(epNum).padStart(2, '0')}
                      </div>
                      <div className="watch-episode-card__info">
                        <div className="watch-episode-card__title">
                          {isActive && <span className="watch-episode-card__now">NOW</span>}
                          {episode.title || `Episode ${epNum}`}
                        </div>
                        <div className="watch-episode-card__meta">
                          <span>{anime?.duration || '24m'}</span>
                          {episode.isFiller && <span className="watch-episode-card__filler">Filler</span>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <section className="watch-main-content">
          <div className="watch-player-topbar glass-panel">
            <div>
              <small className="watch-player-topbar__eyebrow">Now Playing</small>
              <h1>{anime?.title || 'Loading...'} <span>Episode {currentEpisodeNumber}</span></h1>
            </div>
            <div className="watch-player-topbar__meta">
              <span>{anime?.type || 'TV'}</span>
              <span>{anime?.duration || '24m'}</span>
              <span>{anime?.rating || 'PG-13'}</span>
            </div>
          </div>

          <div className="watch-player-shell">
            {stream?.link?.type === 'embed' ? (
              <iframe
                className="watch-player-frame"
                src={stream.link.file}
                title="Watch stream"
                allowFullScreen
              />
            ) : (
              <video ref={videoRef} className="watch-player-frame" controls playsInline poster={anime?.poster || ''} />
            )}

            {!stream?.link?.file && !loading.stream ? (
              <div className="watch-player-fallback">
                {anime?.poster ? <img src={anime.poster} alt={anime.title} /> : null}
                <div className="watch-player-fallback__overlay" />
              </div>
            ) : null}

            {stream?.link?.type !== 'embed' && isVideoPaused ? (
              <div className="watch-player-discord-promo" aria-hidden={!isVideoPaused}>
                <div className="watch-player-discord-promo__backdrop" />
                <div className="watch-player-discord-promo__card glass-panel">
                  <img
                    className="watch-player-discord-promo__logo"
                    src={discordPromoGif}
                    alt="Join our Discord server animation"
                  />
                  <div className="watch-player-discord-promo__copy">
                    <span className="watch-player-discord-promo__eyebrow">Support Ani Neo</span>
                    <h2>Join our Discord server now</h2>
                    <p>Pause time is community time. Hop in for updates, support, and live anime talk.</p>
                  </div>
                  <a
                    className="watch-player-discord-promo__button"
                    href={DISCORD_INVITE_URL}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Join Discord
                  </a>
                </div>
              </div>
            ) : null}
          </div>

          <div className="watch-controls-panel glass-panel">
            <div className="watch-control-group">
              <span className="watch-control-group__label">Audio</span>
              <div className="watch-toggle-row">
                <button
                  type="button"
                  className={`watch-toggle${activeType === 'sub' ? ' is-active' : ''}`}
                  onClick={() => hasSub && setActiveType('sub')}
                  disabled={!hasSub}
                >
                  Sub
                </button>
                <button
                  type="button"
                  className={`watch-toggle${activeType === 'dub' ? ' is-active' : ''}`}
                  onClick={() => hasDub && setActiveType('dub')}
                  disabled={!hasDub}
                >
                  Dub
                </button>
              </div>
            </div>

            <div className="watch-control-group">
              <span className="watch-control-group__label">Servers</span>
              <div className="watch-server-row">
                {availableServers.length
                  ? availableServers.map((server) => {
                      const isActive = activeServer.name === server.name && activeServer.type === activeType;
                      return (
                        <button
                          key={`${activeType}-${server.name}`}
                          type="button"
                          className={`watch-server-pill${isActive ? ' is-active' : ''}`}
                          onClick={() => setActiveServer({ name: server.name, type: activeType })}
                        >
                          {server.name}
                        </button>
                      );
                    })
                  : <span className="watch-empty-copy">No {activeType} servers available for this episode.</span>}
              </div>
            </div>
          </div>

          <div className="watch-meta-block">
            <div className="watch-meta-block__main">
              <div className="watch-meta-block__chips">
                {genres.map((genre, index) => (
                  <span key={genre} className={`watch-chip ${index === 0 ? 'is-secondary' : 'is-primary'}`}>{genre}</span>
                ))}
                <small>{anime?.rating || 'TV-14'} • {anime?.aired?.from?.slice?.(0, 4) || anime?.premiered || '2024'} • {totalEpisodes} Episodes</small>
              </div>

              <p className="watch-meta-block__title">
                {anime?.title || 'Loading title'} <span>Episode {currentEpisodeNumber}</span>
              </p>

              <div className="watch-synopsis-block">
                <p className={`watch-synopsis-copy${isSynopsisExpanded ? ' is-expanded' : ''}${shouldClampSynopsis ? ' is-clamped' : ''}`}>
                  {synopsisText}
                </p>
                {shouldClampSynopsis ? (
                  <button
                    type="button"
                    className={`watch-synopsis-toggle${isSynopsisExpanded ? ' is-expanded' : ''}`}
                    onClick={() => setIsSynopsisExpanded((current) => !current)}
                  >
                    <span>{isSynopsisExpanded ? 'View Less' : 'View More'}</span>
                    <span className="material-symbols-outlined">
                      {isSynopsisExpanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
                    </span>
                  </button>
                ) : null}
              </div>
            </div>

            <div className="watch-meta-block__actions">
              <button type="button" className="watch-next-button" disabled={!nextEpisode} onClick={() => nextEpisode && setActiveEpisodeId(nextEpisode.id)}>
                Next Episode
              </button>
              <div className="watch-secondary-actions">
                <button type="button">Watchlist</button>
                <button type="button">{activeType.toUpperCase()}</button>
                <button type="button"><span className="material-symbols-outlined">share</span></button>
              </div>
            </div>
          </div>

          <div className="watch-recommend-grid">
            <Link to="/explore" className="watch-recommend-grid__wide">
              {recommendationTiles[0]?.poster ? <img src={recommendationTiles[0].poster} alt={recommendationTiles[0].title} /> : null}
              <div className="watch-recommend-grid__overlay">
                <span>Recommended</span>
                <h3>{recommendationTiles[0]?.title || 'More to watch'}</h3>
              </div>
            </Link>

            {recommendationTiles.slice(1, 3).map((item, index) => (
              <Link key={item.id || index} to={`/anime/${item.id}`} className="watch-recommend-grid__tile">
                {item.poster ? <img src={item.poster} alt={item.title} /> : null}
                <div className="watch-recommend-grid__tile-overlay">
                  <h3>{item.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function pickPreferredServer(serverList) {
  return serverList.find((server) => server.name === 'hd-1') || serverList[0] || null;
}
