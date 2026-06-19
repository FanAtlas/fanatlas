export type TransportationOption = {
  city: string;
  title: string;
  type: "shuttle" | "transit" | "rideshare" | "taxi" | "walking";
  description: string;
  estimatedTime: string;
  safetyTip: string;
  actionLabel: string;
  actionType: "map" | "uber" | "lyft" | "official" | "info";
  url?: string;
};

export const transportationCities = ["New York", "Los Angeles", "Mexico City", "Toronto"] as const;

export const transportationOptions: TransportationOption[] = [
  {
    city: "New York",
    title: "Subway / NJ Transit",
    type: "transit",
    description: "Use subway lines around Midtown and NJ Transit for stadium-area transfers where available.",
    estimatedTime: "15-45 min",
    safetyTip: "Use staffed stations and avoid empty platforms late at night.",
    actionLabel: "Official Transit Info",
    actionType: "official",
    url: "https://www.njtransit.com/"
  },
  {
    city: "New York",
    title: "Official shuttle / event transit",
    type: "shuttle",
    description: "Look for marked event shuttle pickup points near fan-zone exits.",
    estimatedTime: "10-30 min",
    safetyTip: "Follow event staff and posted pickup signs.",
    actionLabel: "Open in FanAtlas Map",
    actionType: "map"
  },
  {
    city: "New York",
    title: "Rideshare pickup zones",
    type: "rideshare",
    description: "Walk to marked rideshare areas away from the densest crowd before requesting a car.",
    estimatedTime: "15-35 min",
    safetyTip: "Confirm license plate and driver name before entering.",
    actionLabel: "Rideshare Pickup Info",
    actionType: "uber",
    url: "https://m.uber.com/ul/"
  },
  {
    city: "New York",
    title: "Walking route after fan zone",
    type: "walking",
    description: "Use well-lit main streets and move with groups after late matches.",
    estimatedTime: "5-25 min",
    safetyTip: "Set a meetup point before leaving the fan zone.",
    actionLabel: "Open in FanAtlas Map",
    actionType: "map"
  },
  {
    city: "Los Angeles",
    title: "Metro / event shuttle",
    type: "transit",
    description: "Use Metro where practical, then transfer to official event shuttles or marked pickup zones.",
    estimatedTime: "25-60 min",
    safetyTip: "Expect traffic near SoFi and leave extra time.",
    actionLabel: "Official Transit Info",
    actionType: "official",
    url: "https://www.metro.net/"
  },
  {
    city: "Los Angeles",
    title: "Rideshare pickup",
    type: "rideshare",
    description: "Use marked rideshare pickup areas and avoid informal offers outside event zones.",
    estimatedTime: "20-45 min",
    safetyTip: "Wait in lit, official pickup areas.",
    actionLabel: "Rideshare Pickup Info",
    actionType: "uber",
    url: "https://m.uber.com/ul/"
  },
  {
    city: "Los Angeles",
    title: "Taxi pickup zones",
    type: "taxi",
    description: "Use signed taxi stands near major hotels, transit stations, and event exits.",
    estimatedTime: "15-40 min",
    safetyTip: "Use licensed taxis only.",
    actionLabel: "Safety Tips",
    actionType: "info"
  },
  {
    city: "Mexico City",
    title: "Metro / official transit",
    type: "transit",
    description: "Use metro and official event transit guidance for central fan-zone movement.",
    estimatedTime: "20-50 min",
    safetyTip: "Keep valuables secure and avoid isolated exits late at night.",
    actionLabel: "Official Transit Info",
    actionType: "official",
    url: "https://www.metro.cdmx.gob.mx/"
  },
  {
    city: "Mexico City",
    title: "Authorized taxi",
    type: "taxi",
    description: "Use hotel-arranged or authorized taxis from marked stands.",
    estimatedTime: "15-45 min",
    safetyTip: "Avoid unmarked taxis and unsolicited rides.",
    actionLabel: "Safety Tips",
    actionType: "info"
  },
  {
    city: "Mexico City",
    title: "Rideshare pickup",
    type: "rideshare",
    description: "Request rideshare after moving to a clear pickup street away from heavy crowds.",
    estimatedTime: "15-40 min",
    safetyTip: "Match the vehicle plate and app details before entering.",
    actionLabel: "Rideshare Pickup Info",
    actionType: "uber",
    url: "https://m.uber.com/ul/"
  },
  {
    city: "Mexico City",
    title: "Walking safety tips",
    type: "walking",
    description: "Walk in groups on main streets and avoid shortcuts through quiet areas.",
    estimatedTime: "5-20 min",
    safetyTip: "Share your route with your group before leaving.",
    actionLabel: "Open in FanAtlas Map",
    actionType: "map"
  },
  {
    city: "Toronto",
    title: "TTC / GO Transit",
    type: "transit",
    description: "Use TTC and GO Transit for downtown fan-zone access and stadium movement.",
    estimatedTime: "15-45 min",
    safetyTip: "Follow station crowd-control signs after matches.",
    actionLabel: "Official Transit Info",
    actionType: "official",
    url: "https://www.ttc.ca/"
  },
  {
    city: "Toronto",
    title: "Event shuttle",
    type: "shuttle",
    description: "Use marked event shuttle service when available near large fan gatherings.",
    estimatedTime: "10-30 min",
    safetyTip: "Confirm shuttle direction before boarding.",
    actionLabel: "Open in FanAtlas Map",
    actionType: "map"
  },
  {
    city: "Toronto",
    title: "Rideshare pickup",
    type: "rideshare",
    description: "Request rideshare from marked pickup zones outside the densest crowds.",
    estimatedTime: "15-35 min",
    safetyTip: "Stay inside lit pickup areas while waiting.",
    actionLabel: "Rideshare Pickup Info",
    actionType: "lyft",
    url: "https://lyft.com/ride"
  },
  {
    city: "Toronto",
    title: "Walking route",
    type: "walking",
    description: "Use central, well-lit walking corridors for nearby hotels and transit stops.",
    estimatedTime: "5-25 min",
    safetyTip: "Keep your hotel route saved before leaving.",
    actionLabel: "Open in FanAtlas Map",
    actionType: "map"
  }
];
