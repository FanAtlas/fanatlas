export const matches = [
  { team1: "Mexico", team2: "TBD", stadium: "Estadio Azteca", city: "Mexico City", date: "June 11, 2026", status: "Scheduled", fanZone: "Azteca Fan Fest" },
  { team1: "Canada", team2: "TBD", stadium: "BMO Field", city: "Toronto", date: "June 12, 2026", status: "Scheduled", fanZone: "Toronto Fan Experience" },
  { team1: "USA", team2: "TBD", stadium: "SoFi Stadium", city: "Los Angeles", date: "June 12, 2026", status: "Scheduled", fanZone: "SoFi Fan Village" }
];

export const fanZones = [
  { name: "Times Square Fan Park", city: "New York", hours: "12 PM - 11 PM", safety: 8, family: true },
  { name: "SoFi Fan Village", city: "Los Angeles", hours: "11 AM - Midnight", safety: 8, family: true },
  { name: "Azteca Fan Fest", city: "Mexico City", hours: "10 AM - Midnight", safety: 7, family: true },
  { name: "Toronto Fan Experience", city: "Toronto", hours: "12 PM - 10 PM", safety: 9, family: true }
];

export const places = [
  { name: "Stadium Grill", category: "Restaurant", city: "New York", rating: 4.6, busy: "High", safety: 8 },
  { name: "Fan Coffee House", category: "Cafe", city: "Toronto", rating: 4.7, busy: "Medium", safety: 9 },
  { name: "Azteca Tacos", category: "Restaurant", city: "Mexico City", rating: 4.8, busy: "High", safety: 7 }
];

export const alerts = [
  { title: "Heavy crowds expected", city: "Los Angeles", severity: "warning", message: "Arrive at least 2 hours early near SoFi Stadium." },
  { title: "Use official transport", city: "Mexico City", severity: "info", message: "Avoid unlicensed taxis after matches." },
  { title: "Hot weather reminder", city: "Dallas", severity: "warning", message: "Carry water and plan shade breaks." }
];

export const emergencyServices = [
  { name: "Emergency Services", category: "Police / Ambulance / Fire", city: "USA & Canada", phone: "911", address: "Nationwide" },
  { name: "Emergency Services", category: "Police / Ambulance / Fire", city: "Mexico", phone: "911", address: "Nationwide" },
  { name: "Toronto General Hospital", category: "Hospital", city: "Toronto", phone: "+1 416-340-3131", address: "200 Elizabeth St" },
  { name: "Cedars-Sinai Medical Center", category: "Hospital", city: "Los Angeles", phone: "+1 310-423-3277", address: "8700 Beverly Blvd" }
];

export const guides = [
  { phase: "Before Travel", title: "Documents & Entry", content: "Check passport validity, visa/ETA requirements, travel insurance, and match ticket rules before departure." },
  { phase: "Before Travel", title: "Download Essentials", content: "Download FanAtlas, airline app, eSIM, transport apps, and offline city maps before flying." },
  { phase: "After Arrival", title: "Airport Safety", content: "Use official taxis, rideshare pickup zones, or public transit. Avoid people offering unofficial rides." },
  { phase: "During Stay", title: "Match Day", content: "Arrive 2 hours early, check bag policy, hydrate, and plan your route home before kickoff." }
];
