import siteLogo from '../assets/discord-server-logo.png';

export function BrandMark({ className = '', alt = 'Ani Neo' }) {
  return <img className={className} src={siteLogo} alt={alt} />;
}
