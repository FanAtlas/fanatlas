export function HotelsPage() {
  const hotels = [
    {
      name: "Marriott Times Square",
      city: "New York",
      type: "Luxury",
      distance: "0.5 km"
    },
    {
      name: "Holiday Inn",
      city: "Los Angeles",
      type: "Mid Range",
      distance: "1.2 km"
    },
    {
      name: "Ibis Mexico City",
      city: "Mexico City",
      type: "Budget",
      distance: "0.9 km"
    }
  ];

  return (
    <>
      <div className="topbar">
        <div>
          <div className="brand">Hotels</div>
          <div className="subtle">
            Stay near stadiums and fan zones
          </div>
        </div>
      </div>

      {hotels.map((hotel) => (
        <div className="list-card" key={hotel.name}>
          <div className="thumb">🏨</div>

          <div>
            <strong>{hotel.name}</strong>

            <p>
              {hotel.city}
            </p>

            <p>
              {hotel.type} • {hotel.distance}
            </p>
          </div>
        </div>
      ))}
    </>
  );
}
