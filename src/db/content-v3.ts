import { db, schema as s } from "./index";
import { eq } from "drizzle-orm";

// Topic clusters. Each cluster has one complete "pillar" guide, and supporting guides that link to it and to each other.
//   Plan your trip: egypt-travel-guide-2026 (pillar) | Where to go: best-places-to-visit-in-egypt (pillar) | Itineraries: egypt-7-day-itinerary (pillar)
export type G = { slug: string; title: string; cluster: string; isPillar: boolean; summary: string; destinationSlug: string | null; seoTitle: string; seoDescription: string; keywords: string; related: string; faqs: { q: string; a: string }[]; body: string };
export const CONTENT_VERSION = 3;
const PLAN = "Plan your trip", GO = "Where to go", ITIN = "Itineraries";

export const GUIDES_V3: G[] = [
{ slug: "egypt-travel-guide-2026", title: "Egypt Travel Guide 2026: Everything You Need to Know Before Visiting Egypt", cluster: PLAN, isPillar: true, destinationSlug: "cairo",
  summary: "The complete guide to visiting Egypt: when to go, how many days you need, where to go, visas, money, safety and how to plan a trip that runs smoothly.",
  seoTitle: "Egypt Travel Guide 2026: Everything to Know Before Visiting", seoDescription: "Complete Egypt travel guide for 2026: best time to visit, how many days, where to go, visas, costs, safety and tips for first-time visitors.",
  keywords: "Egypt travel guide, visiting Egypt, Egypt travel tips, Egypt trip planning, things to know before visiting Egypt",
  related: "how-much-does-a-trip-to-egypt-cost,best-places-to-visit-in-egypt,best-time-to-visit-egypt,egypt-7-day-itinerary",
  faqs: [
    { q: "Is Egypt worth visiting?", a: "Yes. Egypt combines the Giza pyramids, the temples of Luxor and Aswan, the Nile, lively cities and Red Sea beaches, so it suits history lovers, families, couples and divers alike." },
    { q: "How many days do you need in Egypt?", a: "Seven days covers the classic Cairo, Luxor and Aswan route. Five days works for Cairo and Luxor, and ten days lets you add a Nile cruise or the Red Sea." },
    { q: "Do I need a visa for Egypt?", a: "Most visitors do. Many nationalities can get an e-visa or a visa on arrival, but rules and fees change, so check the official e-visa site or your embassy before you fly." },
    { q: "Is it better to book a tour or travel independently in Egypt?", a: "Both work, but a private tour with a local guide removes most of the stress: transport, tickets, timing and explanations are handled for you." },
  ],
  body: `> **Key takeaways**
> - The best time to visit Egypt is October to April. Summer is very hot in Cairo, Luxor and Aswan.
> - Most first trips take 7 to 10 days: Cairo and Giza, then Luxor and Aswan, with an optional Nile cruise.
> - Most visitors need a visa. Many nationalities can get an e-visa or a visa on arrival.
> - A private tour with a local guide is the easiest way to see Egypt without hassle.

Egypt rewards a little planning. It is home to pyramids that are around 4,500 years old, temples still standing beside the Nile, busy old cities and clear Red Sea reefs. It works best when you understand how the country fits together, and that is what this guide is for. Each section links to a deeper guide when you want more detail.

## Is Egypt worth visiting?
For most travellers the answer is a confident yes. Egypt offers something rare: ancient sites that feel real and enormous rather than roped-off and small. You can stand at the foot of the Great Pyramid in the morning, sail past temples on the Nile a few days later and end the trip snorkelling in the Red Sea. It also suits many kinds of traveller: families, couples, friends and solo visitors all find their own version of Egypt.

## When to visit Egypt
The most comfortable months are **October to April**, when days are warm and sightseeing is pleasant. December to February is the busiest and most popular season. Summer (June to August) is very hot, often above 40°C in Luxor and Aswan, so if you go then, do your sightseeing at sunrise. Our full month-by-month breakdown is in the [best time to visit Egypt](/egypt-travel-guide/best-time-to-visit-egypt) guide.

## How many days do you need in Egypt?
- **3 days:** Cairo and Giza only. See our [3-day Egypt itinerary](/egypt-travel-guide/egypt-3-day-itinerary).
- **5 days:** Cairo and Luxor, with a short flight between them. See the [5-day itinerary](/egypt-travel-guide/egypt-5-day-itinerary).
- **7 days:** the classic route of Cairo, Luxor and Aswan. See the [7-day itinerary](/egypt-travel-guide/egypt-7-day-itinerary).
- **10 days:** add a Nile cruise, Alexandria or the Red Sea. See the [10-day itinerary](/egypt-travel-guide/egypt-10-day-itinerary).

## Where to go in Egypt
Most first-time visitors follow the same route for good reason. **Cairo and Giza** for the pyramids, the Sphinx, the Grand Egyptian Museum and Islamic Cairo. **Luxor** for Karnak, the Valley of the Kings and Hatshepsut's temple. **Aswan** for Philae Temple, Nubian villages and the trip to Abu Simbel. Beyond that, Alexandria, Siwa Oasis and the Red Sea add variety. See our list of the [best places to visit in Egypt](/egypt-travel-guide/best-places-to-visit-in-egypt), or compare [Cairo vs Luxor vs Aswan](/egypt-travel-guide/cairo-vs-luxor-vs-aswan) if you have limited time.

## Getting to Egypt and getting around
Most international visitors arrive at Cairo International Airport (CAI). Direct flights also reach Luxor, Aswan, Hurghada and Sharm El Sheikh from some countries. Inside Egypt, the fastest way between Cairo and Luxor or Aswan is a short domestic flight of around an hour. Other options are the overnight train, a Nile cruise, or a private car with a driver. In cities, ride-hailing apps and private drivers are the easiest choices. We arrange [Cairo airport transfers](/egypt-tours/cairo-airport-transfers) so you are met on arrival.

## Visas, money and safety
- **Visa:** most visitors need one, and many nationalities can use the e-visa or get one on arrival. Read our [Egypt visa guide](/egypt-travel-guide/egypt-visa-guide).
- **Money:** Egypt uses the Egyptian pound. Carry small notes for tips. See [Egypt currency, money and tipping](/egypt-travel-guide/egypt-currency-money-and-tipping).
- **Safety:** millions of tourists visit each year. Travelling with a trusted local team helps. Read [is Egypt safe for tourists](/egypt-travel-guide/is-egypt-safe-for-tourists).
- **Budget:** see [how much a trip to Egypt costs](/egypt-travel-guide/how-much-does-a-trip-to-egypt-cost).

## What to pack and how to dress
Pack light, breathable clothes that cover shoulders and knees, comfortable walking shoes, a hat, sunglasses and sunscreen. Add a light layer for cool winter evenings. Women should carry a scarf for mosques. Our [what to wear in Egypt](/egypt-travel-guide/egypt-dress-code-and-etiquette) guide has the details.

## Guided tour or independent travel?
Independent travel is possible, but Egypt is a country where a guide adds a lot. A good Egyptologist explains what you are seeing, handles tickets and queues, chooses the best times and keeps the day smooth. Private tours are popular because you set the pace and skip the crowds. If you are comparing options, read [Egypt tour packages explained](/egypt-travel-guide/egypt-tour-packages-explained), then browse our [Egypt tours](/tours) or [private tours in Egypt](/egypt-tours/private-tours-egypt).

## Practical details at a glance
| Topic | What to know |
|---|---|
| Currency | Egyptian pound (EGP). Cards work in hotels and many restaurants; carry cash for tips and markets. |
| Language | Arabic. English is widely spoken in tourism. |
| Electricity | 220V. Plug types C and F, so most European plugs fit. |
| Water | Drink bottled or filtered water. |
| Time zone | Egypt follows its own time zone; check whether daylight saving applies when you travel. |
| Dress | Modest, light clothing. Cover up at mosques. |

## Your Egypt planning checklist
1. Choose your dates using the [best time to visit](/egypt-travel-guide/best-time-to-visit-egypt) guide.
2. Decide how many days you have and pick an itinerary.
3. Check visa and passport validity.
4. Set a budget and book flights.
5. Book your tours, transfers and hotels, ideally with a local team.
6. Pack for the weather and for modest dress.
7. Save our WhatsApp number for anything you need during the trip.

Ready to plan? Use our [Egypt trip planner](/plan-my-trip) and we will send a suggested itinerary and a clear price.` },

{ slug: "how-much-does-a-trip-to-egypt-cost", title: "How Much Does a Trip to Egypt Cost in 2026? Complete Budget Guide", cluster: PLAN, isPillar: false, destinationSlug: null,
  summary: "Realistic daily budgets, what things cost, sample 7-day trip budgets and simple ways to save without spoiling the trip.",
  seoTitle: "How Much Does a Trip to Egypt Cost in 2026? Budget Guide", seoDescription: "Egypt trip cost in 2026: daily budgets, sample 7-day totals, tour, hotel and food costs, hidden extras and ways to save money.",
  keywords: "Egypt trip cost, Egypt travel budget, how much does Egypt cost, Egypt budget travel, cost of Egypt tour",
  related: "egypt-travel-guide-2026,egypt-tour-packages-explained,egypt-currency-money-and-tipping,egypt-7-day-itinerary",
  faqs: [
    { q: "How much does a 7-day trip to Egypt cost?", a: "Excluding international flights, a 7-day trip typically costs from around $700 to $1,100 per person on a tight budget, $1,300 to $2,200 at mid-range, and $3,000 or more for a luxury trip. These are estimates and vary with season and choices." },
    { q: "Is Egypt cheap to visit?", a: "Everyday costs like meals and local transport are low compared with Europe or North America. The main costs are tours, entrance fees, domestic flights and hotels, which is where most of your budget goes." },
    { q: "What are the hidden costs in Egypt?", a: "Entrance fees not included in some tours, tips, drinks on Nile cruises, optional excursions such as Abu Simbel or a hot air balloon, visa fees and travel insurance." },
    { q: "How can I save money in Egypt?", a: "Travel outside peak winter weeks, use shared tours for some days, book flights and hotels early and avoid buying many small extras. A clear package price helps you avoid surprises." },
  ],
  body: `> **Key takeaways**
> - Excluding international flights, plan roughly **$50 to $80 per day** on a tight budget, **$100 to $180** at mid-range and **$250 or more** for luxury.
> - Tours, entrance fees, domestic flights and hotels make up most of the cost. Food and local transport are cheap.
> - Prices below are **estimates for 2026** and change with season, exchange rates and your choices. Always check a current quote.

Egypt can suit almost any budget, but the total depends on how you travel. The good news is that day-to-day costs such as meals, taxis and drinks are low. The larger items, such as tours, entrance fees, internal flights and hotels, are where your money goes. This guide shows realistic ranges so you can plan with confidence.

## Egypt daily budget per person
| Travel style | Typical daily budget (per person, excl. international flights) | What it looks like |
|---|---|---|
| Budget | $50 to $80 | Simple hotels, local food, shared tours, public transport |
| Mid-range | $100 to $180 | Good 3 to 4 star hotels, private drivers, guided tours, restaurant meals |
| Luxury | $250 and up | 5-star hotels, private guides, Nile cruise, domestic flights |

## What things cost
- **Accommodation:** ranges from simple guesthouses to five-star hotels. Prices rise in winter and around holidays.
- **Food:** local meals such as koshari or ful and falafel cost very little. A restaurant meal is inexpensive by international standards.
- **Tours and guides:** a guided private day tour is typically a mid-range cost item. Shared tours are cheaper. Our [day tours](/egypt-tours/day-tours-egypt) show clear prices.
- **Entrance fees:** major sites charge separate tickets, and some inner areas, such as tombs or pyramid interiors, cost extra. Fees change, so check your tour's inclusions.
- **Domestic flights:** Cairo to Luxor or Aswan is a short flight, usually a modest fee each way when booked ahead.
- **Nile cruises:** vary from good-value options to luxury ships. See the [Nile cruise guide](/egypt-travel-guide/nile-cruise-guide-luxor-aswan).
- **Tips:** budget a small daily amount for guides, drivers and restaurants.

## Sample 7-day trip budgets (per person, excl. international flights)
| Trip | Budget | Mid-range | Luxury |
|---|---|---|---|
| 7 days: Cairo, Luxor, Aswan | $700 to $1,100 | $1,300 to $2,200 | $3,000 and up |

These totals assume domestic flights, hotels, guided sightseeing, entrance fees and meals. They are estimates only. A clear quote from a local operator is the best way to know your exact cost. See our [7-day itinerary](/egypt-travel-guide/egypt-7-day-itinerary) and [Egypt tour packages](/egypt-tours/egypt-tour-packages).

## Costs people forget
- Visa fee and travel insurance
- Entrance fees not included in some tours
- Optional extras such as a hot air balloon or Abu Simbel
- Drinks on a Nile cruise
- Tips for guides, drivers and hotel staff

## How to save money in Egypt without spoiling the trip
1. Travel in shoulder months (October, November, March, April) for better prices than peak winter weeks.
2. Mix private and shared tours: go private for the pyramids, shared for simpler days.
3. Book flights and hotels early.
4. Choose an all-in package price so entrance fees and transfers are included.
5. Eat where locals eat.

Wondering what is included in a package? Read [Egypt tour packages explained](/egypt-travel-guide/egypt-tour-packages-explained). For payment, we ask for a 50% deposit to confirm and the balance before you travel. See [Egypt currency, money and tipping](/egypt-travel-guide/egypt-currency-money-and-tipping) for how to handle cash on the trip.` },

{ slug: "best-places-to-visit-in-egypt", title: "Best Places to Visit in Egypt: 15 Must-See Destinations for First-Time Visitors", cluster: GO, isPillar: true, destinationSlug: null,
  summary: "The 15 best places to visit in Egypt, what makes each special, how long to spend and how to fit them into one trip.",
  seoTitle: "Best Places to Visit in Egypt: 15 Must-See Destinations", seoDescription: "The best places to visit in Egypt for first-timers: Giza pyramids, Luxor, Aswan, Abu Simbel, the Nile, Alexandria, the Red Sea and more.",
  keywords: "best places to visit in Egypt, Egypt destinations, places to visit in Egypt, top Egypt attractions, Egypt must see",
  related: "cairo-vs-luxor-vs-aswan,cairo-travel-guide,egypt-pyramids-guide,luxor-travel-guide,aswan-travel-guide",
  faqs: [
    { q: "What is the number one place to visit in Egypt?", a: "For most first-time visitors it is the Giza pyramids and Sphinx, followed by Luxor's temples and the Valley of the Kings." },
    { q: "How many places can you see in a week in Egypt?", a: "In seven days you can comfortably cover Cairo and Giza, Luxor and Aswan, with an optional day trip to Abu Simbel." },
    { q: "What is the best place in Egypt for a relaxing holiday?", a: "A Nile cruise between Luxor and Aswan, or the Red Sea resorts of Hurghada, Sharm El Sheikh and Dahab." },
  ],
  body: `> **Key takeaways**
> - First-timers should prioritise **Giza, Luxor and Aswan**, plus the Grand Egyptian Museum.
> - Add a **Nile cruise**, Alexandria or the Red Sea if you have 9 to 10 days.
> - For city versus temples versus Nile, see [Cairo vs Luxor vs Aswan](/egypt-travel-guide/cairo-vs-luxor-vs-aswan).

Egypt is big and packed with highlights, so choosing where to go is the hardest part. These are the 15 best places to visit in Egypt, grouped by area, with how long to give each and who they suit. Together they make up the classic Egypt itinerary.

## Cairo and Giza
### 1. The Giza pyramids and Sphinx
The Great Pyramid, the pyramids of Khafre and Menkaure and the Sphinx are the reason many people come. Go early, use a guide and allow half a day. Read our [Egypt pyramids guide](/egypt-travel-guide/egypt-pyramids-guide) or book a [private Giza pyramids tour](/destinations/giza).

### 2. The Grand Egyptian Museum
Set beside the Giza Plateau, this vast museum houses treasures from across ancient Egyptian history. Pair it with the pyramids for a memorable full day.

### 3. Islamic Cairo and Khan el-Khalili
Historic mosques, medieval streets and one of the world's great bazaars. It is the best place to feel Cairo's energy. See the [Cairo travel guide](/egypt-travel-guide/cairo-travel-guide).

### 4. Coptic Cairo
Old churches and narrow lanes that show Egypt's Christian heritage. It is compact and easy to combine with Islamic Cairo.

### 5. Saqqara and Memphis
The Step Pyramid of Djoser at Saqqara is one of the oldest stone monuments in the world, and Memphis was Egypt's ancient capital. A calm, rewarding half day.

## Luxor
### 6. Karnak Temple
A vast complex of temples, columns and obelisks built over centuries. It is the highlight of Luxor's East Bank.

### 7. Luxor Temple
Beautiful at any time, and especially in the evening when it is lit. It sits in the middle of modern Luxor.

### 8. The Valley of the Kings
Royal tombs cut into the desert cliffs of the West Bank, including some with vivid painted walls. Start early to beat the heat.

### 9. Hatshepsut Temple
The striking terraced temple of Egypt's female pharaoh, set against limestone cliffs. See our [Luxor travel guide](/egypt-travel-guide/luxor-travel-guide).

## Aswan and the south
### 10. Philae Temple
A graceful temple on an island, reached by boat. Many travellers name it their favourite. See the [Aswan travel guide](/egypt-travel-guide/aswan-travel-guide).

### 11. Abu Simbel
The colossal temples of Ramses II, roughly a three-hour drive from Aswan each way, so it is a long day but unforgettable.

### 12. Edfu and Kom Ombo (the Nile route)
Two of the best-preserved temples in Egypt, visited on a [Nile cruise](/egypt-travel-guide/nile-cruise-guide-luxor-aswan) between Luxor and Aswan.

## Beyond the classic route
### 13. Alexandria
Egypt's Mediterranean city, with the Bibliotheca Alexandrina, Qaitbay Citadel and fresh seafood. A great day trip or overnight stop. See [Alexandria](/destinations/alexandria).

### 14. The Red Sea: Hurghada, Sharm El Sheikh and Dahab
Coral reefs, diving and relaxed beach days. A perfect end to a sightseeing trip. See [Hurghada](/destinations/hurghada).

### 15. Siwa Oasis and the White Desert
For travellers who want desert landscapes and something quieter. These need extra days and planning.

## How to combine the best places
| Days | Route |
|---|---|
| 3 | Cairo and Giza |
| 5 | Cairo and Luxor |
| 7 | Cairo, Luxor and Aswan |
| 10 | Add a Nile cruise, Alexandria or the Red Sea |

Use these ready-made routes: [3 days](/egypt-travel-guide/egypt-3-day-itinerary), [5 days](/egypt-travel-guide/egypt-5-day-itinerary), [7 days](/egypt-travel-guide/egypt-7-day-itinerary) and [10 days](/egypt-travel-guide/egypt-10-day-itinerary). Or [browse Egypt tours](/tours) by destination.` },

{ slug: "best-time-to-visit-egypt", title: "Best Time to Visit Egypt: Weather, Crowds, Prices & What to Expect Each Month", cluster: PLAN, isPillar: false, destinationSlug: "cairo",
  summary: "Month-by-month weather, crowds and prices for Egypt, plus the best time to go for pyramids, Nile cruises, diving and honeymoons.",
  seoTitle: "Best Time to Visit Egypt: Weather, Crowds & Prices by Month", seoDescription: "The best time to visit Egypt: month-by-month weather, crowds and prices for Cairo, Luxor, Aswan and the Red Sea, plus the best time for cruises and diving.",
  keywords: "best time to visit Egypt, Egypt weather, Egypt travel seasons, Egypt weather by month, when to go to Egypt",
  related: "egypt-travel-guide-2026,how-much-does-a-trip-to-egypt-cost,egypt-7-day-itinerary,nile-cruise-guide-luxor-aswan",
  faqs: [
    { q: "What is the best month to visit Egypt?", a: "November and March are excellent: pleasant weather with fewer crowds than December to February. October and April are also good." },
    { q: "Is Egypt too hot in summer?", a: "It can be. Cairo is hot and Luxor and Aswan are often above 40°C from June to August. If you travel then, sightsee at sunrise and rest in the afternoon." },
    { q: "When is the cheapest time to visit Egypt?", a: "Summer and the shoulder months generally offer lower prices. Christmas, New Year and Easter are the most expensive." },
    { q: "When is the best time for the Red Sea?", a: "Year-round. Spring and autumn are the most comfortable, and the water is warmest from June to October." },
  ],
  body: `> **Key takeaways**
> - The best time to visit Egypt is **October to April**. **November** and **March** balance great weather and fewer crowds.
> - **December to February** is peak season: busiest and priciest, but sunny and mild.
> - **June to August** is very hot inland, though the Red Sea stays enjoyable.

Egypt is a warm, dry country, so the question is really how hot you are willing to go and how busy you want it to be. This guide shows what to expect each month in Cairo, Luxor, Aswan and the Red Sea, so you can pick the best time for your trip.

## Egypt weather and seasons at a glance
| Season | Months | Weather | Crowds and prices |
|---|---|---|---|
| Peak winter | Dec to Feb | Sunny and mild. Cool evenings in Cairo. Warm days in Luxor and Aswan. | Busiest and most expensive |
| Spring | Mar to Apr | Warm and pleasant, occasional dust winds | Good balance, busy at Easter |
| Summer | May to Aug | Hot to very hot inland. Comfortable on the coast. | Quietest and cheapest |
| Autumn | Sep to Nov | Warm, then pleasantly mild by November | Getting busier, great value in October and November |

## Month by month
- **January:** cool, sunny and busy. Bring a jacket for evenings.
- **February:** similar to January, with slightly warmer days.
- **March:** warm and lovely. A great month for sightseeing.
- **April:** hotter, but still comfortable for early-morning visits. Easter can be busy.
- **May:** getting hot. Start sightseeing at sunrise.
- **June, July, August:** very hot in Cairo, and often above 40°C in Luxor and Aswan. Best for the Red Sea and for travellers who accept the heat.
- **September:** still hot, with lower crowds and prices.
- **October:** warm and comfortable, and a favourite month for many travellers.
- **November:** one of the best months, with mild weather and fewer people than December.
- **December:** mild and busy. Book early for Christmas and New Year.

## Best time to visit by interest
- **Pyramids and Cairo:** October to April, at opening time.
- **Nile cruise:** October to April. See the [Nile cruise guide](/egypt-travel-guide/nile-cruise-guide-luxor-aswan).
- **Luxor and Aswan temples:** November to February for comfortable days.
- **Red Sea, snorkelling and diving:** year-round, warmest from June to October.
- **Honeymoon:** November to March, with a sunrise hot air balloon in Luxor.

## Holidays, crowds and prices
Christmas, New Year and Easter are the busiest and most expensive periods. Ramadan moves about ten days earlier each year. Sites stay open, but hours may change and daytime dining is quieter, so check dates when planning. Egyptian holiday weekends bring more local visitors to beaches and popular sites.

## Tips for hot months
1. Sightsee at opening time and rest in the afternoon.
2. Carry water, wear a hat and use sunscreen.
3. Choose hotels with a pool.
4. Ask us about early starts and shaded stops.

Ready to choose your dates? See our [complete Egypt travel guide](/egypt-travel-guide/egypt-travel-guide-2026), check [how much a trip costs](/egypt-travel-guide/how-much-does-a-trip-to-egypt-cost) or browse [Egypt tours](/tours).` },

{ slug: "egypt-7-day-itinerary", title: "7 Days in Egypt: The Perfect Cairo, Luxor & Aswan Itinerary", cluster: ITIN, isPillar: true, destinationSlug: "luxor",
  summary: "A day-by-day 7-day Egypt itinerary covering the pyramids, Luxor's temples and Aswan, with travel logistics, timing and variations.",
  seoTitle: "7 Days in Egypt: Perfect Cairo, Luxor & Aswan Itinerary", seoDescription: "The best 7-day Egypt itinerary: Giza pyramids, Grand Egyptian Museum, Luxor's Valley of the Kings and Aswan, with flights, timings and tips.",
  keywords: "Egypt itinerary 7 days, 7 days in Egypt, Egypt vacation itinerary, one week in Egypt, Cairo Luxor Aswan itinerary",
  related: "egypt-3-day-itinerary,egypt-5-day-itinerary,egypt-10-day-itinerary,egypt-tour-packages-explained,nile-cruise-guide-luxor-aswan",
  faqs: [
    { q: "Is 7 days enough for Egypt?", a: "Yes for the highlights. Seven days lets you see Cairo and Giza, Luxor and Aswan without rushing, using short domestic flights." },
    { q: "How do you travel between Cairo, Luxor and Aswan?", a: "The fastest way is a domestic flight of around an hour. Alternatives are the overnight train or a Nile cruise between Luxor and Aswan." },
    { q: "Should I do Abu Simbel in a 7-day trip?", a: "It is a long day trip from Aswan of about three hours each way, but many travellers consider it a highlight. Add it if you have a spare day." },
    { q: "Can I do a Nile cruise in 7 days?", a: "Yes. A 3 or 4 night cruise between Luxor and Aswan can replace the separate Luxor and Aswan days." },
  ],
  body: `> **Key takeaways**
> - Seven days is the classic Egypt trip: **Cairo and Giza, Luxor, Aswan**.
> - Use short **domestic flights** to save time, or swap Luxor and Aswan for a Nile cruise.
> - Add **Abu Simbel** if you can spare the extra long day.

If you have one week, this is the route we recommend most often. It covers the biggest names in Egypt without rushing, and it works for couples, families and friends. The timings below suit a private tour, which lets you start early and avoid the crowds.

## Your 7 days in Egypt at a glance
| Day | Where | Highlights |
|---|---|---|
| 1 | Cairo | Arrive, airport transfer, rest |
| 2 | Giza | Pyramids, Sphinx, Grand Egyptian Museum |
| 3 | Cairo | Old Cairo, Khan el-Khalili, or Saqqara |
| 4 | Luxor | Fly south, Karnak and Luxor Temple |
| 5 | Luxor | Valley of the Kings, Hatshepsut Temple, optional balloon |
| 6 | Aswan | Philae Temple, felucca ride, Nubian village |
| 7 | Aswan or Cairo | Abu Simbel option, then fly home |

## Day 1: Arrive in Cairo
Land at Cairo International Airport, where your driver meets you. Check in, rest and enjoy a first walk or dinner. Book a [Cairo airport transfer](/egypt-tours/cairo-airport-transfers) so you are met at arrivals.

## Day 2: Giza pyramids and the Grand Egyptian Museum
Start early at the Giza Plateau for the Great Pyramid, the panoramic viewpoint and the Sphinx. In the afternoon visit the Grand Egyptian Museum. Read our [Egypt pyramids guide](/egypt-travel-guide/egypt-pyramids-guide) for tickets and timing.

## Day 3: Old Cairo, Khan el-Khalili or Saqqara
Explore Coptic Cairo, Islamic Cairo and the bazaar, or head to Saqqara and Memphis for the first stone pyramid. More in the [Cairo travel guide](/egypt-travel-guide/cairo-travel-guide).

## Day 4: Fly to Luxor
Take a morning flight of about an hour. Visit Karnak Temple and Luxor Temple, ideally with the evening light on the columns.

## Day 5: Valley of the Kings and Hatshepsut Temple
Cross to the West Bank early. Visit the Valley of the Kings, Hatshepsut Temple and the Colossi of Memnon. A sunrise hot air balloon is a wonderful addition. See the [Luxor travel guide](/egypt-travel-guide/luxor-travel-guide).

## Day 6: Aswan
Travel to Aswan by short flight or by road with temple stops at Edfu and Kom Ombo. Visit Philae Temple by boat, then take a felucca around Elephantine Island. Read the [Aswan travel guide](/egypt-travel-guide/aswan-travel-guide).

## Day 7: Abu Simbel, then home
If your flight is late, take the early trip to Abu Simbel, about three hours each way. Otherwise fly from Aswan to Cairo and on to your international flight.

## Variations
- **Nile cruise version:** replace Days 4 to 6 with a 3 or 4 night Luxor to Aswan cruise. See the [Nile cruise guide](/egypt-travel-guide/nile-cruise-guide-luxor-aswan).
- **Slower pace:** drop Day 3 or the Abu Simbel extension.
- **More time:** try the [10-day itinerary](/egypt-travel-guide/egypt-10-day-itinerary) for a cruise and the Red Sea.
- **Less time:** see the [5-day itinerary](/egypt-travel-guide/egypt-5-day-itinerary) or [3-day itinerary](/egypt-travel-guide/egypt-3-day-itinerary).

## Costs and booking
Costs depend on your hotels and how many days are private. See [how much a trip to Egypt costs](/egypt-travel-guide/how-much-does-a-trip-to-egypt-cost) for realistic budgets. To have it all arranged, browse our [Egypt tour packages](/egypt-tours/egypt-tour-packages) or use the [Egypt trip planner](/plan-my-trip).` },

{ slug: "cairo-travel-guide", title: "Cairo Travel Guide: Where to Stay, What to See, Where to Eat & How to Get Around", cluster: GO, isPillar: false, destinationSlug: "cairo",
  summary: "How to enjoy Cairo: the best areas to stay, top things to do, what to eat and the easiest ways to get around.",
  seoTitle: "Cairo Travel Guide: Where to Stay, What to See & Eat", seoDescription: "Cairo travel guide: best areas to stay, top things to do in Cairo, what to eat, how to get around and a simple 3-day Cairo itinerary.",
  keywords: "Cairo travel guide, things to do in Cairo, Cairo itinerary, where to stay in Cairo, Cairo tours",
  related: "egypt-pyramids-guide,egypt-3-day-itinerary,best-places-to-visit-in-egypt,cairo-vs-luxor-vs-aswan",
  faqs: [
    { q: "How many days do you need in Cairo?", a: "Two to three days is ideal. That covers the Giza pyramids, the Grand Egyptian Museum, Old Cairo and Khan el-Khalili." },
    { q: "Where is the best area to stay in Cairo?", a: "Zamalek for calm and cafes, downtown for museums and history, and Giza for pyramid views and quick plateau access." },
    { q: "How do you get around Cairo?", a: "Ride-hailing apps, private drivers and tours are easiest. The metro is cheap and good for some routes." },
    { q: "Is Cairo safe for tourists?", a: "Yes, with normal city precautions. Travelling with a local guide or driver makes it easier." },
  ],
  body: `> **Key takeaways**
> - Give Cairo **2 to 3 days**: Giza, the museum, Old Cairo and the bazaar.
> - Stay in **Zamalek**, **downtown** or **Giza** depending on your style.
> - Use ride-hailing apps or a private driver to get around.

Cairo is loud, layered and unforgettable. It is the gateway to Egypt, and with a little planning it is one of the most rewarding cities in the world. This guide covers where to stay, what to see, what to eat and how to get around.

## Where to stay in Cairo
- **Zamalek:** an island neighbourhood with cafes, galleries and calm streets. Good for couples and food lovers.
- **Downtown:** close to the museums and historic streets, lively and central.
- **Giza:** near the pyramids, for early starts and pyramid views.
- **Near the airport:** handy for late arrivals or early flights.

## Things to do in Cairo
1. **Giza pyramids and Sphinx.** Go early. See the [Egypt pyramids guide](/egypt-travel-guide/egypt-pyramids-guide).
2. **Grand Egyptian Museum.** Treasures from across ancient Egypt, near the plateau.
3. **Islamic Cairo.** Historic mosques and medieval streets.
4. **Khan el-Khalili bazaar.** Shopping, tea and people-watching.
5. **Coptic Cairo.** The Hanging Church and old lanes.
6. **Saqqara and Memphis.** Where pyramid building began.
7. **The Citadel and Mohamed Ali Mosque.** Views over the city.
8. **A felucca on the Nile.** A calm evening ride.

## Where to eat in Cairo
Try **koshari**, the national dish of rice, lentils, pasta and spicy tomato sauce. **Ful and ta'ameya** (fava beans and Egyptian falafel) are classic breakfasts. Look for grilled meats and kebabs, **molokhia** (a green soup), **fatteh**, **hawawshi** (spiced baked bread with meat) and desserts like **om ali**. Fresh juice stands are everywhere. Your guide can recommend clean, popular places.

## Getting around Cairo
- **Ride-hailing apps** and private drivers are the easiest option.
- **The metro** is cheap and quick on some lines, with women-only carriages.
- **Private guide and driver** for sightseeing days, so traffic and parking are handled.
- **Airport transfers** are best arranged in advance: [Cairo airport transfers](/egypt-tours/cairo-airport-transfers).

## Day trips from Cairo
Saqqara and Memphis, Dahshur, Alexandria on the Mediterranean, or the Fayoum oasis. See [Alexandria](/destinations/alexandria).

## A simple 3-day Cairo plan
Follow our [3-day Egypt itinerary](/egypt-travel-guide/egypt-3-day-itinerary), or extend to the [7-day itinerary](/egypt-travel-guide/egypt-7-day-itinerary). Browse [Cairo tours](/destinations/cairo) for private and shared options.

## Tips for Cairo
- Start early to avoid heat and traffic.
- Carry small notes for tips.
- Dress modestly at mosques.
- Let your guide handle street sellers.` },

{ slug: "egypt-pyramids-guide", title: "Egypt Pyramids Guide: Everything You Need to Know Before Visiting Giza", cluster: GO, isPillar: false, destinationSlug: "giza",
  summary: "How to visit the Giza pyramids and Sphinx: history, tickets, the best time to go, what to see and how to avoid common tourist traps.",
  seoTitle: "Egypt Pyramids Guide: Everything to Know Before Visiting Giza", seoDescription: "Giza pyramids guide: history, tickets, best time to visit, what to see, camels and scams, and whether to book a private pyramids tour.",
  keywords: "Egypt pyramids, Giza pyramids guide, visiting the pyramids, Giza pyramids tour, pyramids of Egypt tickets",
  related: "cairo-travel-guide,best-places-to-visit-in-egypt,egypt-3-day-itinerary,best-time-to-visit-egypt",
  faqs: [
    { q: "How long do you need at the Giza pyramids?", a: "Allow three to four hours for the plateau and Sphinx, or half a day if you also visit the panoramic viewpoint and nearby sites." },
    { q: "What is the best time to visit the pyramids?", a: "Opening time, when it is cooler and quieter. Late afternoon is a good second choice." },
    { q: "Can you go inside the Great Pyramid?", a: "Yes, with a separate ticket, but the interior is narrow and hot. Many visitors prefer to explore the outside and choose one other pyramid interior." },
    { q: "Is a guide worth it at the pyramids?", a: "Most visitors find it is. A guide explains the history, chooses the best viewpoints and handles vendors and camel offers." },
  ],
  body: `> **Key takeaways**
> - Go at **opening time** for cooler air and smaller crowds.
> - Entering the pyramids needs a **separate ticket**, so decide what matters most.
> - A **private guide** helps with timing, tickets and unwanted offers.

The Giza pyramids are the most famous sights in Egypt, and they live up to the hype. They also get busy and warm, so a little knowledge goes a long way. This guide covers what to see, when to go, tickets and how to avoid the usual annoyances.

## What you will see at Giza
- **The Great Pyramid of Khufu:** the largest of the three, originally around 146 metres tall.
- **The pyramids of Khafre and Menkaure:** neighbouring pyramids with their own character.
- **The Great Sphinx:** the limestone guardian at the foot of the plateau.
- **The panoramic viewpoint:** where all three pyramids appear together for photos.
- **Nearby:** the Grand Egyptian Museum, close to the plateau.

## A short history
The pyramids were built as royal tombs during Egypt's Old Kingdom, more than 4,000 years ago, by organised teams of workers. The Great Pyramid was the tallest man-made structure in the world for many centuries. Your guide can explain how they were built and why they are placed as they are.

## Best time to visit the Giza pyramids
Arrive at opening time in any season. In summer this matters even more. October to April is the most comfortable period. Read the [best time to visit Egypt](/egypt-travel-guide/best-time-to-visit-egypt) for the full month-by-month picture.

## Tickets and entry
There is a ticket for the Giza Plateau, and separate tickets to enter the pyramids and some other sites. Fees change, so your tour should list what is included. The inside of a pyramid is narrow and warm, and it is not a must for everyone.

## Camels, horses and street sellers
Agree any camel or horse ride with your guide before you go, and decline unwanted offers politely. A private guide handles this for you and keeps the visit relaxed.

## What to wear and bring
Comfortable shoes, a hat, sunscreen and water. Light, modest clothing works best. See [what to wear in Egypt](/egypt-travel-guide/egypt-dress-code-and-etiquette).

## Book a guide, or go alone?
You can visit independently, but many people prefer a guide for context and comfort. Options include a [private Giza pyramids tour](/destinations/giza), or a day that pairs the pyramids with the Grand Egyptian Museum. Browse [private tours in Egypt](/egypt-tours/private-tours-egypt).

## Nearby sites worth adding
Saqqara and Memphis for the first pyramid, Dahshur for quieter pyramids, and Old Cairo for markets and mosques. See the [Cairo travel guide](/egypt-travel-guide/cairo-travel-guide).` },

{ slug: "cairo-vs-luxor-vs-aswan", title: "Cairo vs Luxor vs Aswan: Which Egyptian Destination Should You Visit?", cluster: GO, isPillar: false, destinationSlug: null,
  summary: "A clear comparison of Cairo, Luxor and Aswan: sights, atmosphere, weather, budget and how many days each deserves.",
  seoTitle: "Cairo vs Luxor vs Aswan: Which Should You Visit?", seoDescription: "Cairo vs Luxor vs Aswan: compare sights, atmosphere, weather, cost and days needed to decide which Egyptian destination is best for you.",
  keywords: "Cairo vs Luxor, Luxor vs Aswan, best city to visit in Egypt, Cairo or Luxor, Egypt destinations compared",
  related: "best-places-to-visit-in-egypt,cairo-travel-guide,luxor-travel-guide,aswan-travel-guide,egypt-7-day-itinerary",
  faqs: [
    { q: "Should I visit Cairo or Luxor first?", a: "Most travellers start in Cairo for the pyramids and museums, then fly to Luxor for temples and tombs." },
    { q: "Is Aswan worth visiting after Luxor?", a: "Yes. Aswan feels calmer and different, with Philae Temple, Nubian culture and the trip to Abu Simbel." },
    { q: "Which is best for families?", a: "Cairo and Giza for the pyramids and museums, with Luxor's balloon and boat rides for kids who like variety." },
    { q: "If I only have 4 days, where should I go?", a: "Cairo and Luxor, using a short flight between them." },
  ],
  body: `> **Key takeaways**
> - **Cairo** is for pyramids, museums and city energy. **Luxor** is for temples and tombs. **Aswan** is for the Nile, Nubian culture and Abu Simbel.
> - Most first trips combine all three. If time is short, choose **Cairo plus Luxor**.

Egypt's three headline destinations feel completely different. Cairo is a huge, busy capital. Luxor is an open-air museum of temples and tombs. Aswan is a slower, greener Nile town with Nubian character. This guide helps you decide where to spend your time.

## Cairo vs Luxor vs Aswan at a glance
| | Cairo and Giza | Luxor | Aswan |
|---|---|---|---|
| Atmosphere | Big, busy and energetic | Historic and relaxed | Calm, scenic and Nubian |
| Top sights | Giza pyramids, Grand Egyptian Museum, Islamic Cairo | Karnak, Valley of the Kings, Hatshepsut Temple | Philae Temple, Abu Simbel, felucca rides |
| Best for | First-timers, history, food, shopping | Ancient temples, balloons, photography | Nile views, quiet, culture |
| Days needed | 2 to 3 | 2 | 1 to 2 (2 with Abu Simbel) |
| Heat in summer | Hot | Very hot | Very hot |
| Getting there | Main airport (CAI) | Flight or train from Cairo | Flight from Cairo or Luxor, or cruise |

## Cairo: the city and the pyramids
Choose Cairo for the Giza pyramids, the Grand Egyptian Museum, Islamic Cairo and food. It is the essential starting point. See the [Cairo travel guide](/egypt-travel-guide/cairo-travel-guide) and [Egypt pyramids guide](/egypt-travel-guide/egypt-pyramids-guide).

## Luxor: the world's greatest open-air museum
Choose Luxor for Karnak, Luxor Temple, the Valley of the Kings and a sunrise hot air balloon. It is compact, so two days feels full. See the [Luxor travel guide](/egypt-travel-guide/luxor-travel-guide).

## Aswan: the slow Nile
Choose Aswan for Philae Temple, a felucca at sunset, Nubian villages and the day trip to Abu Simbel. It is the calmest of the three. See the [Aswan travel guide](/egypt-travel-guide/aswan-travel-guide).

## Which should you choose?
- **First time in Egypt:** Cairo and Luxor at the least.
- **History lover:** all three, plus Saqqara.
- **Family:** Cairo and Giza, plus a gentle Luxor.
- **Couple or honeymoon:** Luxor's balloon, a Nile cruise and quiet Aswan.
- **Short on time:** Cairo and Luxor.
- **Relaxing pace:** Aswan or a [Nile cruise](/egypt-travel-guide/nile-cruise-guide-luxor-aswan).

## How to combine them
Fly between cities in about an hour, take the overnight train, or sail between Luxor and Aswan. See the [7-day itinerary](/egypt-travel-guide/egypt-7-day-itinerary) and the full list of [best places to visit in Egypt](/egypt-travel-guide/best-places-to-visit-in-egypt).

Browse tours: [Cairo](/destinations/cairo), [Luxor](/destinations/luxor) and [Aswan](/destinations/aswan).` },

{ slug: "egypt-travel-tips-first-time-visitors", title: "Egypt Travel Tips for First-Time Visitors: 25 Things Nobody Tells You", cluster: PLAN, isPillar: false, destinationSlug: null,
  summary: "25 honest, practical Egypt travel tips for first-time visitors, from tipping and timing to dress, safety and what to expect.",
  seoTitle: "Egypt Travel Tips for First-Timers: 25 Things Nobody Tells You", seoDescription: "25 Egypt travel tips for first-time visitors: tipping, timing, dress, money, guides, food and safety, from a local team.",
  keywords: "Egypt travel tips, first time Egypt, Egypt travel advice, Egypt tips for tourists, things to know before visiting Egypt",
  related: "egypt-travel-guide-2026,egypt-currency-money-and-tipping,egypt-dress-code-and-etiquette,is-egypt-safe-for-tourists",
  faqs: [
    { q: "What should first-time visitors know about Egypt?", a: "Start sightseeing early, carry small notes for tips, dress modestly and travel with a trusted local guide. Book major tours before you arrive." },
    { q: "Is tipping expected in Egypt?", a: "Yes. Tipping, often called baksheesh, is customary for guides, drivers and restaurants. Carry small notes." },
    { q: "Can you drink the tap water in Egypt?", a: "Most visitors stick to bottled or filtered water." },
  ],
  body: `> **Key takeaways**
> - **Start early**, carry **small notes** and dress **modestly**.
> - Use a **trusted guide** and **book major tours before you arrive**.
> - Expect a warm welcome, and expect people to try to sell to you.

Every first trip to Egypt has a few surprises. These are the 25 tips we share with almost every traveller, from practical details to the things that make the trip more enjoyable.

## Planning
1. **Book the big things early.** Nile cruises, hot air balloons and winter hotels sell out, especially from December to February. See the [best time to visit Egypt](/egypt-travel-guide/best-time-to-visit-egypt).
2. **Give it enough days.** Seven days covers the classics without rushing, and trying to see everything in four days means a lot of time on the road. See the [7-day itinerary](/egypt-travel-guide/egypt-7-day-itinerary).
3. **Check your visa and passport validity** before you fly. Rules and fees change, and airlines can refuse boarding if your paperwork is wrong. See the [Egypt visa guide](/egypt-travel-guide/egypt-visa-guide).
4. **Use domestic flights** between Cairo, Luxor and Aswan. A flight of about an hour can save you a whole day compared with long drives.
5. **Arrange your airport pickup** in advance so a driver is waiting when you land, which is the calmest way to start your trip: [Cairo airport transfers](/egypt-tours/cairo-airport-transfers).

## Money and tipping
6. **Carry small notes.** Change is hard to find at busy sites, and you will need small amounts for tips and toilets.
7. **Tipping is customary.** Guides, drivers and restaurant staff all expect it. Ask your guide what is usual for your trip. See [money and tipping](/egypt-travel-guide/egypt-currency-money-and-tipping).
8. **Use ATMs in cities and airports,** and keep some cash for markets and small shops where cards are not accepted.
9. **Agree prices first** for taxis and any service without a meter or a posted price. It avoids awkward conversations later.
10. **Know what your tour includes.** Ask about entrance fees, lunch, drinks and optional extras so there are no surprises on the day.

## On the day
11. **Start at opening time.** Sites are cooler and quieter in the first hour, and photos are better in the soft morning light.
12. **Wear a hat and comfortable shoes.** There is more walking than most people expect, often on uneven ground.
13. **Carry water and sunscreen every day.** The sun is strong even in winter, and shade can be limited at big sites.
14. **Bring a light layer.** Winter mornings and evenings can be cool, especially in Cairo and on the Nile.
15. **Expect sellers, and have a plan.** A polite, firm "no thank you" works. A guide or driver makes this much easier.

## Culture and etiquette
16. **Dress modestly** at mosques and in towns. Covering shoulders and knees is a good rule. See [what to wear in Egypt](/egypt-travel-guide/egypt-dress-code-and-etiquette).
17. **Ask before photographing people.** Most are happy to say yes if you ask first, and it is polite.
18. **Accept the tea.** Hospitality is a big part of Egyptian culture, and a shared cup of tea is often the best part of a shop visit.
19. **Learn a few Arabic words.** "Shukran" (thank you) and "salaam" (hello) always bring a smile.
20. **Remove your shoes** when entering mosques, and follow your guide's lead on where photos are allowed.

## Food and health
21. **Drink bottled or filtered water,** and use it for brushing your teeth if you have a sensitive stomach.
22. **Try the local food.** Koshari, ful, ta'ameya and fresh juice are popular, inexpensive and delicious. Ask your guide for busy, clean places.
23. **Pace yourself** in the first days. Jet lag and heat add up, so plan a rest in the afternoon in hot months.

## Safety and support
24. **Travel with a trusted local team.** A local guide and driver handle logistics and make the trip smoother. See [is Egypt safe for tourists](/egypt-travel-guide/is-egypt-safe-for-tourists).
25. **Save a WhatsApp contact** for your operator so help is one message away if plans change or you need advice.

Want a deeper overview? Read our [complete Egypt travel guide](/egypt-travel-guide/egypt-travel-guide-2026), or [plan your trip with us](/plan-my-trip).` },

{ slug: "egypt-tour-packages-explained", title: "Egypt Tour Packages Explained: How to Choose the Right Egypt Tour for Your Trip", cluster: ITIN, isPillar: false, destinationSlug: null,
  summary: "How Egypt tour packages work, what is included, private versus group tours, red flags, and how to compare quotes.",
  seoTitle: "Egypt Tour Packages Explained: How to Choose the Right Tour", seoDescription: "Egypt tour packages explained: what is included, private vs group tours, how to compare quotes, red flags and how to choose the best Egypt vacation package.",
  keywords: "Egypt tour packages, Egypt tours, Egypt vacation packages, private Egypt tours, best Egypt tour, Egypt package holidays",
  related: "how-much-does-a-trip-to-egypt-cost,egypt-7-day-itinerary,egypt-travel-guide-2026,nile-cruise-guide-luxor-aswan",
  faqs: [
    { q: "What is included in an Egypt tour package?", a: "Usually hotels, airport and internal transfers, guided sightseeing and entrance fees, and often domestic flights and some meals. Always check the inclusion list on your quote." },
    { q: "Are private or group tours better in Egypt?", a: "Private tours give you flexibility and a personal guide. Group tours cost less. Many travellers mix the two." },
    { q: "How do I know an Egypt tour company is trustworthy?", a: "Look for clear inclusions and prices, real reviews, direct contact, transparent payment terms and responsive support." },
    { q: "Should I book directly with a local operator?", a: "Booking directly gives you a clear point of contact and often better flexibility, because the team planning your trip is the team running it." },
  ],
  body: `> **Key takeaways**
> - A package bundles **hotels, transfers, guides, entrance fees** and often **flights** into one price.
> - **Private** tours give flexibility. **Group** tours save money. Many trips mix both.
> - Compare **inclusions**, not just prices, and choose a team you can message directly.

With so many Egypt tours online, it is hard to know what you are really buying. This guide explains how Egypt tour packages work, what to look for and which questions protect you from surprises.

## What is an Egypt tour package?
A package is a trip planned and priced as a whole. Instead of booking hotels, drivers, guides and flights separately, you get a single itinerary with one clear price. The best packages are flexible and can be adjusted to your dates, budget and interests.

## Types of Egypt tour packages
- **Day tours:** a single day at the pyramids, in Cairo or in Luxor. See [Egypt day tours](/egypt-tours/day-tours-egypt).
- **Multi-day packages:** several days with hotels and transfers, such as Cairo and Luxor. See [Egypt tour packages](/egypt-tours/egypt-tour-packages).
- **Nile cruise packages:** a cruise, often combined with Cairo. See [Nile cruises](/egypt-tours/nile-cruises-egypt).
- **Private and custom trips:** built around you. See [private tours in Egypt](/egypt-tours/private-tours-egypt).
- **Family and honeymoon packages:** tailored for [families](/egypt-tours/family-tours-egypt) or [couples](/egypt-tours/honeymoon-tours-egypt).

## What is usually included
| Usually included | Often extra |
|---|---|
| Hotel nights and breakfast | International flights |
| Airport and internal transfers | Visa fees and travel insurance |
| Guided sightseeing | Tips |
| Entrance fees to listed sites | Drinks and optional excursions |
| Domestic flights (in many packages) | Some meals |

## Private vs group tours
Private tours give you your own guide and vehicle, flexible timing and a personal pace. They suit families, couples and anyone who wants comfort. Group tours cost less and can be sociable but follow a fixed schedule. A common approach is private for the big days at the pyramids and Luxor, and shared for the rest.

## How to compare Egypt tour quotes
1. **Line up inclusions.** Entrance fees, lunch and flights make prices look different.
2. **Check the hotels** by name and star rating.
3. **Ask about group size** and guide language.
4. **Read the cancellation and payment terms.** We ask for a 50% deposit and the balance before travel.
5. **Look for real reviews** and a direct way to contact the team.

## Red flags
- Vague inclusion lists
- Prices far below everyone else
- Pressure to pay everything immediately
- No direct contact details

## How to choose the right package
Match the package to your time, interests and pace. Use our [7-day itinerary](/egypt-travel-guide/egypt-7-day-itinerary) as a starting point, check [how much a trip costs](/egypt-travel-guide/how-much-does-a-trip-to-egypt-cost), then [build your Egypt trip](/plan-my-trip) or [browse our tours](/tours). Our team replies fast on WhatsApp.` },

{ slug: "luxor-travel-guide", title: "Luxor Travel Guide: Temples, Tombs & How to See Them", cluster: GO, isPillar: false, destinationSlug: "luxor",
  summary: "How to plan Luxor: the East and West Banks, the Valley of the Kings, Karnak, hot air balloons and how many days to stay.",
  seoTitle: "Luxor Travel Guide: Temples, Tombs, Balloons & Tips", seoDescription: "Luxor travel guide: Karnak, Luxor Temple, the Valley of the Kings, Hatshepsut Temple, hot air balloons, how many days you need and where to stay.",
  keywords: "Luxor travel guide, things to do in Luxor, Luxor tours, Valley of the Kings, Karnak Temple",
  related: "cairo-vs-luxor-vs-aswan,aswan-travel-guide,best-places-to-visit-in-egypt,nile-cruise-guide-luxor-aswan",
  faqs: [{ q: "How many days do you need in Luxor?", a: "Two days: one for the West Bank tombs and one for the East Bank temples." }, { q: "Is the Luxor hot air balloon worth it?", a: "Yes for most travellers. A sunrise flight gives a memorable view of the temples and the Nile." }],
  body: `Luxor is ancient Thebes, and it is often called the world's greatest open-air museum. It is compact and easy to explore, and it is the heart of any Egypt trip.

## The East Bank: temples
**Karnak Temple** is a vast complex of columns and courtyards. **Luxor Temple** is beautiful in the evening light. The East Bank is also where you will find hotels, restaurants and the Nile corniche.

## The West Bank: tombs
The **Valley of the Kings** holds royal tombs, some with vivid painted walls. **Hatshepsut Temple** is a striking terraced temple, and the **Colossi of Memnon** stand by the road. Start early to avoid the heat.

## Hot air balloon at sunrise
A sunrise balloon over the West Bank is a highlight for many couples and families. Book it for the day before your tomb visits so you are not rushed.

## How many days in Luxor
Two days is ideal: one for each bank. Read the [Cairo vs Luxor vs Aswan](/egypt-travel-guide/cairo-vs-luxor-vs-aswan) comparison, then see [Luxor tours](/destinations/luxor).

## Best time to visit
November to February for comfortable days. Summers are extremely hot, so see the tombs at first light. More in the [best time to visit Egypt](/egypt-travel-guide/best-time-to-visit-egypt).

## Getting there
Fly from Cairo in about an hour, take the overnight train, or arrive on a [Nile cruise](/egypt-travel-guide/nile-cruise-guide-luxor-aswan).` },

{ slug: "aswan-travel-guide", title: "Aswan Travel Guide: Philae Temple, Abu Simbel & Nubian Culture", cluster: GO, isPillar: false, destinationSlug: "aswan",
  summary: "What to do in Aswan: Philae Temple, felucca rides, Nubian villages and the early road to Abu Simbel.",
  seoTitle: "Aswan Travel Guide: Philae, Abu Simbel & Nubian Villages", seoDescription: "Aswan travel guide: Philae Temple, Abu Simbel, felucca rides, Nubian villages, how long to stay and the best time to visit Aswan.",
  keywords: "Aswan travel guide, things to do in Aswan, Abu Simbel tour, Philae Temple, Aswan tours",
  related: "cairo-vs-luxor-vs-aswan,luxor-travel-guide,nile-cruise-guide-luxor-aswan,best-places-to-visit-in-egypt",
  faqs: [{ q: "How far is Abu Simbel from Aswan?", a: "About three hours by road each way, so it is a long day with an early start." }, { q: "How long do you need in Aswan?", a: "One to two days. Two if you include Abu Simbel." }],
  body: `Aswan is calmer than Cairo or Luxor. The Nile is wide and blue here, the pace is slow, and Nubian culture adds warmth and colour. It is a wonderful way to end a Nile journey.

## Top things to do in Aswan
- **Philae Temple:** a graceful island temple reached by boat.
- **Felucca ride:** a sailboat trip around Elephantine Island, best at sunset.
- **Nubian village:** colourful houses, tea and local crafts.
- **Aswan High Dam:** a look at the dam that reshaped the Nile.
- **Abu Simbel:** the colossal temples of Ramses II.

## Abu Simbel day trip
Abu Simbel is roughly a three-hour drive each way, so the day starts very early. It is long but many travellers call it a highlight. Plan a rest afternoon afterwards.

## How many days in Aswan
One to two days. See the [Cairo vs Luxor vs Aswan](/egypt-travel-guide/cairo-vs-luxor-vs-aswan) comparison and browse [Aswan tours](/destinations/aswan).

## Best time to visit
October to March. The rest of the year is very hot. See the [best time to visit Egypt](/egypt-travel-guide/best-time-to-visit-egypt).

## Getting there
Fly from Cairo or Luxor, or arrive on a [Nile cruise](/egypt-travel-guide/nile-cruise-guide-luxor-aswan) from Luxor.` },

{ slug: "egypt-5-day-itinerary", title: "5 Days in Egypt: A Cairo & Luxor Itinerary", cluster: ITIN, isPillar: false, destinationSlug: "cairo",
  summary: "A practical 5-day Egypt itinerary covering the Giza pyramids, the Grand Egyptian Museum and Luxor's temples.",
  seoTitle: "5 Days in Egypt: Cairo & Luxor Itinerary", seoDescription: "A 5-day Egypt itinerary: Giza pyramids, the Grand Egyptian Museum, Old Cairo and a flight to Luxor for Karnak and the Valley of the Kings.",
  keywords: "5 days in Egypt, Egypt 5 day itinerary, Cairo and Luxor itinerary, 5 day Egypt tour",
  related: "egypt-7-day-itinerary,egypt-3-day-itinerary,egypt-10-day-itinerary,egypt-tour-packages-explained",
  faqs: [{ q: "Is 5 days enough for Egypt?", a: "It is enough for Cairo and Luxor, the two most important stops, using a short domestic flight." }],
  body: `Five days covers the two biggest highlights of Egypt: Cairo and Giza, and Luxor. It is a comfortable pace with one short flight.

## Day 1: Arrive in Cairo
Airport transfer, check-in and a relaxed evening. Arrange a [Cairo airport transfer](/egypt-tours/cairo-airport-transfers).

## Day 2: Giza pyramids and the Grand Egyptian Museum
Pyramids and Sphinx early, museum in the afternoon. See the [Egypt pyramids guide](/egypt-travel-guide/egypt-pyramids-guide).

## Day 3: Fly to Luxor
Morning flight, then Karnak and Luxor Temple.

## Day 4: Valley of the Kings and Hatshepsut Temple
Cross to the West Bank early. Add a sunrise balloon if you like. See the [Luxor travel guide](/egypt-travel-guide/luxor-travel-guide).

## Day 5: Depart
Transfer to the airport for your onward flight.

## Make it longer
Add Aswan and Abu Simbel for the [7-day itinerary](/egypt-travel-guide/egypt-7-day-itinerary), or see our [5-day Cairo and Luxor package](/tours).` },

{ slug: "egypt-10-day-itinerary", title: "10 Days in Egypt: Cairo, Nile Cruise & Red Sea Itinerary", cluster: ITIN, isPillar: false, destinationSlug: "aswan",
  summary: "A relaxed 10-day Egypt itinerary that adds a Nile cruise, and optionally the Red Sea, to the classic Cairo, Luxor and Aswan route.",
  seoTitle: "10 Days in Egypt: Cairo, Nile Cruise & Red Sea Itinerary", seoDescription: "A 10-day Egypt itinerary: Cairo and Giza, a Nile cruise from Luxor to Aswan and beach days on the Red Sea, with tips for pace and booking.",
  keywords: "10 days in Egypt, Egypt 10 day itinerary, Egypt Nile cruise itinerary, two weeks in Egypt",
  related: "egypt-7-day-itinerary,nile-cruise-guide-luxor-aswan,egypt-tour-packages-explained,how-much-does-a-trip-to-egypt-cost",
  faqs: [{ q: "What is the best 10-day Egypt itinerary?", a: "Cairo and Giza, a 3 to 4 night Nile cruise from Luxor to Aswan, and a few days on the Red Sea to relax." }],
  body: `Ten days lets you see Egypt's highlights at a gentler pace and add a Nile cruise, the Red Sea, or both.

## The route at a glance
| Days | Where |
|---|---|
| 1 to 3 | Cairo and Giza |
| 4 to 7 | Nile cruise, Luxor to Aswan |
| 8 | Abu Simbel or Aswan |
| 9 to 10 | Red Sea (Hurghada) or Alexandria, then home |

## Days 1 to 3: Cairo and Giza
Pyramids, the Grand Egyptian Museum, Old Cairo and Khan el-Khalili. See the [Cairo travel guide](/egypt-travel-guide/cairo-travel-guide).

## Days 4 to 7: Nile cruise
Fly to Luxor and board your ship. Visit Karnak, the Valley of the Kings, Edfu, Kom Ombo and Philae. Read the [Nile cruise guide](/egypt-travel-guide/nile-cruise-guide-luxor-aswan).

## Day 8: Abu Simbel or a relaxed Aswan day
Take the early trip to Abu Simbel, or rest and enjoy a felucca at sunset.

## Days 9 and 10: Red Sea or Alexandria
Fly or drive to the coast for snorkelling and beach time in [Hurghada](/destinations/hurghada), or take a trip to [Alexandria](/destinations/alexandria) before flying home.

## Booking tips
Nile cruises book out in winter, so reserve early. See [how much a trip to Egypt costs](/egypt-travel-guide/how-much-does-a-trip-to-egypt-cost) and [Egypt tour packages explained](/egypt-travel-guide/egypt-tour-packages-explained).` },
];

// Cluster links and FAQs for the earlier guides (their text stays as it was).
const LINK_UPDATES: Record<string, { cluster: string; related: string; faqs: { q: string; a: string }[] }> = {
  "egypt-visa-guide": { cluster: PLAN, related: "egypt-travel-guide-2026,egypt-travel-tips-first-time-visitors,how-much-does-a-trip-to-egypt-cost", faqs: [{ q: "Do I need a visa for Egypt?", a: "Most visitors do. Many nationalities can use the official e-visa or a visa on arrival, but rules and fees change, so check before you travel." }, { q: "How long should my passport be valid?", a: "Aim for at least six months of validity from your arrival date." }] },
  "egypt-currency-money-and-tipping": { cluster: PLAN, related: "egypt-travel-guide-2026,how-much-does-a-trip-to-egypt-cost,egypt-travel-tips-first-time-visitors", faqs: [{ q: "What currency does Egypt use?", a: "The Egyptian pound (EGP). Cards work in hotels and many restaurants, and cash is useful for tips and markets." }, { q: "Do you tip in Egypt?", a: "Yes. Tipping (baksheesh) is customary for guides, drivers and restaurants." }] },
  "is-egypt-safe-for-tourists": { cluster: PLAN, related: "egypt-travel-guide-2026,egypt-travel-tips-first-time-visitors,egypt-dress-code-and-etiquette", faqs: [{ q: "Is Egypt safe for tourists?", a: "Millions visit each year and most trips are trouble-free. Travelling with a trusted local guide and following official advice helps." }] },
  "egypt-dress-code-and-etiquette": { cluster: PLAN, related: "egypt-travel-guide-2026,egypt-travel-tips-first-time-visitors,best-time-to-visit-egypt", faqs: [{ q: "What should I wear in Egypt?", a: "Light, breathable clothes that cover shoulders and knees, comfortable shoes and a hat. Carry a scarf for mosques." }] },
  "nile-cruise-guide-luxor-aswan": { cluster: GO, related: "luxor-travel-guide,aswan-travel-guide,egypt-7-day-itinerary,egypt-10-day-itinerary", faqs: [{ q: "How long is a Nile cruise from Luxor to Aswan?", a: "Most run three or four nights, with five nights for a slower pace." }, { q: "What is included in a Nile cruise?", a: "Typically your cabin, meals, guided visits and transfers. Drinks and tips are usually extra." }] },
  "egypt-3-day-itinerary": { cluster: ITIN, related: "egypt-5-day-itinerary,egypt-7-day-itinerary,cairo-travel-guide,egypt-pyramids-guide", faqs: [{ q: "Can you see Egypt in 3 days?", a: "You can see Cairo and Giza's highlights in three days, including the pyramids, the museum and Old Cairo." }] },
};

export async function applyContentV3() {
  const [flag] = await db.select().from(s.settings).where(eq(s.settings.key, "content.version")); if (flag && Number(flag.value) >= 3) return;
  // The old pyramids article moves to its new, keyword-focused address.
  await db.update(s.guides).set({ slug: "egypt-pyramids-guide" }).where(eq(s.guides.slug, "giza-pyramids-visitor-guide"));
  for (const g of GUIDES_V3) {
    const { faqs, ...rest } = g; const row = { ...rest, faqs: JSON.stringify(faqs), status: "PUBLISHED", updatedAt: new Date() };
    const ex = await db.select({ id: s.guides.id }).from(s.guides).where(eq(s.guides.slug, g.slug));
    if (ex.length) await db.update(s.guides).set(row).where(eq(s.guides.slug, g.slug)); else await db.insert(s.guides).values(row);
  }
  for (const [slug, u] of Object.entries(LINK_UPDATES)) await db.update(s.guides).set({ cluster: u.cluster, related: u.related, faqs: JSON.stringify(u.faqs), isPillar: false }).where(eq(s.guides.slug, slug));
  if (flag) await db.update(s.settings).set({ value: "3" }).where(eq(s.settings.key, "content.version")); else await db.insert(s.settings).values({ key: "content.version", value: "3" });
}
