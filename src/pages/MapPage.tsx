export function MapPage() {
  return (
    <>
      <div className="header">
        <div>
          <div className="logo">Map</div>
          <div className="subtle">In-app map UI placeholder. Connect Google Maps/Mapbox later.</div>
        </div>
      </div>

      <div className="card">
        <div className="row">
          <span className="badge">All</span>
          <span className="badge">Stadiums</span>
          <span className="badge">Fan Zones</span>
          <span className="badge">SOS</span>
        </div>
      </div>

      <div className="map-placeholder">
        <div className="pin" style={{ left: "18%", top: "20%" }}>🏟 Stadium</div>
        <div className="pin" style={{ left: "55%", top: "38%" }}>🎉 Fan Zone</div>
        <div className="pin" style={{ left: "34%", top: "62%" }}>🏥 Hospital</div>
        <div className="pin" style={{ left: "63%", top: "74%" }}>🍽 Food</div>
      </div>

      <div className="card">
        <p className="title">In-app directions plan</p>
        <p className="subtle">Next: connect Google Directions or Mapbox Directions to draw route lines without leaving the app.</p>
      </div>
    </>
  );
}
