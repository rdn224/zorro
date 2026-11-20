import type { ReactNode } from 'react';
import type { Order } from '../db/types';
import { dateTime, money } from '../lib/format';

/** One order: date, items with quantities, total. */
export default function OrderCard(props: {
  order: Order;
  title?: ReactNode;
  onClick?: () => void;
  onDelete?: () => void;
}) {
  const { order } = props;
  return (
    <div className="card order" onClick={props.onClick} role={props.onClick ? 'button' : undefined}>
      <div className="row">
        <span className="muted">{dateTime(order.created_at)}</span>
        <b>{money(order.total)}</b>
      </div>
      {props.title && <div className="order-title">{props.title}</div>}
      <ul className="items">
        {order.items.map((i, n) => (
          <li key={n}>
            <span>{i.name}</span>
            <span className="qty">×{i.qty}</span>
          </li>
        ))}
      </ul>
      {order.note && <div className="note">📝 {order.note}</div>}
      {props.onDelete && (
        <button
          className="link danger"
          onClick={(e) => {
            e.stopPropagation();
            props.onDelete!();
          }}
        >
          Устгах
        </button>
      )}
    </div>
  );
}
