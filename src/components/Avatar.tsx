const COLORS = ['#ff6b6b', '#f59f00', '#12b886', '#339af0', '#7950f2', '#e64980'];

/** Coloured circle with the customer's initial; the colour is stable per customer. */
export default function Avatar(props: { id: number; name: string; large?: boolean }) {
  const initial = props.name.trim().charAt(0).toUpperCase() || '☺';
  return (
    <span
      className={props.large ? 'avatar large' : 'avatar'}
      style={{ background: COLORS[props.id % COLORS.length] }}
      aria-hidden
    >
      {initial}
    </span>
  );
}
