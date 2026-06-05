export function TVConnectPage() {
  return <><div className="topbar"><div className="brand">Connect to TV <span>Beta</span></div></div><div className="tv-card"><div className="scan-circle">📺</div><h2>TV Mode</h2><p>Show route, match countdown, fan zones, weather, and safety alerts on hotel TV.</p><button className="primary-btn">Scan for TVs</button></div>{["Hotel Room TV","Chromecast","Apple TV","Samsung Smart TV","LG Smart TV"].map(d=><div className="list-card" key={d}><div className="thumb">📺</div><strong>{d}</strong><span>Pair →</span></div>)}</>
}
