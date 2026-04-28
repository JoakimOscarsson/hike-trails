import React from "react";
import { ArrowLeft } from "lucide-react";

export function DetailRow({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="detail-row">
      <div className="detail-icon" aria-hidden="true">
        {icon}
      </div>
      <div>
        <dt>{label}</dt>
        <dd>{value}</dd>
      </div>
    </div>
  );
}

export function InfoList({
  title,
  icon,
  items
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
}) {
  return (
    <section className="info-block">
      <h2>
        <span aria-hidden="true">{icon}</span>
        {title}
      </h2>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export function StatePanel({
  title,
  message,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}) {
  return (
    <main className="content">
      <section className="description state-panel">
        <h2>{title}</h2>
        <p>{message}</p>
        {actionLabel && onAction ? (
          <div className="state-actions">
            <button className="secondary-action" type="button" onClick={onAction}>
              {actionLabel}
            </button>
            {secondaryActionLabel && onSecondaryAction ? (
              <button className="secondary-action" type="button" onClick={onSecondaryAction}>
                {secondaryActionLabel}
              </button>
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}

export function LoadingDetails() {
  return <StatePanel title="Loading" message="Fetching route details..." />;
}

export function BackToOverviewButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="secondary-action overview-back" type="button" onClick={onClick}>
      <ArrowLeft size={17} aria-hidden="true" />
      Back to overview
    </button>
  );
}
