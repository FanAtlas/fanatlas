export function ESimPage() {
  const plans = [
    {
      provider: "Airalo",
      data: "10GB",
      days: "30 Days"
    },
    {
      provider: "Holafly",
      data: "Unlimited",
      days: "15 Days"
    },
    {
      provider: "Nomad",
      data: "20GB",
      days: "30 Days"
    }
  ];

  return (
    <>
      <div className="topbar">
        <div>
          <div className="brand">eSIM</div>
          <div className="subtle">
            Travel internet packages
          </div>
        </div>
      </div>

      {plans.map((plan) => (
        <div className="list-card" key={plan.provider}>
          <div className="thumb">📶</div>

          <div>
            <strong>{plan.provider}</strong>

            <p>{plan.data}</p>

            <p>{plan.days}</p>
          </div>
        </div>
      ))}
    </>
  );
}
