export function FanZonesPage() {
  const fanZones = [
    {
      name: "Times Square Fan Park",
      city: "New York",
      hours: "10am–2am",
      capacity: "50,000",
      entry: "Free Entry"
    },
    {
      name: "SoFi Fan Village",
      city: "Los Angeles",
      hours: "12pm–12am",
      capacity: "30,000",
      entry: "VIP Available"
    },
    {
      name: "Azteca Fan Fest",
      city: "Mexico City",
      hours: "All day",
      capacity: "80,000",
      entry: "Free Entry"
    }
  ];

  return (
    <>
      <div className="topbar">
        <div>
          <div className="brand">Fan Zones <span>2026</span></div>
          <div className="subtle">Watch parties, VIP packages, transport and merch</div>
        </div>
      </div>

      {fanZones.map((zone) => (
        <div className="zone-card" key={zone.name}>
          <h3>🎉 {zone.name}</h3>
          <p>📍 {zone.city}</p>
          <p>🕘 {zone.hours}</p>
          <p>👥 {zone.capacity}</p>
          <p>🎟 {zone.entry}</p>

          <div className="fanzone-actions">
            <a className="fanzone-btn vip" href="#" target="_blank" rel="noreferrer">
              ⭐ VIP Packages
            </a>

            <a className="fanzone-btn transport" href="#" target="_blank" rel="noreferrer">
              🚌 Fan Zone Transportation
            </a>

            <a className="fanzone-btn merch" href="#" target="_blank" rel="noreferrer">
              🛍 Official Merchandise
            </a>
          </div>
        </div>
      ))}
    </>
  );
}
