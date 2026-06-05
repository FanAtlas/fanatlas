export function ProfilePage() {
  return (
    <>
      <div className="header">
        <div>
          <div className="logo">Profile</div>
          <div className="subtle">Preferences and membership</div>
        </div>
      </div>

      <div className="card">
        <p className="title">Guest User</p>
        <p className="subtle">Favorite team: Morocco</p>
        <p className="subtle">Language: English</p>
        <span className="badge">Free Plan</span>
      </div>

      <h3>Membership</h3>
      <div className="card">
        <p className="small-title">Free</p>
        <p className="subtle">Basic AI, match schedules, travel guides.</p>
      </div>
      <div className="card cyan">
        <p className="small-title">Premium — Coming Soon</p>
        <p className="subtle">Unlimited AI, offline maps, translator, priority alerts.</p>
      </div>
      <div className="card">
        <p className="small-title">VIP — Coming Soon</p>
        <p className="subtle">Concierge recommendations, VIP fan zones, exclusive deals.</p>
      </div>
    </>
  );
}
