export type EmergencyNumbers = {
  country: string;
  emergency: string;
  police: string;
  ambulance: string;
  fire: string;
};

export const emergencyNumbers: EmergencyNumbers[] = [
  { country: "United States", emergency: "911", police: "911", ambulance: "911", fire: "911" },
  { country: "Canada", emergency: "911", police: "911", ambulance: "911", fire: "911" },
  { country: "Mexico", emergency: "911", police: "911", ambulance: "911", fire: "911" },
  { country: "Morocco", emergency: "19 / 15", police: "19", ambulance: "15", fire: "15" },
  { country: "France", emergency: "112", police: "17", ambulance: "15", fire: "18" },
  { country: "Spain", emergency: "112", police: "112", ambulance: "112", fire: "112" },
  { country: "United Kingdom", emergency: "999 / 112", police: "999 / 112", ambulance: "999 / 112", fire: "999 / 112" },
  { country: "Italy", emergency: "112", police: "112", ambulance: "112", fire: "112" },
  { country: "United Arab Emirates", emergency: "999 / 998", police: "999", ambulance: "998", fire: "997" },
  { country: "Germany", emergency: "112", police: "110", ambulance: "112", fire: "112" },
  { country: "Portugal", emergency: "112", police: "112", ambulance: "112", fire: "112" },
  { country: "Brazil", emergency: "190 / 192 / 193", police: "190", ambulance: "192", fire: "193" },
  { country: "Argentina", emergency: "911 / 107", police: "911", ambulance: "107", fire: "100" },
  { country: "Japan", emergency: "110 / 119", police: "110", ambulance: "119", fire: "119" },
  { country: "South Korea", emergency: "112 / 119", police: "112", ambulance: "119", fire: "119" },
  { country: "Turkey", emergency: "112", police: "112", ambulance: "112", fire: "112" },
  { country: "Egypt", emergency: "122 / 123 / 180", police: "122", ambulance: "123", fire: "180" },
  { country: "Saudi Arabia", emergency: "911 / 999 / 997 / 998", police: "999", ambulance: "997", fire: "998" }
];

export function getEmergencyNumbers(country: string): EmergencyNumbers {
  return emergencyNumbers.find((item) => item.country.toLowerCase() === country.toLowerCase()) || {
    country,
    emergency: "112 / local emergency services",
    police: "112 / local emergency services",
    ambulance: "112 / local emergency services",
    fire: "112 / local emergency services"
  };
}
