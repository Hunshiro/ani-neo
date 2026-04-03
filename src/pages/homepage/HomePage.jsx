import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { BrandMark } from '../../components/BrandMark';
import { getAnimeInfo, getHome, searchAnime } from '../../services/api';
import discordServerLogo from '../../assets/discord-server-logo.png';
import './homepage.css';

const DISCORD_INVITE_URL = 'https://discord.gg/y6RsGPT2DG';

const NAV_ITEMS = [
  { label: 'Explore', to: '/explore' },
  { label: 'Series',  to: '/explore' },
  { label: 'Movies',  to: '/explore' },
  { label: 'My List', to: '/explore' },
];

const SIDEBAR_ITEMS = [
  { label: 'Home',     icon: 'home',          to: '/',        accent: 'primary' },
  { label: 'Trending', icon: 'bolt',           to: '/explore', accent: 'secondary' },
  { label: 'Library',  icon: 'video_library',  to: '/explore' },
  { label: 'Schedule', icon: 'calendar_today', to: '/explore' },
];

const FOOTER_GROUPS = [
  {
    title: 'Navigate',
    hoverClass: 'footer-link--primary',
    links: [
      { label: 'Streaming Guide', to: '/explore' },
      { label: 'Collections',     to: '/explore' },
      { label: 'New Drops',       to: '/explore' },
    ],
  },
  {
    title: 'Community',
    hoverClass: 'footer-link--secondary',
    links: [
      { label: 'Discord Link', to: DISCORD_INVITE_URL, external: true },
      { label: 'Fan Hub',      to: '/explore' },
      { label: 'Events',       to: '/explore' },
    ],
  },
  {
    title: 'Support',
    hoverClass: 'footer-link--tertiary',
    links: [
      { label: 'Help Center', to: '/explore' },
      { label: 'API Docs',    to: '/explore' },
      { label: 'Privacy',     to: '/explore' },
    ],
  },
];

/* ─── Rock-solid index-based carousel hook ────────────────────────────────── */
function useCarousel({ items, autoPlayMs = 0, pauseOnHover = true }) {
  const railRef        = useRef(null);
  const [index, setIndex]           = useState(0);
  const [hovered, setHovered]       = useState(false);
  const [visibleCount, setVisibleCount] = useState(1);

  // Reset index when items change significantly
  useEffect(() => {
    setIndex(0);
  }, [items.length]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const measure = () => {
      const firstCard = rail.firstElementChild;
      if (firstCard && firstCard.offsetWidth > 0) {
        setVisibleCount(Math.max(1, Math.floor(rail.clientWidth / firstCard.offsetWidth)));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(rail);
    return () => ro.disconnect();
  }, [items.length]);

  const totalSlides = Math.max(1, Math.ceil(items.length / Math.max(1, visibleCount)));
  const safeIndex   = Math.min(index, Math.max(0, totalSlides - 1));
  const canScroll   = totalSlides > 1;

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const firstCard = rail.firstElementChild;
    if (!firstCard) return;
    const cardW = firstCard.offsetWidth;
    const gap   = parseFloat(getComputedStyle(rail).gap) || 0;
    const scrollLeft = safeIndex * visibleCount * (cardW + gap);
    rail.scrollTo({ left: scrollLeft, behavior: 'smooth' });
  }, [safeIndex, visibleCount]);

  useEffect(() => {
    if (!autoPlayMs || (pauseOnHover && hovered) || !canScroll) return;
    const id = setInterval(() => {
      setIndex((p) => (p + 1 >= totalSlides ? 0 : p + 1));
    }, autoPlayMs);
    return () => clearInterval(id);
  }, [autoPlayMs, hovered, pauseOnHover, canScroll, totalSlides]);

  const prev = useCallback(() => setIndex((p) => (p <= 0 ? totalSlides - 1 : p - 1)), [totalSlides]);
  const next = useCallback(() => setIndex((p) => (p + 1 >= totalSlides ? 0 : p + 1)), [totalSlides]);
  const goTo = useCallback((i) => setIndex(Math.max(0, Math.min(i, totalSlides - 1))), [totalSlides]);

  return {
    railRef, index: safeIndex, totalSlides, canScroll, prev, next, goTo,
    hoverProps: pauseOnHover
      ? { onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false) }
      : {},
  };
}

/* ─── Hero carousel: crossfade backgrounds ───────────────────────────────── */
function useHeroCarousel({ items, autoPlayMs = 8000 }) {
  const [index, setIndex]   = useState(0);
  const [hovered, setHovered] = useState(false);
  const total = items.length;

  useEffect(() => {
    setIndex(0);
  }, [items.length]);

  useEffect(() => {
    if (!autoPlayMs || hovered || total === 0) return;
    const id = setInterval(() => setIndex((p) => (p + 1 >= total ? 0 : p + 1)), autoPlayMs);
    return () => clearInterval(id);
  }, [autoPlayMs, hovered, total]);

  const prev = useCallback(() => setIndex((p) => (p <= 0 ? total - 1 : p - 1)), [total]);
  const next = useCallback(() => setIndex((p) => (p + 1 >= total ? 0 : p + 1)), [total]);
  const goTo = useCallback((i) => setIndex(Math.max(0, Math.min(i, Math.max(0, total - 1)))), [total]);

  return {
    index, total, prev, next, goTo,
    hoverProps: {
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => setHovered(false),
    },
  };
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export function HomePage() {
  const [home, setHome] = useState({
    spotlight: [],
    trending: [],
    latestEpisode: [],
    newAdded: [],
    topAiring: [],
    mostPopular: [],
    mostFavorite: [],
    latestCompleted: [],
    topUpcoming: [],
    topTen: { today: [], week: [], month: [] },
  });
  const [heroInfo, setHeroInfo]                   = useState(null);
  const [searchTerm, setSearchTerm]               = useState('');
  const [searchResults, setSearchResults]         = useState([]);
  const [searchFocused, setSearchFocused]         = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [loading, setLoading]                     = useState({ home: true, hero: false });

  const heroItems = useMemo(() => home.spotlight?.slice(0, 5) || [], [home.spotlight]);
  const trendingItems = useMemo(() => home.trending || [], [home.trending]);
  const recentEpisodeItems = useMemo(
    () => {
      if (home.latestEpisode?.length) return home.latestEpisode;
      if (home.newAdded?.length) return home.newAdded;
      if (home.topAiring?.length) return home.topAiring;
      if (home.topTen?.today?.length) return home.topTen.today;
      return [];
    },
    [home.latestEpisode, home.newAdded, home.topAiring, home.topTen]
  );
  const mostPopularItems = useMemo(() => home.mostPopular || [], [home.mostPopular]);
  const topAiringItems = useMemo(() => home.topAiring || [], [home.topAiring]);
  const newlyAddedItems = useMemo(() => home.newAdded || [], [home.newAdded]);
  const topUpcomingItems = useMemo(() => home.topUpcoming || [], [home.topUpcoming]);
  const mostFavoriteItems = useMemo(() => home.mostFavorite || [], [home.mostFavorite]);
  const latestCompletedItems = useMemo(() => home.latestCompleted || [], [home.latestCompleted]);

  const hero             = useHeroCarousel({ items: heroItems,    autoPlayMs: 8000 });
  const trendingCarousel = useCarousel({ items: trendingItems,    autoPlayMs: 5000 });
  const recentEpisodesCarousel = useCarousel({ items: recentEpisodeItems, autoPlayMs: 0 });
  const mostPopularCarousel = useCarousel({ items: mostPopularItems, autoPlayMs: 0 });
  const topAiringCarousel = useCarousel({ items: topAiringItems, autoPlayMs: 0 });
  const newlyAddedCarousel = useCarousel({ items: newlyAddedItems, autoPlayMs: 0 });
  const topUpcomingCarousel = useCarousel({ items: topUpcomingItems, autoPlayMs: 0 });
  const mostFavoriteCarousel = useCarousel({ items: mostFavoriteItems, autoPlayMs: 0 });
  const latestCompletedCarousel = useCarousel({ items: latestCompletedItems, autoPlayMs: 0 });

  const currentHeroItem = heroItems[hero.index] || null;

  useEffect(() => {
    let cancelled = false;
    setLoading((c) => ({ ...c, home: true }));
    getHome()
      .then((p) => { if (!cancelled) setHome(p); })
      .finally(() => { if (!cancelled) setLoading((c) => ({ ...c, home: false })); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!currentHeroItem?.id) return;
    let cancelled = false;
    setLoading((c) => ({ ...c, hero: true }));
    getAnimeInfo(currentHeroItem.id)
      .then((p) => { if (!cancelled) setHeroInfo(p); })
      .catch(() => { if (!cancelled) setHeroInfo(null); })
      .finally(() => { if (!cancelled) setLoading((c) => ({ ...c, hero: false })); });
    return () => { cancelled = true; };
  }, [currentHeroItem?.id]);

  useEffect(() => { setDescriptionExpanded(false); }, [hero.index]);
  useEffect(() => { setMobileSidebarOpen(false); }, []);

  async function handleSearch(e) {
    e?.preventDefault();
    if (!searchTerm.trim()) return;
    try {
      const payload = await searchAnime(searchTerm);
      setSearchResults(payload.response || []);
      setSearchFocused(true);
    } catch { /* silent */ }
  }

  const heroTitle = currentHeroItem?.title || 'ANI NEO';
  const heroDesc  = heroInfo?.synopsis || currentHeroItem?.synopsis ||
    'In a world where the line between humanity and machine is blurred, a young street kid navigates the treacherous underworld to become a legendary mercenary.';
  const condensed = truncateWords(heroDesc, 30);
  const showToggle = heroDesc.trim().length > condensed.trim().length;

  return (
    <div className="nv-page">

      {/* ══ TOPBAR ══════════════════════════════════════════════════════ */}
      <header className="nv-topbar">
        <nav className="nv-topbar__nav">
          <div className="nv-topbar__left">
            <button
              type="button"
              className="nv-mobile-menu-btn"
              aria-label="Open navigation menu"
              aria-expanded={mobileSidebarOpen}
              onClick={() => setMobileSidebarOpen(true)}
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <Link to="/" className="nv-brand" aria-label="Ani Neo home">
              <BrandMark className="nv-brand__image" />
            </Link>
            <div className="nv-topbar__links">
              {NAV_ITEMS.map((item, i) => (
                <NavLink
                  key={item.label}
                  to={item.to}
                  className={({ isActive }) => `nv-topbar__link${isActive || i === 0 ? ' is-active' : ''}`}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>

          <div className="nv-topbar__right">
            <form className="nv-search" onSubmit={handleSearch}>
              <input
                type="text"
                placeholder="Search the void..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              />
              <span className="material-symbols-outlined nv-search__icon">search</span>
              {searchFocused && searchResults.length > 0 && (
                <div className="nv-search__dropdown">
                  {searchResults.slice(0, 6).map((item) => (
                    <Link key={item.id} to={animeHref(item)} className="nv-search__result" onClick={() => setSearchFocused(false)}>
                      {item.poster && <img src={item.poster} alt="" />}
                      <span>{item.title}</span>
                    </Link>
                  ))}
                </div>
              )}
            </form>

            <button className="nv-icon-btn" aria-label="Notifications">
              <span className="material-symbols-outlined">notifications</span>
            </button>

            <div className="nv-avatar-ring">
              <div className="nv-avatar">AN</div>
            </div>
          </div>
        </nav>
      </header>

      {/* ══ SIDEBAR ═════════════════════════════════════════════════════ */}
      {mobileSidebarOpen ? (
        <button
          type="button"
          className="nv-mobile-sidebar-backdrop"
          aria-label="Close navigation menu"
          onClick={() => setMobileSidebarOpen(false)}
        />
      ) : null}
      <aside className="nv-sidebar">
        <div className="nv-sidebar__items">
          {SIDEBAR_ITEMS.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) =>
                `nv-sidebar__item${isActive ? ' is-active' : ''}${item.accent ? ` accent-${item.accent}` : ''}`
              }
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="nv-sidebar__label">{item.label}</span>
            </NavLink>
          ))}
        </div>
        <div className="nv-sidebar__foot">
          <NavLink to="/explore" className="nv-sidebar__item">
            <span className="material-symbols-outlined">settings</span>
            <span className="nv-sidebar__label">Settings</span>
          </NavLink>
          <div className="nv-sidebar__upgrade">
            <Link to="/explore" className="nv-upgrade-btn">Upgrade</Link>
          </div>
        </div>
      </aside>

      <aside className={`nv-mobile-sidebar-drawer${mobileSidebarOpen ? ' is-open' : ''}`} aria-hidden={!mobileSidebarOpen}>
        <div className="nv-mobile-sidebar-drawer__header">
          <span className="nv-brand" aria-label="Ani Neo">
            <BrandMark className="nv-brand__image" />
          </span>
          <button
            type="button"
            className="nv-mobile-sidebar-close"
            aria-label="Close navigation menu"
            onClick={() => setMobileSidebarOpen(false)}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="nv-mobile-sidebar-drawer__items">
          {SIDEBAR_ITEMS.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) =>
                  `nv-mobile-sidebar-drawer__item${isActive ? ' is-active' : ''}${item.accent ? ` accent-${item.accent}` : ''}`
                }
                onClick={() => setMobileSidebarOpen(false)}
              >
                <span className="nv-mobile-sidebar-drawer__icon">
                  <span className="material-symbols-outlined">{item.icon}</span>
                </span>
                <span className="nv-mobile-sidebar-drawer__copy">
                  <strong>{item.label}</strong>
                  <small>{mobileItemHint(item.label)}</small>
                </span>
              </NavLink>
            ))}
          </div>

          <div className="nv-mobile-sidebar-drawer__footer">
            <NavLink to="/explore" className="nv-mobile-sidebar-drawer__item" onClick={() => setMobileSidebarOpen(false)}>
              <span className="nv-mobile-sidebar-drawer__icon">
                <span className="material-symbols-outlined">settings</span>
              </span>
              <span className="nv-mobile-sidebar-drawer__copy">
                <strong>Settings</strong>
                <small>Tune your experience</small>
              </span>
            </NavLink>
            <Link to="/explore" className="nv-upgrade-btn" onClick={() => setMobileSidebarOpen(false)}>Upgrade</Link>
          </div>
      </aside>

      {/* ══ MAIN ════════════════════════════════════════════════════════ */}
      <main className="nv-main">

        {/* ── HERO ────────────────────────────────────────────────────── */}
        <section className="nv-hero" {...hero.hoverProps}>

          {/* Crossfading background images */}
          <div className="nv-hero__bgs" aria-hidden="true">
            {heroItems.map((item, i) => (
              <div
                key={item.id}
                className={`nv-hero__bg${i === hero.index ? ' is-active' : ''}`}
                style={{ backgroundImage: item.poster ? `url(${item.poster})` : undefined }}
              />
            ))}
            {heroItems.length === 0 && (
              <div className="nv-hero__bg nv-hero__bg--fallback is-active" />
            )}
            <div className="nv-hero__grad nv-hero__grad--bottom" />
            <div className="nv-hero__grad nv-hero__grad--left"   />
            <div className="nv-hero__grad nv-hero__grad--top"    />
          </div>

          {/* Foreground content */}
          <div className="nv-hero__body">
            <div className="nv-hero__info">
              <div className="nv-hero__tags">
                <span className="nv-badge nv-badge--primary">New Release</span>
                <span className="nv-hero__meta-text">{heroMeta(currentHeroItem, heroInfo)}</span>
              </div>

              <h1 className="nv-hero__title">{formatHeroTitle(heroTitle)}</h1>

              <p className="nv-hero__desc">
                {descriptionExpanded ? heroDesc : condensed}
                {showToggle && (
                  <button
                    type="button"
                    className="nv-hero__toggle"
                    onClick={() => setDescriptionExpanded((v) => !v)}
                  >
                    {descriptionExpanded ? ' View Less' : ' View More'}
                  </button>
                )}
              </p>

              <div className="nv-hero__actions">
                <Link to={watchHref(currentHeroItem)} className="nv-btn nv-btn--primary">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                  Watch Now
                </Link>
                <Link to={animeHref(currentHeroItem)} className="nv-btn nv-btn--ghost">
                  <span className="material-symbols-outlined">add</span>
                  Add to List
                </Link>
              </div>
            </div>

          </div>

          {/* Carousel controls */}
          <div className="nv-hero__controls">
            <button type="button" className="nv-ctrl-btn" onClick={hero.prev} aria-label="Previous">
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <div className="nv-dots">
              {heroItems.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`nv-dot${i === hero.index ? ' active' : ''}`}
                  onClick={() => hero.goTo(i)}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
            <button type="button" className="nv-ctrl-btn" onClick={hero.next} aria-label="Next">
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </section>

        {/* ── CONTENT ─────────────────────────────────────────────────── */}
        <div className="nv-content">
          <section className="nv-section nv-section--community-banner">
            <a
              className="nv-community-banner"
              href={DISCORD_INVITE_URL}
              target="_blank"
              rel="noreferrer"
            >
              <div className="nv-community-banner__orb" aria-hidden="true" />
              <div className="nv-community-banner__logo-wrap">
                <img
                  className="nv-community-banner__logo"
                  src={discordServerLogo}
                  alt="Discord server logo"
                />
              </div>
              <div className="nv-community-banner__copy">
                <span className="nv-community-banner__eyebrow">Community Banner</span>
                <h2>Join our Discord server to show support</h2>
                <p>Get episode updates, hang out with the community, and help us keep Ani Neo growing.</p>
                <div className="nv-community-banner__meta">
                  <span>Live updates</span>
                  <span>Community chat</span>
                  <span>Support the project</span>
                </div>
              </div>
              <div className="nv-community-banner__cta">
                <span className="nv-community-banner__button">Join Discord</span>
               
              </div>
            </a>
          </section>

          {/* ── TRENDING ─────────────────────────────────────────────── */}
          <section className="nv-section">
            <HorizontalCarouselSection
              title="Trending Anime"
              accent="secondary"
              railClassName="nv-rail--cards"
              itemCount={5}
              loading={loading.home}
              items={trendingItems}
              carousel={trendingCarousel}
              renderSkeleton={(key) => <div key={key} className="nv-card nv-card--skeleton" />}
              renderItem={(item, i) => (
                <Link key={item.id} to={animeHref(item)} className="nv-card group">
                  <div className="nv-card__img">
                    {item.poster && <img src={item.poster} alt={item.title} loading="lazy" />}
                    <div className="nv-card__overlay" />
                    <div className="nv-card__score">{displayScore(item, i)}</div>
                    <div className="nv-card__foot">
                      <h3 className="nv-card__title">{item.title}</h3>
                      <p className="nv-card__meta">{cardMeta(item)}</p>
                    </div>
                  </div>
                </Link>
              )}
            />
          </section>

          {/* ── RECENTLY UPDATED EPISODES ────────────────────────────── */}
          <section className="nv-section">
            <HorizontalCarouselSection
              title="Recently Updated Episodes"
              accent="primary"
              railClassName="nv-rail--release"
              itemCount={4}
              loading={loading.home}
              items={recentEpisodeItems}
              carousel={recentEpisodesCarousel}
              renderSkeleton={(key) => <div key={key} className="nv-release-card nv-release-card--skeleton" />}
              renderItem={(item) => (
                <Link key={item.id} to={animeHref(item)} className="nv-release-card group">
                  <div className="nv-release-card__img">
                    {item.poster && <img src={item.poster} alt={item.title} loading="lazy" />}
                    <div className="nv-release-card__overlay" />
                    <div className="nv-release-card__body">
                      <span className="nv-badge nv-badge--sm">{episodeBadge(item)}</span>
                      <h3>{item.title}</h3>
                      <p>{cardMeta(item)}</p>
                    </div>
                  </div>
                </Link>
              )}
            />
          </section>

          {/* ── MOST POPULAR ANIME ───────────────────────────────────── */}
          <section className="nv-section">
            <HorizontalCarouselSection
              title="Most Popular Anime"
              accent="secondary"
              railClassName="nv-rail--cards"
              itemCount={5}
              loading={loading.home}
              items={mostPopularItems}
              carousel={mostPopularCarousel}
              renderSkeleton={(key) => <div key={key} className="nv-card nv-card--skeleton" />}
              renderItem={(item, i) => (
                <Link key={item.id} to={animeHref(item)} className="nv-card group">
                  <div className="nv-card__img">
                    {item.poster && <img src={item.poster} alt={item.title} loading="lazy" />}
                    <div className="nv-card__overlay" />
                    <div className="nv-card__score">{displayScore(item, i)}</div>
                    <div className="nv-card__foot">
                      <h3 className="nv-card__title">{item.title}</h3>
                      <p className="nv-card__meta">{cardMeta(item)}</p>
                    </div>
                  </div>
                </Link>
              )}
            />
          </section>

          {/* ── TOP AIRING ───────────────────────────────────────────── */}
          <section className="nv-section">
            <HorizontalCarouselSection
              title="Top Airing Anime"
              accent="primary"
              railClassName="nv-rail--cards"
              itemCount={5}
              loading={loading.home}
              items={topAiringItems}
              carousel={topAiringCarousel}
              renderSkeleton={(key) => <div key={key} className="nv-card nv-card--skeleton" />}
              renderItem={(item, i) => (
                <Link key={item.id} to={animeHref(item)} className="nv-card group">
                  <div className="nv-card__img">
                    {item.poster && <img src={item.poster} alt={item.title} loading="lazy" />}
                    <div className="nv-card__overlay" />
                    <div className="nv-card__score">{displayScore(item, i)}</div>
                    <div className="nv-card__foot">
                      <h3 className="nv-card__title">{item.title}</h3>
                      <p className="nv-card__meta">{cardMeta(item)}</p>
                    </div>
                  </div>
                </Link>
              )}
            />
          </section>

          {/* ── NEWLY ADDED ──────────────────────────────────────────── */}
          <section className="nv-section">
            <HorizontalCarouselSection
              title="Newly Added Anime"
              accent="secondary"
              railClassName="nv-rail--cards"
              itemCount={5}
              loading={loading.home}
              items={newlyAddedItems}
              carousel={newlyAddedCarousel}
              renderSkeleton={(key) => <div key={key} className="nv-card nv-card--skeleton" />}
              renderItem={(item, i) => (
                <Link key={item.id} to={animeHref(item)} className="nv-card group">
                  <div className="nv-card__img">
                    {item.poster && <img src={item.poster} alt={item.title} loading="lazy" />}
                    <div className="nv-card__overlay" />
                    <div className="nv-card__score">{displayScore(item, i)}</div>
                    <div className="nv-card__foot">
                      <h3 className="nv-card__title">{item.title}</h3>
                      <p className="nv-card__meta">{cardMeta(item)}</p>
                    </div>
                  </div>
                </Link>
              )}
            />
          </section>

          {/* ── TOP UPCOMING ─────────────────────────────────────────── */}
          <section className="nv-section">
            <HorizontalCarouselSection
              title="Top Upcoming Anime"
              accent="primary"
              railClassName="nv-rail--cards"
              itemCount={5}
              loading={loading.home}
              items={topUpcomingItems}
              carousel={topUpcomingCarousel}
              renderSkeleton={(key) => <div key={key} className="nv-card nv-card--skeleton" />}
              renderItem={(item, i) => (
                <Link key={item.id} to={animeHref(item)} className="nv-card group">
                  <div className="nv-card__img">
                    {item.poster && <img src={item.poster} alt={item.title} loading="lazy" />}
                    <div className="nv-card__overlay" />
                    <div className="nv-card__score">{displayScore(item, i)}</div>
                    <div className="nv-card__foot">
                      <h3 className="nv-card__title">{item.title}</h3>
                      <p className="nv-card__meta">{cardMeta(item)}</p>
                    </div>
                  </div>
                </Link>
              )}
            />
          </section>

          {/* ── MOST FAVORITE ────────────────────────────────────────── */}
          <section className="nv-section">
            <HorizontalCarouselSection
              title="Most Favorite Anime"
              accent="secondary"
              railClassName="nv-rail--cards"
              itemCount={5}
              loading={loading.home}
              items={mostFavoriteItems}
              carousel={mostFavoriteCarousel}
              renderSkeleton={(key) => <div key={key} className="nv-card nv-card--skeleton" />}
              renderItem={(item, i) => (
                <Link key={item.id} to={animeHref(item)} className="nv-card group">
                  <div className="nv-card__img">
                    {item.poster && <img src={item.poster} alt={item.title} loading="lazy" />}
                    <div className="nv-card__overlay" />
                    <div className="nv-card__score">{displayScore(item, i)}</div>
                    <div className="nv-card__foot">
                      <h3 className="nv-card__title">{item.title}</h3>
                      <p className="nv-card__meta">{cardMeta(item)}</p>
                    </div>
                  </div>
                </Link>
              )}
            />
          </section>

          {/* ── LATEST COMPLETED ─────────────────────────────────────── */}
          <section className="nv-section">
            <HorizontalCarouselSection
              title="Latest Completed Anime"
              accent="primary"
              railClassName="nv-rail--cards"
              itemCount={5}
              loading={loading.home}
              items={latestCompletedItems}
              carousel={latestCompletedCarousel}
              renderSkeleton={(key) => <div key={key} className="nv-card nv-card--skeleton" />}
              renderItem={(item, i) => (
                <Link key={item.id} to={animeHref(item)} className="nv-card group">
                  <div className="nv-card__img">
                    {item.poster && <img src={item.poster} alt={item.title} loading="lazy" />}
                    <div className="nv-card__overlay" />
                    <div className="nv-card__score">{displayScore(item, i)}</div>
                    <div className="nv-card__foot">
                      <h3 className="nv-card__title">{item.title}</h3>
                      <p className="nv-card__meta">{cardMeta(item)}</p>
                    </div>
                  </div>
                </Link>
              )}
            />
          </section>

        </div>
      </main>

      {/* ══ FOOTER ══════════════════════════════════════════════════════ */}
      <footer className="nv-footer">
        <div className="nv-footer__top">
          <div className="nv-footer__brand">
            <span className="nv-brand" aria-label="Ani Neo">
              <BrandMark className="nv-brand__image" />
            </span>
            <p>The premier destination for high-fidelity anime streaming. Immerse yourself in the digital void where every pixel tells a story.</p>
          </div>
          <div className="nv-footer__grid">
            {FOOTER_GROUPS.map((group) => (
              <div key={group.title} className="nv-footer__col">
                <h4>{group.title}</h4>
                {group.links.map((link) => (
                  link.external ? (
                    <a
                      key={link.label}
                      href={link.to}
                      className={group.hoverClass}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link key={link.label} to={link.to} className={group.hoverClass}>{link.label}</Link>
                  )
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="nv-footer__bottom">
          <span>© 2025 ANINEO MEDIA GROUP</span>
          <span>SYSTEM_STATUS: <strong className="nv-online">ONLINE</strong></span>
        </div>
      </footer>

      {/* ══ MOBILE NAV ══════════════════════════════════════════════════ */}
      <nav className="nv-mobile-nav">
        {[
          { label: 'Home',   icon: 'home',         to: '/',       fill: true },
          { label: 'Hot',    icon: 'bolt',          to: '/explore' },
          { label: 'Void',   icon: 'search',        to: '/explore' },
          { label: 'List',   icon: 'video_library', to: '/explore' },
        ].map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            className={({ isActive }) => `nv-mobile-nav__item${isActive ? ' is-active' : ''}`}
          >
            <span
              className="material-symbols-outlined"
              style={item.fill ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {item.icon}
            </span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function HorizontalCarouselSection({
  title,
  accent,
  railClassName,
  itemCount,
  loading,
  items,
  carousel,
  renderSkeleton,
  renderItem,
}) {
  return (
    <>
      <div className="nv-section__head">
        <h2 className="nv-section__title">
          <span className={`nv-bar nv-bar--${accent}`} />
          {title}
        </h2>
        <div className="nv-section__controls">
          {carousel.canScroll && (
            <>
              <button type="button" className="nv-ctrl-btn" onClick={carousel.prev} aria-label="Previous">
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <span className="nv-counter">{carousel.index + 1} / {carousel.totalSlides}</span>
              <button type="button" className="nv-ctrl-btn" onClick={carousel.next} aria-label="Next">
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </>
          )}
          <Link to="/explore" className="nv-view-all">View All</Link>
        </div>
      </div>

      <div
        ref={carousel.railRef}
        className={`nv-rail ${railClassName}`}
        {...carousel.hoverProps}
      >
        {loading || items.length === 0
          ? Array.from({ length: itemCount }).map((_, i) => renderSkeleton(i))
          : items.map(renderItem)}
      </div>

      {carousel.canScroll && (
        <div className="nv-dots nv-dots--section">
          {Array.from({ length: carousel.totalSlides }, (_, i) => (
            <button
              key={i}
              type="button"
              className={`nv-dot${i === carousel.index ? ' active' : ''}`}
              onClick={() => carousel.goTo(i)}
              aria-label={`Page ${i + 1}`}
            />
          ))}
        </div>
      )}
    </>
  );
}

function displayScore(item, i) {
  return item?.rank ? item.rank.toFixed(1) : (9.8 - i * 0.15).toFixed(1);
}

function cardMeta(item) {
  const eps = item?.episodes?.sub || item?.episodes?.eps || '?';
  return `${eps} Episodes • ${item?.type || 'Action'}`;
}

function episodeBadge(item) {
  return `EP ${(item?.episodes?.sub || item?.episodes?.eps || 1).toString().padStart(2, '0')}`;
}

function recentStamp(item) {
  if (item?.rank === 1) return 'NEW';
  return `${Math.max(2, (item?.rank || 2) * 2)}h ago`;
}

function heroMeta(item, info) {
  return [
    item?.type || info?.type || 'Series',
    item?.episodes?.sub ? `E${item.episodes.sub}` : 'E12',
    info?.genres?.slice(0, 2).join(', ') || 'Action, Cyberpunk',
  ].join(' • ');
}

function mobileItemHint(label) {
  return (
    {
      Home: 'Back to the main hub',
      Trending: 'See what is heating up',
      Library: 'Browse saved collections',
      Schedule: 'Track upcoming drops',
    }[label] || 'Open section'
  );
}

function formatHeroTitle(title) {
  const words = String(title || '').trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) {
    return <span className="nv-hero__title-accent">{title?.toUpperCase()}</span>;
  }
  const half = Math.ceil(words.length / 2);
  const line1 = words.slice(0, half).join(' ').toUpperCase();
  const line2 = words.slice(half).join(' ').toUpperCase();
  return (
    <>
      {line1}
      {line2 && (
        <>
          <br />
          <span className="nv-hero__title-accent">{line2}</span>
        </>
      )}
    </>
  );
}

function truncateWords(text, maxWords) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(' ');
  return `${words.slice(0, maxWords).join(' ')}...`;
}

function animeHref(item) { return item?.id ? `/anime/${item.id}` : '/explore'; }
function watchHref(item) { return item?.id ? `/watch/${item.id}`  : '/explore'; }
