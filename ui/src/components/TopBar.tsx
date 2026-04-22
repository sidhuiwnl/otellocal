
type TopBarProps = {
    connected : boolean;
    onClear : () => void;
}

export default function TopBar({ connected, onClear } : TopBarProps ) {
  return (
    <div className="topbar">
      <div className="topbar-left">
        <span className="logo">otel<span className="logo-dim">local</span></span>
        <span className={`status-pill ${connected ? 'connected' : 'disconnected'}`}>
          {connected ? '● live' : '○ connecting...'}
        </span>
        <span className="ports">grpc :4317 · http :4318</span>
      </div>

      <div className="topbar-right">
        <button className="btn" onClick={onClear}>clear</button>
      </div>
    </div>
  )
}