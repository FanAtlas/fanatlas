export const crowdAlerts = [
  {
    id: "metlife-stadium",
    name: "MetLife Stadium",
    location: "New York/New Jersey",
    category: "stadium",
    congestion: 92,
    status: "Very High",
    source: "FanAtlas demo sensor model",
    recommendation: "Arrive early and use train or official shuttle."
  },
  {
    id: "sofi-stadium",
    name: "SoFi Stadium",
    location: "Los Angeles",
    category: "stadium",
    congestion: 64,
    status: "High",
    source: "FanAtlas demo sensor model",
    recommendation: "Expect rideshare delays near stadium exits."
  },
  {
    id: "times-square-fan-zone",
    name: "Times Square Fan Park",
    location: "New York",
    category: "fan-zone",
    congestion: 74,
    status: "High",
    source: "FanAtlas demo sensor model",
    recommendation: "Use side streets and set a meetup point."
  },
  {
    id: "azteca-fan-fest",
    name: "Azteca Fan Fest",
    location: "Mexico City",
    category: "fan-zone",
    congestion: 48,
    status: "Medium",
    source: "FanAtlas demo sensor model",
    recommendation: "Hydrate and enter before peak screens fill."
  },
  {
    id: "katz-deli",
    name: "Katz's Delicatessen",
    location: "New York",
    category: "restaurant",
    congestion: 88,
    status: "Very High",
    source: "FanAtlas demo reservation model",
    recommendation: "Reserve ahead or choose off-peak dining."
  },
  {
    id: "blue-bottle-sf",
    name: "Blue Bottle Coffee",
    location: "San Francisco",
    category: "restaurant",
    congestion: 28,
    status: "Low",
    source: "FanAtlas demo reservation model",
    recommendation: "Good low-crowd stop before transit."
  }
];

export const alerts = [
  { title: "Stadium Bag Policy Reminder", message: "Only transparent bags are recommended. Leave large backpacks at your hotel.", severity: "warning", city: "All stadiums" },
  { title: "Mexico City Altitude Warning", message: "Estadio Azteca sits above 2,200m elevation. Drink water and avoid heavy alcohol on arrival day.", severity: "warning", city: "Mexico City" },
  { title: "Dallas Heat Advisory", message: "Temperatures can reach 38°C / 100°F. Hydrate, wear sunscreen, and take shade breaks.", severity: "danger", city: "Dallas" }
];

export const places = [
  {
    name: "Katz's Delicatessen",
    category: "restaurant",
    city: "New York",
    rating: 4.6,
    busy: "very_high",
    distance: "1.2 km",
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=900&q=80",
    reserveUrl: "https://www.opentable.com/s?term=Katz%27s%20Delicatessen%20New%20York",
    uberEatsUrl: "https://www.ubereats.com/search?q=Katz%27s%20Delicatessen%20New%20York",
    doorDashUrl: "https://www.doordash.com/search/store/katz%27s%20delicatessen/",
    safety: 9,
    price: "$$"
  },
  {
    name: "El Huequito",
    category: "restaurant",
    city: "Mexico City",
    rating: 4.7,
    busy: "high",
    distance: "3.8 km",
    image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=900&q=80",
    reserveUrl: "https://www.opentable.com/s?term=El%20Huequito%20Mexico%20City",
    uberEatsUrl: "https://www.ubereats.com/search?q=El%20Huequito%20Mexico%20City",
    doorDashUrl: "https://www.doordash.com/search/store/el%20huequito/",
    safety: 8.5,
    price: "$"
  },
  {
    name: "Blue Bottle Coffee",
    category: "cafe",
    city: "San Francisco",
    rating: 4.5,
    busy: "moderate",
    distance: "2.4 km",
    image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=900&q=80",
    reserveUrl: "https://www.opentable.com/s?term=Blue%20Bottle%20Coffee%20San%20Francisco",
    uberEatsUrl: "https://www.ubereats.com/search?q=Blue%20Bottle%20Coffee%20San%20Francisco",
    doorDashUrl: "https://www.doordash.com/search/store/blue%20bottle%20coffee/",
    safety: 8,
    price: "$$"
  },
  {
    name: "Hard Rock Cafe",
    category: "restaurant",
    city: "Miami",
    rating: 4.2,
    busy: "high",
    distance: "5.1 km",
    image: "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=900&q=80",
    reserveUrl: "https://www.opentable.com/s?term=Hard%20Rock%20Cafe%20Miami",
    uberEatsUrl: "https://www.ubereats.com/search?q=Hard%20Rock%20Cafe%20Miami",
    doorDashUrl: "https://www.doordash.com/search/store/hard%20rock%20cafe/",
    safety: 8,
    price: "$$"
  }
];

export const fanZones = [
  {
    name: "Times Square Fan Park",
    city: "New York",
    dates: "Jun 11 – Jul 19",
    hours: "10am–2am",
    capacity: "50,000",
    entry: "FREE ENTRY",
    safety: 8,
    actions: [
      { label: "VIP Packages", tone: "vip", tab: "fanzonevip" },
      { label: "Fan Zone Transportation", tone: "transport", tab: "fanzonetransport" },
      { label: "Official Merchandise", tone: "merch", tab: "fanzonemerch" }
    ]
  },
  {
    name: "SoFi Fan Village",
    city: "Los Angeles",
    dates: "Jun 12 – Jul 15",
    hours: "12pm–12am",
    capacity: "30,000",
    entry: "VIP AVAILABLE",
    safety: 8,
    actions: [
      { label: "VIP Packages", tone: "vip", tab: "fanzonevip" },
      { label: "Fan Zone Transportation", tone: "transport", tab: "fanzonetransport" },
      { label: "Official Merchandise", tone: "merch", tab: "fanzonemerch" }
    ]
  },
  {
    name: "Azteca Fan Fest",
    city: "Mexico City",
    dates: "Jun 11 – Jul 19",
    hours: "All day",
    capacity: "80,000",
    entry: "FREE ENTRY",
    safety: 7,
    actions: [
      { label: "VIP Packages", tone: "vip", tab: "fanzonevip" },
      { label: "Fan Zone Transportation", tone: "transport", tab: "fanzonetransport" },
      { label: "Official Merchandise", tone: "merch", tab: "fanzonemerch" }
    ]
  },
  {
    name: "Toronto Fan Experience",
    city: "Toronto",
    dates: "Jun 12 – Jul 13",
    hours: "12pm–10pm",
    capacity: "35,000",
    entry: "FREE ENTRY",
    safety: 9,
    actions: [
      { label: "VIP Packages", tone: "vip", tab: "fanzonevip" },
      { label: "Fan Zone Transportation", tone: "transport", tab: "fanzonetransport" },
      { label: "Official Merchandise", tone: "merch", tab: "fanzonemerch" }
    ]
  }
];

export const matches = [];

export const stadiums = [
  { name: "MetLife Stadium", city: "New York/New Jersey", country: "USA", capacity: "82,500", tip: "Train + shuttle recommended" },
  { name: "SoFi Stadium", city: "Los Angeles", country: "USA", capacity: "70,000", tip: "Expect traffic and rideshare delays" },
  { name: "AT&T Stadium", city: "Dallas", country: "USA", capacity: "80,000", tip: "Prepare for heat and parking delays" },
  { name: "Estadio Azteca", city: "Mexico City", country: "Mexico", capacity: "87,000", tip: "Hydrate due to altitude" },
  { name: "BMO Field", city: "Toronto", country: "Canada", capacity: "45,000", tip: "Use TTC or GO Transit" }
];

export const emergencyServices = [
  { name: "Emergency Services USA", category: "Police / Ambulance / Fire", city: "USA", phone: "911", address: "Nationwide" },
  { name: "Emergency Services Canada", category: "Police / Ambulance / Fire", city: "Canada", phone: "911", address: "Nationwide" },
  { name: "Emergency Services Mexico", category: "Police / Ambulance / Fire", city: "Mexico", phone: "911", address: "Nationwide" },
  { name: "Mount Sinai Hospital", category: "Hospital", city: "New York", phone: "+1 212-241-6500", address: "1468 Madison Ave" },
  { name: "Cedars-Sinai Medical Center", category: "Hospital", city: "Los Angeles", phone: "+1 310-423-3277", address: "8700 Beverly Blvd" }
];

export const guides = [
  { phase: "Before Travel", title: "Documents & Entry", country: "USA / Canada / Mexico", content: "Check passport validity, visa/ETA requirements, travel insurance, and match ticket rules before departure." },
  { phase: "Before Travel", title: "Download Essentials", country: "All Host Countries", content: "Download FanAtlas, airline app, eSIM, transport apps, and offline city maps before flying." },
  { phase: "After Arrival", title: "Airport Safety", country: "All Host Cities", content: "Use official taxis, rideshare pickup zones, or public transit. Avoid people offering unofficial rides." },
  { phase: "During Stay", title: "Match Day Rules", country: "All Stadiums", content: "Arrive 2 hours early, check bag policy, hydrate, and plan your route home before kickoff." }
];

export const esimDeals = [
  { provider: "Airalo", bestFor: "Budget tourists", coverage: "USA + Canada + Mexico", data: "10 GB", price: "$9.99", url: "https://example.com/airalo-affiliate" },
  { provider: "Holafly", bestFor: "Unlimited data", coverage: "North America", data: "Unlimited", price: "$19.90", url: "https://example.com/holafly-affiliate" },
  { provider: "Nomad", bestFor: "Flexible plans", coverage: "USA + Mexico", data: "20 GB", price: "$14.99", url: "https://example.com/nomad-affiliate" }
];

export const hotelPartners = [
  { provider: "Booking.com", bestFor: "Hotels near stadiums", filter: "Walking distance", price: "From $120/night", url: "https://example.com/booking-affiliate" },
  { provider: "Expedia", bestFor: "Flight + hotel bundles", filter: "Family friendly", price: "Bundle deals", url: "https://example.com/expedia-affiliate" },
  { provider: "Hotels.com", bestFor: "Rewards travelers", filter: "Budget stays", price: "Member prices", url: "https://example.com/hotels-affiliate" }
];

export const mapPins = [
  { label: "🏟 MetLife", top: "26%", left: "70%" },
  { label: "🎉 NYC Fan", top: "21%", left: "73%" },
  { label: "🍽 Miami", top: "71%", left: "72%" },
  { label: "🏥 Hospital", top: "31%", left: "67%" },
  { label: "☕ LA Cafe", top: "47%", left: "14%" },
  { label: "🏟 Azteca", top: "78%", left: "38%" },
  { label: "🎉 Dallas", top: "56%", left: "47%" }
];
