import { NavLink } from 'react-router-dom';
import { ListIcon, UserIcon } from './Icons.jsx';
import { haptic } from '../lib/telegram.js';

export default function BottomNav() {
  const onClick = () => haptic('light');
  return (
    <nav className="nav">
      <NavLink to="/" end onClick={onClick}>
        <ListIcon />
        <span>Трекеры</span>
      </NavLink>
      <NavLink to="/profile" onClick={onClick}>
        <UserIcon />
        <span>Профиль</span>
      </NavLink>
    </nav>
  );
}
