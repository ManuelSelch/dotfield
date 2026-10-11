export function TogglePill({ label, pressed, onClick }: {
  label: string;
  pressed: boolean;
  onClick: () => void;
}) {
  return <button type="button" className="home-feature-toggle" aria-pressed={pressed} onClick={onClick}>{label}</button>;
}
