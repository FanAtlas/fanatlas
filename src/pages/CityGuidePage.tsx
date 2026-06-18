import { useMemo, useState } from "react";

type HostCountry = "USA" | "Canada" | "Mexico";

type CityGuide = {
  city: string;
  country: HostCountry;
  stadium: string;
  overview: string;
  attractions: string[];
  restaurants: string[];
  safetyTips: string[];
  transportation: string[];
  fanZones: string[];
  hotels: string[];
};

const cityGuides: CityGuide[] = [
  {
    city: "New York/New Jersey",
    country: "USA",
    stadium: "MetLife Stadium",
    overview: "Dense transit, huge fan crowds, and late-night demand around Manhattan and Meadowlands.",
    attractions: ["Times Square", "Central Park", "Hudson Yards", "Statue of Liberty ferry"],
    restaurants: ["Katz's Delicatessen", "Los Tacos No. 1", "Chelsea Market", "Jersey City waterfront dining"],
    safetyTips: ["Use NJ Transit or official shuttles for stadium trips.", "Avoid unofficial ticket sellers near transit hubs.", "Set a post-match meetup point before entering the stadium."],
    transportation: ["NJ Transit train to Meadowlands", "Subway and PATH for city movement", "Rideshare pickup away from stadium exits"],
    fanZones: ["Times Square Fan Park", "Hudson River watch parties", "Jersey City waterfront screens"],
    hotels: ["Midtown Manhattan for transit access", "Secaucus for stadium proximity", "Jersey City for skyline and PATH access"]
  },
  {
    city: "Los Angeles",
    country: "USA",
    stadium: "SoFi Stadium",
    overview: "Car-first region with heavy match-day traffic and strong beach, food, and entertainment options.",
    attractions: ["Santa Monica Pier", "Griffith Observatory", "Hollywood", "The Getty"],
    restaurants: ["Grand Central Market", "Guelaguetza", "Kogi BBQ", "Inglewood pre-match restaurants"],
    safetyTips: ["Leave early for SoFi traffic.", "Use official rideshare zones only.", "Keep valuables out of parked cars."],
    transportation: ["Official SoFi shuttles", "Metro plus rideshare staging", "Pre-booked hotel transfers"],
    fanZones: ["SoFi Fan Village", "Downtown LA watch parties", "Santa Monica fan screens"],
    hotels: ["LAX/Inglewood for stadium access", "Downtown LA for food and transit", "Santa Monica for leisure stays"]
  },
  {
    city: "Dallas",
    country: "USA",
    stadium: "AT&T Stadium",
    overview: "Large stadium footprint, hot summer conditions, and car-heavy match-day travel.",
    attractions: ["Fort Worth Stockyards", "Dallas Arts District", "Klyde Warren Park", "Bishop Arts District"],
    restaurants: ["Pecan Lodge", "Mi Cocina", "Terry Black's BBQ", "Arlington sports bars"],
    safetyTips: ["Plan for heat and hydration.", "Confirm pickup zones before kickoff.", "Do not walk long distances in extreme heat."],
    transportation: ["Official parking and shuttles", "Hotel shuttle where available", "Rideshare staging areas"],
    fanZones: ["Arlington Fan Fest", "Downtown Dallas watch parties", "Fort Worth fan events"],
    hotels: ["Arlington for stadium access", "Downtown Dallas for nightlife", "Las Colinas for business hotels"]
  },
  {
    city: "San Francisco Bay Area",
    country: "USA",
    stadium: "Levi's Stadium",
    overview: "Spread-out region with strong public transit links and high hotel demand near Santa Clara.",
    attractions: ["Golden Gate Bridge", "Fisherman's Wharf", "Santana Row", "Stanford campus"],
    restaurants: ["La Taqueria", "San Pedro Square Market", "Swan Oyster Depot", "Santa Clara food halls"],
    safetyTips: ["Keep bags hidden in cars.", "Check late-night transit times.", "Layer clothing for Bay Area temperature swings."],
    transportation: ["VTA light rail", "Caltrain connections", "Rideshare outside stadium congestion"],
    fanZones: ["San Jose Fan Plaza", "San Francisco waterfront screens", "Santa Clara stadium village"],
    hotels: ["Santa Clara near stadium", "San Jose for transit", "San Francisco for sightseeing"]
  },
  {
    city: "Seattle",
    country: "USA",
    stadium: "Lumen Field",
    overview: "Walkable downtown stadium area with excellent light rail access and waterfront attractions.",
    attractions: ["Pike Place Market", "Space Needle", "Waterfront", "Museum of Pop Culture"],
    restaurants: ["Ivar's", "The Pink Door", "Paseo", "International District dining"],
    safetyTips: ["Use light rail after matches.", "Expect crowded downtown sidewalks.", "Carry a rain layer."],
    transportation: ["Link light rail", "Downtown walking routes", "Waterfront rideshare zones"],
    fanZones: ["Seattle Center Fan Fest", "Pioneer Square watch parties", "Waterfront fan events"],
    hotels: ["Downtown Seattle", "South Lake Union", "Airport hotels on light rail"]
  },
  {
    city: "Houston",
    country: "USA",
    stadium: "NRG Stadium",
    overview: "Hot and humid match days, strong food scene, and stadium access by rail or rideshare.",
    attractions: ["Space Center Houston", "Museum District", "Buffalo Bayou", "Discovery Green"],
    restaurants: ["The Original Ninfa's", "Truth BBQ", "Hugo's", "Chinatown restaurants"],
    safetyTips: ["Plan shade and water breaks.", "Use official pedestrian routes around NRG.", "Check storm forecasts."],
    transportation: ["METRORail Red Line", "Official parking", "Rideshare pickup zones"],
    fanZones: ["Discovery Green Fan Zone", "NRG stadium plaza", "Downtown watch parties"],
    hotels: ["Medical Center/NRG", "Downtown Houston", "Galleria area"]
  },
  {
    city: "Atlanta",
    country: "USA",
    stadium: "Mercedes-Benz Stadium",
    overview: "Downtown stadium with MARTA access, major attractions, and heavy event traffic.",
    attractions: ["Georgia Aquarium", "World of Coca-Cola", "BeltLine", "Ponce City Market"],
    restaurants: ["Busy Bee Cafe", "Krog Street Market", "Antico Pizza", "Mary Mac's Tea Room"],
    safetyTips: ["Use MARTA for stadium trips.", "Stay on busy downtown routes late at night.", "Keep mobile tickets ready before security."],
    transportation: ["MARTA to Vine City or GWCC", "Downtown walking routes", "Rideshare after crowd release"],
    fanZones: ["Centennial Olympic Park Fan Zone", "BeltLine watch parties", "Downtown fan village"],
    hotels: ["Downtown Atlanta", "Midtown", "Airport hotels on MARTA"]
  },
  {
    city: "Miami",
    country: "USA",
    stadium: "Hard Rock Stadium",
    overview: "High heat, beach tourism, and spread-out travel between stadium, beaches, and downtown.",
    attractions: ["South Beach", "Wynwood Walls", "Little Havana", "Bayside Marketplace"],
    restaurants: ["Versailles", "Joe's Stone Crab", "Coyo Taco", "Yardbird"],
    safetyTips: ["Use sunscreen and hydrate.", "Pre-book stadium transportation.", "Watch for beach and nightlife pickpocketing."],
    transportation: ["Brightline or Tri-Rail plus shuttle", "Hotel transfer", "Rideshare pickup zones"],
    fanZones: ["Bayfront Fan Fest", "Wynwood watch parties", "Miami Beach screens"],
    hotels: ["Aventura/North Miami for stadium", "Brickell for city access", "Miami Beach for leisure"]
  },
  {
    city: "Kansas City",
    country: "USA",
    stadium: "Arrowhead Stadium",
    overview: "Stadium complex with legendary BBQ culture and car-oriented match-day movement.",
    attractions: ["National WWI Museum", "Union Station", "Country Club Plaza", "Power & Light District"],
    restaurants: ["Joe's Kansas City BBQ", "Arthur Bryant's", "Q39", "Town Topic"],
    safetyTips: ["Use official stadium parking routes.", "Plan rideshare pickup before kickoff.", "Hydrate during hot afternoon matches."],
    transportation: ["Official shuttles", "Stadium parking", "Rideshare staging zones"],
    fanZones: ["Power & Light Fan Zone", "Arrowhead tailgate areas", "Downtown watch parties"],
    hotels: ["Downtown Kansas City", "Country Club Plaza", "Airport hotels"]
  },
  {
    city: "Philadelphia",
    country: "USA",
    stadium: "Lincoln Financial Field",
    overview: "Compact sports complex with strong subway access and historic sightseeing nearby.",
    attractions: ["Independence Hall", "Liberty Bell", "Reading Terminal Market", "Museum of Art"],
    restaurants: ["Reading Terminal Market", "Pat's King of Steaks", "Zahav", "South Philly restaurants"],
    safetyTips: ["Use SEPTA for sports complex access.", "Avoid unofficial parking offers.", "Expect crowded subway platforms after full-time."],
    transportation: ["SEPTA Broad Street Line", "Sports complex walking routes", "Taxi/rideshare after crowd release"],
    fanZones: ["Center City Fan Zone", "Sports complex fan village", "Old City watch parties"],
    hotels: ["Center City", "Stadium district", "University City"]
  },
  {
    city: "Boston",
    country: "USA",
    stadium: "Gillette Stadium",
    overview: "Suburban stadium requiring extra travel planning from Boston and airport hotels.",
    attractions: ["Freedom Trail", "Fenway Park area", "Boston Common", "Seaport"],
    restaurants: ["Union Oyster House", "Neptune Oyster", "Time Out Market", "North End Italian restaurants"],
    safetyTips: ["Confirm event train schedules.", "Book return transport early.", "Carry a light jacket for evening temperature drops."],
    transportation: ["Commuter rail or event train", "Official shuttle", "Pre-booked transfer"],
    fanZones: ["Boston Common Fan Zone", "Patriot Place events", "Seaport watch parties"],
    hotels: ["Downtown Boston", "Back Bay", "Foxborough/Patriot Place"]
  },
  {
    city: "Toronto",
    country: "Canada",
    stadium: "BMO Field",
    overview: "Transit-friendly city with waterfront attractions, strong food options, and compact match-day routes.",
    attractions: ["CN Tower", "Toronto Islands", "Distillery District", "Kensington Market"],
    restaurants: ["St. Lawrence Market", "Pai", "Aloette", "Queen West restaurants"],
    safetyTips: ["Use TTC and GO Transit.", "Expect waterfront crowds after matches.", "Carry weather layers."],
    transportation: ["TTC streetcar and subway", "GO Transit", "Downtown walking routes"],
    fanZones: ["Toronto Fan Experience", "Waterfront fan screens", "Nathan Phillips Square watch parties"],
    hotels: ["Downtown Toronto", "Waterfront", "Liberty Village"]
  },
  {
    city: "Vancouver",
    country: "Canada",
    stadium: "BC Place",
    overview: "Compact downtown stadium city with excellent SkyTrain access and outdoor attractions.",
    attractions: ["Stanley Park", "Granville Island", "Gastown", "Capilano area"],
    restaurants: ["Miku", "Hawksworth", "Richmond night market", "Commercial Drive restaurants"],
    safetyTips: ["Use SkyTrain and walk busy routes.", "Prepare for rain.", "Check ferry or mountain trip timing before match day."],
    transportation: ["SkyTrain to Stadium-Chinatown", "Downtown walking routes", "Taxi or rideshare after match"],
    fanZones: ["Downtown Vancouver Fan Zone", "BC Place plaza", "False Creek watch parties"],
    hotels: ["Downtown Vancouver", "Yaletown", "Richmond near airport"]
  },
  {
    city: "Mexico City",
    country: "Mexico",
    stadium: "Estadio Azteca",
    overview: "High-altitude capital with huge fan energy, historic attractions, and serious match-day traffic.",
    attractions: ["Zocalo", "Chapultepec Park", "Frida Kahlo Museum", "Coyoacan"],
    restaurants: ["El Huequito", "Contramar", "Pujol", "Taqueria Orinoco"],
    safetyTips: ["Hydrate because of altitude.", "Use verified rideshare or official taxi.", "Keep passport original secured and carry a copy."],
    transportation: ["Metro/light rail plus official guidance", "Hotel-arranged taxi", "Verified rideshare pickup"],
    fanZones: ["Azteca Fan Fest", "Zocalo watch parties", "Roma Norte fan events"],
    hotels: ["Roma/Condesa", "Polanco", "Coyoacan near Azteca routes"]
  },
  {
    city: "Guadalajara",
    country: "Mexico",
    stadium: "Estadio Akron",
    overview: "Cultural hub with tequila-region trips, strong dining, and stadium access that needs planning.",
    attractions: ["Hospicio Cabanas", "Tlaquepaque", "Tequila day trips", "Centro Historico"],
    restaurants: ["Karne Garibaldi", "La Tequila", "Santo Coyote", "Tlaquepaque restaurants"],
    safetyTips: ["Use hotel-arranged transport late at night.", "Confirm return rides before match entry.", "Keep valuables minimal in busy plazas."],
    transportation: ["Official stadium shuttle where available", "Verified rideshare", "Hotel transfer"],
    fanZones: ["Guadalajara Fan Fest", "Centro watch parties", "Tlaquepaque fan events"],
    hotels: ["Zona Expo", "Providencia", "Centro/Tlaquepaque"]
  },
  {
    city: "Monterrey",
    country: "Mexico",
    stadium: "Estadio BBVA",
    overview: "Mountain city with passionate football culture, hot weather, and stadium traffic near Guadalupe.",
    attractions: ["Macroplaza", "Fundidora Park", "Paseo Santa Lucia", "Chipinque viewpoints"],
    restaurants: ["El Gran Pastor", "La Nacional", "Mercado Barrio Antiguo", "Cabrito restaurants"],
    safetyTips: ["Plan for heat and sun.", "Use official or verified transport.", "Stay on well-lit routes after night matches."],
    transportation: ["Metro and shuttle combinations", "Verified rideshare", "Hotel transfer"],
    fanZones: ["Fundidora Fan Zone", "Barrio Antiguo watch parties", "BBVA stadium village"],
    hotels: ["San Pedro", "Centro Monterrey", "Guadalupe near stadium"]
  }
];

const countries: HostCountry[] = ["USA", "Canada", "Mexico"];

function InfoList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="city-guide-section">
      <h3>{title}</h3>
      <div className="city-guide-list">
        {items.map((item) => <p key={item}>{item}</p>)}
      </div>
    </section>
  );
}

export function CityGuidePage() {
  const [country, setCountry] = useState<HostCountry>("USA");
  const filteredCities = useMemo(() => cityGuides.filter((guide) => guide.country === country), [country]);
  const [selectedCity, setSelectedCity] = useState("New York/New Jersey");
  const guide = cityGuides.find((item) => item.city === selectedCity) || filteredCities[0] || cityGuides[0];

  function selectCountry(nextCountry: HostCountry) {
    const firstCity = cityGuides.find((item) => item.country === nextCountry);
    setCountry(nextCountry);
    if (firstCity) setSelectedCity(firstCity.city);
  }

  return (
    <div className="city-guide-page">
      <div className="topbar">
        <div>
          <div className="brand">City <span>Guides</span></div>
          <div className="subtle">Host city essentials for USA, Canada, and Mexico</div>
        </div>
      </div>

      <section className="city-guide-hero">
        <span>{guide.country} Host City</span>
        <h1>{guide.city}</h1>
        <p>{guide.overview}</p>
        <strong>{guide.stadium}</strong>
      </section>

      <div className="country-tabs">
        {countries.map((item) => (
          <button
            className={country === item ? "active" : ""}
            key={item}
            onClick={() => selectCountry(item)}
          >
            {item}
            <span>{cityGuides.filter((guide) => guide.country === item).length} cities</span>
          </button>
        ))}
      </div>

      <label className="city-guide-picker">
        <span>Host City</span>
        <select className="input" value={guide.city} onChange={(event) => setSelectedCity(event.target.value)}>
          {filteredCities.map((item) => (
            <option key={item.city} value={item.city}>{item.city}</option>
          ))}
        </select>
      </label>

      <InfoList title="Top Attractions" items={guide.attractions} />
      <InfoList title="Restaurants" items={guide.restaurants} />
      <InfoList title="Safety Tips" items={guide.safetyTips} />
      <InfoList title="Transportation" items={guide.transportation} />
      <InfoList title="Fan Zones" items={guide.fanZones} />
      <InfoList title="Hotels" items={guide.hotels} />
    </div>
  );
}
