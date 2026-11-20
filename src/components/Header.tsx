import type { ReactNode } from 'react';

export default function Header(props: { title: string; onBack?: () => void; action?: ReactNode }) {
  return (
    <header className="header">
      {props.onBack ? (
        <button className="header-btn" onClick={props.onBack} aria-label="Буцах">
          ‹ Буцах
        </button>
      ) : (
        <span />
      )}
      <h1>{props.title}</h1>
      <span className="header-action">{props.action}</span>
    </header>
  );
}
