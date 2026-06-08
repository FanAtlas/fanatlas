export function HotelsPage() {
  const hotels = [
    {
      name: "Ibis Mexico City",
      city: "Mexico City",
      type: "Budget",
      distance: "0.9 km from stadium",
      price: "$80/night",
      url: "https://example.com/ibis-affiliate"
    },
    {
      name: "Holiday Inn",
      city: "Los Angeles",
      type: "Mid Range",
      distance: "1.2 km from stadium",
      price: "$145/night",
      url: "https://example.com/holidayinn-affiliate"
    },
    {
      name: "Marriott Times Square",
      city: "New York",
      type: "Luxury",
      distance: "0.5 km from fan zone",
      price: "$220/night",
      url: "https://example.com/marriott-affiliate"
    }
  ];

  const sections = ["Budget", "Mid Range", "Luxury"];

  return (
    <>
      <div className="topbar">
        <div>
          <div className="brand">Hotels</div>
          <div className="subtle">Stay near stadiums and fan zones</div>
        </div>
      </div>

      {sections.map((section) => (
        <div key={section}>
          <h3>{section}</h3>

          {hotels
            .filter((hotel) => hotel.type === section)
            .map((hotel) => (
              <div className="product-card" key={hotel.name}>
                <div className="thumb">🏨</div>

                <div className="product-info">
                  <strong>{hotel.name}</strong>
                  <p>{hotel.city}</p>
                  <p>{hotel.distance}</p>
                  <span className="price">{hotel.price}</span>
                </div>

                <a className="buy-btn" href={hotel.url}>
                  View Hotel
                </a>
              </div>
            ))}
        </div>
      ))}
    </>
  );
}
