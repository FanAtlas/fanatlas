export type HotelSearchInput = {
  name: string;
  city: string;
  country: string;
};

export type HotelSearchLink = {
  label: string;
  url: string;
};

export function hotelSearchLinks(input: HotelSearchInput): HotelSearchLink[] {
  const query = [input.name, input.city, input.country].filter(Boolean).join(" ");
  const destination = [input.city, input.country].filter(Boolean).join(", ");

  return [
    {
      label: "Search on Booking.com",
      url: `https://www.booking.com/searchresults.html?${new URLSearchParams({ ss: query }).toString()}`
    },
    {
      label: "Search on Hotels.com",
      url: `https://www.hotels.com/Hotel-Search?${new URLSearchParams({ destination, q: query }).toString()}`
    },
    {
      label: "Search on Airbnb",
      url: `https://www.airbnb.com/s/${encodeURIComponent(destination)}/homes?${new URLSearchParams({ query }).toString()}`
    }
  ];
}
