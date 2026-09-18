export default function Header() {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-bg-primary border-b border-border-default">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20V10" />
            <path d="M18 20V4" />
            <path d="M6 20v-4" />
          </svg>
        </div>
        <div>
          <div className="text-sm font-semibold text-text-primary leading-tight">ScrollControl</div>
          <div className="text-[10px] text-text-muted leading-tight">Your life. Your scroll.</div>
        </div>
      </div>
    </div>
  );
}
