export type DeliveryProvider = {
  name: string;
  countries: string[];
  cities?: string[];
  searchUrl: (restaurantName: string, city: string) => string;
};

const search = (baseUrl: string, restaurantName: string, city: string) =>
  `${baseUrl}${encodeURIComponent(`${restaurantName} ${city}`)}`;

const countryAliases: Record<string, string> = {
  "america": "united states",
  "cape verde": "cabo verde",
  "england": "united kingdom",
  "great britain": "united kingdom",
  "uae": "united arab emirates",
  "uk": "united kingdom",
  "united states of america": "united states",
  "usa": "united states",
  "us": "united states"
};

export const deliveryProviders: DeliveryProvider[] = [
  {
    name: "Uber Eats",
    countries: ["United States", "Canada", "United Kingdom", "France", "Spain"],
    searchUrl: (name, city) => search("https://www.ubereats.com/search?q=", name, city)
  },
  {
    name: "DoorDash",
    countries: ["United States", "Canada"],
    searchUrl: (name, city) => search("https://www.doordash.com/search/store/", name, city)
  },
  {
    name: "Grubhub",
    countries: ["United States"],
    searchUrl: (name, city) => search("https://www.grubhub.com/search?queryText=", name, city)
  },
  {
    name: "SkipTheDishes",
    countries: ["Canada"],
    searchUrl: (name, city) => search("https://www.skipthedishes.com/search?search=", name, city)
  },
  {
    name: "Deliveroo",
    countries: ["United Kingdom", "France", "United Arab Emirates"],
    searchUrl: (name, city) => search("https://deliveroo.com/search?term=", name, city)
  },
  {
    name: "Just Eat",
    countries: ["United Kingdom", "Spain"],
    searchUrl: (name, city) => search("https://www.just-eat.co.uk/search?q=", name, city)
  },
  {
    name: "Glovo",
    countries: ["Spain", "Morocco"],
    searchUrl: (name, city) => search("https://glovoapp.com/search?query=", name, city)
  },
  {
    name: "Talabat",
    countries: ["United Arab Emirates", "Egypt"],
    searchUrl: (name, city) => search("https://www.talabat.com/search?q=", name, city)
  },
  {
    name: "Careem",
    countries: ["United Arab Emirates"],
    searchUrl: (name, city) => search("https://www.careem.com/food/?query=", name, city)
  },
  {
    name: "Elmenus",
    countries: ["Egypt"],
    searchUrl: (name, city) => search("https://www.elmenus.com/search/", name, city)
  }
];

export function getDeliveryProviders(country: string, city: string) {
  const normalizedCountry = normalize(country);
  const normalizedCity = normalize(city);

  return deliveryProviders.filter((provider) => {
    const countryMatches = provider.countries.some((value) => normalize(value) === normalizedCountry);
    if (!countryMatches) return false;
    if (!provider.cities?.length) return true;
    return provider.cities.some((value) => normalize(value) === normalizedCity);
  });
}

function normalize(value: string) {
  const normalized = value.trim().toLowerCase().replace(/[._-]+/g, " ").replace(/\s+/g, " ");
  return countryAliases[normalized] || normalized;
}
