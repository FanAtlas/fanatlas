export function ESimPage() {
  const esimPlans = [
    {
      provider: "Airalo",
      title: "Airalo North America",
      data: "10GB Data",
      days: "30 Days",
      coverage: "USA • Canada • Mexico",
      price: "$9.99",
      commission: true,
      url: "https://example.com/airalo-affiliate"
    },
    {
      provider: "Holafly",
      title: "Holafly Unlimited",
      data: "Unlimited Data",
      days: "15 Days",
      coverage: "USA • Canada • Mexico",
      price: "$19.90",
      commission: true,
      url: "https://example.com/holafly-affiliate"
    },
    {
      provider: "Nomad",
      title: "Nomad World Cup Plan",
      data: "20GB Data",
      days: "30 Days",
      coverage: "USA • Canada • Mexico",
      price: "$14.99",
      commission: true,
      url: "https://example.com/nomad-affiliate"
    }
  ];

  return (
    <>
      <div className="topbar">
        <div>
          <div className="brand">eSIM</div>
          <div className="subtle">Travel internet packages</div>
        </div>
      </div>

      {esimPlans.map((plan) => (
        <div className="product-card" key={plan.provider}>
          <div className="thumb">📶</div>

          <div className="product-info">
            <strong>{plan.title}</strong>
            <p>{plan.data} • {plan.days}</p>
            <p>{plan.coverage}</p>
            <span className="price">{plan.price}</span>
          </div>

          <a className="buy-btn" href={plan.url}>
            Buy eSIM
          </a>
        </div>
      ))}
    </>
  );
}
