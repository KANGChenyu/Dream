interface StatusMessageProps {
  title: string;
  message?: string;
}

export function StatusMessage({ title, message }: StatusMessageProps) {
  return (
    <div aria-live="polite" className="status-message" role="status">
      <p className="status-message__title">{title}</p>
      {message ? <p className="status-message__message">{message}</p> : null}
    </div>
  );
}
