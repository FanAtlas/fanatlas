export type CountryOption = {
  code: string;
  flag: string;
  name: string;
  cities: string[];
};

const countryRows = `
AF|Afghanistan|Kabul
AL|Albania|Tirana
DZ|Algeria|Algiers
AD|Andorra|Andorra la Vella
AO|Angola|Luanda
AG|Antigua and Barbuda|Saint John's
AR|Argentina|Buenos Aires
AM|Armenia|Yerevan
AU|Australia|Canberra,Sydney,Melbourne,Brisbane,Perth
AT|Austria|Vienna
AZ|Azerbaijan|Baku
BS|Bahamas|Nassau
BH|Bahrain|Manama
BD|Bangladesh|Dhaka
BB|Barbados|Bridgetown
BY|Belarus|Minsk
BE|Belgium|Brussels,Antwerp,Bruges,Ghent
BZ|Belize|Belmopan,Belize City
BJ|Benin|Porto-Novo,Cotonou
BT|Bhutan|Thimphu
BO|Bolivia|La Paz,Sucre,Santa Cruz
BA|Bosnia and Herzegovina|Sarajevo
BW|Botswana|Gaborone
BR|Brazil|Brasilia,Sao Paulo,Rio de Janeiro,Salvador,Fortaleza
BN|Brunei|Bandar Seri Begawan
BG|Bulgaria|Sofia
BF|Burkina Faso|Ouagadougou
BI|Burundi|Gitega,Bujumbura
CV|Cabo Verde|Praia
KH|Cambodia|Phnom Penh,Siem Reap
CM|Cameroon|Yaounde,Douala
CA|Canada|Ottawa,Toronto,Vancouver,Montreal,Calgary
CF|Central African Republic|Bangui
TD|Chad|N'Djamena
CL|Chile|Santiago,Valparaiso
CN|China|Beijing,Shanghai,Guangzhou,Shenzhen
CO|Colombia|Bogota,Medellin,Cartagena,Cali
KM|Comoros|Moroni
CG|Congo|Brazzaville
CD|Democratic Republic of the Congo|Kinshasa
CR|Costa Rica|San Jose
CI|Cote d'Ivoire|Yamoussoukro,Abidjan
HR|Croatia|Zagreb,Split,Dubrovnik
CU|Cuba|Havana
CY|Cyprus|Nicosia
CZ|Czechia|Prague,Brno
DK|Denmark|Copenhagen,Aarhus
DJ|Djibouti|Djibouti
DM|Dominica|Roseau
DO|Dominican Republic|Santo Domingo,Punta Cana
EC|Ecuador|Quito,Guayaquil
EG|Egypt|Cairo,Alexandria,Giza,Luxor,Sharm El Sheikh
SV|El Salvador|San Salvador
GQ|Equatorial Guinea|Malabo
ER|Eritrea|Asmara
EE|Estonia|Tallinn
SZ|Eswatini|Mbabane,Manzini
ET|Ethiopia|Addis Ababa
FJ|Fiji|Suva,Nadi
FI|Finland|Helsinki
FR|France|Paris,Lyon,Marseille,Nice,Bordeaux,Toulouse
GA|Gabon|Libreville
GM|Gambia|Banjul
GE|Georgia|Tbilisi
DE|Germany|Berlin,Munich,Hamburg,Frankfurt,Cologne
GH|Ghana|Accra,Kumasi
GR|Greece|Athens,Thessaloniki
GD|Grenada|Saint George's
GT|Guatemala|Guatemala City,Antigua Guatemala
GN|Guinea|Conakry
GW|Guinea-Bissau|Bissau
GY|Guyana|Georgetown
HT|Haiti|Port-au-Prince
HN|Honduras|Tegucigalpa,San Pedro Sula
HU|Hungary|Budapest
IS|Iceland|Reykjavik
IN|India|New Delhi,Mumbai,Jaipur,Bengaluru,Goa
ID|Indonesia|Jakarta,Bali,Yogyakarta,Surabaya
IR|Iran|Tehran,Isfahan,Shiraz
IQ|Iraq|Baghdad,Erbil
IE|Ireland|Dublin,Galway,Cork
IL|Israel|Jerusalem,Tel Aviv
IT|Italy|Rome,Milan,Florence,Venice,Naples
JM|Jamaica|Kingston,Montego Bay
JP|Japan|Tokyo,Kyoto,Osaka,Hiroshima,Sapporo
JO|Jordan|Amman,Aqaba
KZ|Kazakhstan|Astana,Almaty
KE|Kenya|Nairobi,Mombasa
KI|Kiribati|Tarawa
KW|Kuwait|Kuwait City
KG|Kyrgyzstan|Bishkek
LA|Laos|Vientiane,Luang Prabang
LV|Latvia|Riga
LB|Lebanon|Beirut
LS|Lesotho|Maseru
LR|Liberia|Monrovia
LY|Libya|Tripoli
LI|Liechtenstein|Vaduz
LT|Lithuania|Vilnius
LU|Luxembourg|Luxembourg
MG|Madagascar|Antananarivo
MW|Malawi|Lilongwe,Blantyre
MY|Malaysia|Kuala Lumpur,Penang,Langkawi
MV|Maldives|Male
ML|Mali|Bamako
MT|Malta|Valletta
MH|Marshall Islands|Majuro
MR|Mauritania|Nouakchott
MU|Mauritius|Port Louis
MX|Mexico|Mexico City,Guadalajara,Monterrey,Cancun,Oaxaca
FM|Micronesia|Palikir
MD|Moldova|Chisinau
MC|Monaco|Monaco
MN|Mongolia|Ulaanbaatar
ME|Montenegro|Podgorica,Kotor
MA|Morocco|Casablanca,Marrakech,Rabat,Tangier,Agadir,Fez,Meknes
MZ|Mozambique|Maputo
MM|Myanmar|Naypyidaw,Yangon
NA|Namibia|Windhoek
NR|Nauru|Yaren
NP|Nepal|Kathmandu,Pokhara
NL|Netherlands|Amsterdam,Rotterdam,The Hague,Utrecht
NZ|New Zealand|Wellington,Auckland,Queenstown
NI|Nicaragua|Managua
NE|Niger|Niamey
NG|Nigeria|Abuja,Lagos
KP|North Korea|Pyongyang
MK|North Macedonia|Skopje
NO|Norway|Oslo,Bergen
OM|Oman|Muscat
PK|Pakistan|Islamabad,Karachi,Lahore
PW|Palau|Ngerulmud,Koror
PA|Panama|Panama City
PG|Papua New Guinea|Port Moresby
PY|Paraguay|Asuncion
PE|Peru|Lima,Cusco,Arequipa
PH|Philippines|Manila,Cebu
PL|Poland|Warsaw,Krakow,Gdansk
PT|Portugal|Lisbon,Porto,Faro
QA|Qatar|Doha
RO|Romania|Bucharest
RU|Russia|Moscow,Saint Petersburg
RW|Rwanda|Kigali
KN|Saint Kitts and Nevis|Basseterre
LC|Saint Lucia|Castries
VC|Saint Vincent and the Grenadines|Kingstown
WS|Samoa|Apia
SM|San Marino|San Marino
ST|Sao Tome and Principe|Sao Tome
SA|Saudi Arabia|Riyadh,Jeddah,Mecca,Medina
SN|Senegal|Dakar
RS|Serbia|Belgrade
SC|Seychelles|Victoria
SL|Sierra Leone|Freetown
SG|Singapore|Singapore
SK|Slovakia|Bratislava
SI|Slovenia|Ljubljana
SB|Solomon Islands|Honiara
SO|Somalia|Mogadishu
ZA|South Africa|Pretoria,Cape Town,Johannesburg,Durban
KR|South Korea|Seoul,Busan,Jeju
SS|South Sudan|Juba
ES|Spain|Madrid,Barcelona,Valencia,Seville,Malaga
LK|Sri Lanka|Colombo,Kandy
SD|Sudan|Khartoum
SR|Suriname|Paramaribo
SE|Sweden|Stockholm,Gothenburg
CH|Switzerland|Bern,Zurich,Geneva,Lucerne
SY|Syria|Damascus
TJ|Tajikistan|Dushanbe
TZ|Tanzania|Dodoma,Dar es Salaam,Zanzibar
TH|Thailand|Bangkok,Chiang Mai,Phuket
TL|Timor-Leste|Dili
TG|Togo|Lome
TO|Tonga|Nuku'alofa
TT|Trinidad and Tobago|Port of Spain
TN|Tunisia|Tunis
TR|Turkey|Ankara,Istanbul,Antalya,Izmir
TM|Turkmenistan|Ashgabat
TV|Tuvalu|Funafuti
UG|Uganda|Kampala
UA|Ukraine|Kyiv,Lviv,Odesa
AE|United Arab Emirates|Abu Dhabi,Dubai,Sharjah
GB|United Kingdom|London,Manchester,Edinburgh,Birmingham,Liverpool
US|United States|Washington,New York,Los Angeles,Miami,Chicago,San Francisco
UY|Uruguay|Montevideo
UZ|Uzbekistan|Tashkent,Samarkand
VU|Vanuatu|Port Vila
VA|Vatican City|Vatican City
VE|Venezuela|Caracas
VN|Vietnam|Hanoi,Ho Chi Minh City,Da Nang
YE|Yemen|Sanaa
ZM|Zambia|Lusaka
ZW|Zimbabwe|Harare
`;

function flagFromCode(code: string) {
  return code
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

export const countries: CountryOption[] = countryRows
  .trim()
  .split("\n")
  .map((row) => {
    const [code, name, cities] = row.split("|");
    return {
      code,
      flag: flagFromCode(code),
      name,
      cities: cities.split(",").map((city) => city.trim()).filter(Boolean)
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

export function getCountryByName(name: string) {
  return countries.find((country) => country.name === name);
}

export function cityOptionsForCountry(countryName: string) {
  return [...(getCountryByName(countryName)?.cities || []), "Other..."];
}

export function countryFlag(countryName: string) {
  return getCountryByName(countryName)?.flag || "🌍";
}
