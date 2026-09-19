import type { Block, BlockType, Day, ItineraryContent } from "../pdf/types";

export const uid = () => Math.random().toString(36).slice(2, 10);
export const blk = (type: BlockType, time: string, title: string, description = "", location = "", notes = ""): Block => ({ id: uid(), type, time, title, description, location, link: "", imageUrl: "", notes });
export const day = (title: string, hook: string, location: string, blocks: Block[], hotel: Partial<Day["hotel"]> = {}, notes = ""): Day => ({ id: uid(), title, hook, location, date: "", imageUrl: "", hotel: { name: "", stars: "", notes: "", link: "", ...hotel }, blocks, notes });
export const blankItinerary = (): ItineraryContent => ({
  title: "", subtitle: "", intro: "", coverImageUrl: "", customerName: "", travelers: "", startDate: "", endDate: "", destinations: [], highlights: [], days: [day("", "", "", [])],
  included: [], excluded: [], important: [], priceLabel: "", paymentTerms: "", ctaUrl: "", ctaLabel: "Complete your booking", sceneKind: "auto",
});

// Suggests an engaging headline + hook from a location, for the "Suggest" button in the builder.
const SUGGEST: [RegExp, string, string][] = [
  [/giza|pyramid/i, "Stand Before the Great Pyramids", "Walk in the footsteps of ancient kings and discover the story behind one of the world's greatest wonders."],
  [/sakkara|saqqara|memphis/i, "Where the First Pyramids Began", "Step back to the dawn of pyramid building, long before Giza."],
  [/islamic|khan|citadel/i, "Old Cairo, Alive and Loud", "Mosques, markets and centuries of stories in one unforgettable afternoon."],
  [/cairo/i, "Welcome to the Land of the Pharaohs", "Cairo is waiting. Your Egyptian adventure starts here."],
  [/luxor|karnak|valley/i, "The World's Greatest Open-Air Museum", "Temples, tombs and colossal statues, all in one ancient city."],
  [/edfu|kom ombo|esna/i, "Temples on the Riverbank", "Drift between temples that have watched the Nile for thousands of years."],
  [/aswan|philae|abu simbel/i, "Nubian Colour and a Slower Nile", "Feluccas, island temples and golden light on the water."],
  [/cruise|nile/i, "Sail Into Ancient Egypt", "Leave the city behind and begin your journey along the legendary Nile."],
  [/alexandria/i, "Egypt by the Sea", "Sea air, old libraries and fresh seafood on the Mediterranean."],
  [/hurghada|sharm|dahab|red sea/i, "Red Sea, Slow Days", "Clear water, coral and time to simply switch off."],
];
export function suggestHook(location: string, n: number) {
  const m = SUGGEST.find(([re]) => re.test(location));
  return m ? { title: m[1], hook: m[2] } : { title: location ? `Discover ${location}` : `Day ${n}`, hook: "Another day, another chapter of your Egyptian adventure." };
}

export type TemplateSeed = { name: string; description: string; content: ItineraryContent };
export const TEMPLATES: TemplateSeed[] = [
  {
    name: "Cairo + Nile Cruise, 4 nights (8 days)",
    description: "Cairo, a flight to Luxor, a 4-night Luxor to Aswan cruise, and back to Cairo.",
    content: {
      ...blankItinerary(), title: "Cairo & the Nile", subtitle: "8 days, 7 nights: pyramids, temples and a four-night Nile cruise", sceneKind: "auto",
      intro: "Experience the best of Egypt in eight days, combining the cultural treasures of Cairo with a relaxing four-night Nile cruise from Luxor to Aswan. Explore ancient temples, royal tombs, iconic pyramids and the Grand Egyptian Museum, with comfortable accommodation, private transfers and expert-guided visits throughout.",
      destinations: ["Cairo", "Luxor", "Nile Cruise", "Aswan", "Cairo"],
      highlights: ["Giza Pyramids and the Sphinx", "Valley of the Kings and Hatshepsut Temple", "Four nights on a 5-star Nile cruise ship", "Karnak and Luxor Temple", "Temples of Edfu and Kom Ombo", "Philae Temple and the Aswan High Dam", "Grand Egyptian Museum", "Optional Abu Simbel visit"],
      days: [
        day("Welcome to the Land of the Pharaohs", "Cairo is waiting. Your Egyptian adventure starts here.", "Cairo", [
          blk("TRANSFER", "On arrival", "Airport welcome", "Arrival at Cairo International Airport. Our representative welcomes you and helps with customs formalities.", "Cairo International Airport"),
          blk("TRANSFER", "", "Transfer to your hotel", "A private, air-conditioned vehicle takes you to your hotel.", "Cairo"),
          blk("FREE_TIME", "Evening", "Settle in", "Rest after your journey. Overnight in Cairo."),
        ], { name: "4-star hotel in Cairo", stars: "4 stars", notes: "Double room with private bathroom, A/C, minibar and TV. Breakfast included." }),
        day("Stand Before the Great Pyramids", "Walk in the footsteps of ancient kings and discover the story behind one of the world's greatest wonders.", "Cairo · Giza", [
          blk("MEAL", "Morning", "Breakfast at the hotel"),
          blk("TOUR", "", "Memphis and Sakkara", "Visit the first capital of ancient Egypt and the Step Pyramid of Djoser at Sakkara.", "Memphis · Sakkara"),
          blk("MEAL", "Midday", "Lunch at a traditional restaurant"),
          blk("TOUR", "Afternoon", "The Giza Plateau", "Stand at the foot of the Sphinx and the pyramids of Cheops, Chephren and Mykerinus.", "Giza"),
        ], { name: "4-star hotel in Cairo", stars: "4 stars" }),
        day("Fly South to the Heart of Ancient Egypt", "Leave the capital behind. Luxor's great temples come first, then your floating home for the next four nights.", "Cairo · Luxor", [
          blk("TRANSFER", "Early morning", "Transfer to Cairo Airport"),
          blk("FLIGHT", "", "Flight Cairo to Luxor", "", "Cairo → Luxor"),
          blk("TOUR", "", "Luxor Temple and Karnak", "Explore Luxor Temple, then Karnak, one of the largest temple complexes ever built, dedicated to Amun and other deities.", "Luxor"),
          blk("TRANSFER", "", "Board your Nile cruise ship", "Transfer to the ship and check in.", "Luxor"),
          blk("MEAL", "", "Lunch on board"),
          blk("FREE_TIME", "Afternoon", "Time at leisure on the ship"),
          blk("MEAL", "Evening", "Dinner on board"),
        ], { name: "5-star Nile cruise ship", stars: "5 stars", notes: "Double cabin, full board (breakfast, lunch, dinner), drinks not included." }),
        day("Kings, Queens and Colossal Statues", "Descend into royal tombs, then cast off on the legendary Nile.", "Luxor · Esna · Edfu", [
          blk("MEAL", "Morning", "Breakfast on board"),
          blk("TOUR", "", "Valley of the Kings and Hatshepsut Temple", "Enter the royal tombs of the Valley of the Kings, then visit the temple of Queen Hatshepsut.", "Luxor west bank"),
          blk("TOUR", "", "Colossi of Memnon", "A short stop at the two giant statues on the way back to the ship."),
          blk("ACTIVITY", "Afternoon", "Sail toward Edfu", "Watch village life drift by from the sundeck."),
          blk("MEAL", "", "Lunch and dinner on board"),
        ], { name: "5-star Nile cruise ship", stars: "5 stars" }),
        day("Temples of the Falcon and the Crocodile", "Two of Egypt's best-preserved temples, right on the riverbank.", "Edfu · Kom Ombo", [
          blk("MEAL", "Morning", "Breakfast on board"),
          blk("TOUR", "", "Temple of Horus at Edfu", "Visit the Holy City of Horus and its exceptionally well-preserved temple.", "Edfu"),
          blk("MEAL", "", "Lunch on board"),
          blk("TOUR", "Afternoon", "Temple of Kom Ombo", "A temple shared by two gods: Sobek, the crocodile-headed, and Horus, the falcon-headed.", "Kom Ombo"),
          blk("ACTIVITY", "Evening", "Sail to Aswan"),
          blk("MEAL", "", "Dinner on board"),
        ], { name: "5-star Nile cruise ship", stars: "5 stars" }),
        day("The Pearl of Egypt", "Isis's island temple, and the great dam that tamed the Nile.", "Aswan", [
          blk("MEAL", "Morning", "Breakfast on board"),
          blk("TOUR", "", "Philae Temple", "A guided visit to the temple of Isis, known as the Pearl of Egypt.", "Aswan"),
          blk("TOUR", "", "Aswan High Dam", "See the dam that changed Egypt's relationship with the river."),
          blk("MEAL", "", "Lunch and dinner on board"),
        ], { name: "5-star Nile cruise ship", stars: "5 stars" }),
        day("One Last Morning on the Nile", "Say goodbye to the ship, and if you like, meet Ramses II at Abu Simbel.", "Aswan · Cairo", [
          blk("MEAL", "Morning", "Breakfast and disembarkation"),
          blk("TOUR", "", "Optional: Abu Simbel", "The colossal temples of Ramses II. Optional excursion.", "Abu Simbel", "Optional excursion, ask us for the price."),
          blk("TRANSFER", "", "Transfer to Aswan Airport"),
          blk("FLIGHT", "", "Flight Aswan to Cairo", "", "Aswan → Cairo"),
        ], { name: "4-star hotel in Cairo", stars: "4 stars" }),
        day("The Museum of a Lifetime", "Finish with the Grand Egyptian Museum, Islamic Cairo and the bazaar.", "Cairo", [
          blk("MEAL", "Morning", "Breakfast at the hotel"),
          blk("TOUR", "", "Grand Egyptian Museum", "Transfer to the great GEM Museum.", "Giza"),
          blk("MEAL", "Midday", "Lunch at a typical restaurant"),
          blk("TOUR", "Afternoon", "Islamic Cairo", "Visit the Saladin Citadel and the Mohammed Ali Mosque.", "Cairo"),
          blk("FREE_TIME", "", "Khan el-Khalili bazaar", "Free time for shopping in the famous bazaar."),
          blk("TRANSFER", "Evening", "Transfer to Cairo Airport", "For your departure."),
        ]),
      ],
      included: ["Logistical assistance from our representatives", "All transfers in the program, in modern private air-conditioned vehicles", "Internal flights Cairo/Luxor and Aswan/Cairo", "3 nights in Cairo in a 4-star hotel, double room, with breakfast", "4 nights on a 5-star cruise ship, double cabin, full board (drinks excluded)", "Meals as indicated in the program", "All entrance fees to the sites in the program", "Expert Egyptologist guide (language confirmed at booking)", "All local taxes and fees"],
      excluded: ["International flights", "Entry visa for Egypt", "Drinks", "Tips", "Anything not listed under Included"],
      important: ["Please check the visa requirements for your nationality and make sure your passport is valid.", "Keep your booking reference handy for hotel and ship check-in.", "The Abu Simbel excursion is optional and can be added on request."],
      priceLabel: "", paymentTerms: "",
    },
  },
  {
    name: "5 Days Cairo & Giza",
    description: "A first-timer's Cairo: pyramids, the Grand Egyptian Museum, Old Cairo and Saqqara.",
    content: {
      ...blankItinerary(), title: "Cairo & Giza, Properly", subtitle: "5 days in the city where it all began", sceneKind: "giza",
      intro: "Five relaxed days in Cairo and Giza: the pyramids at the right time of day, a museum that deserves an afternoon, Old Cairo's mosques and markets, and a day out to where pyramid building began.",
      destinations: ["Cairo", "Giza", "Saqqara"],
      highlights: ["Giza Pyramids and the Sphinx", "Grand Egyptian Museum", "Coptic and Islamic Cairo", "Khan el-Khalili bazaar", "Saqqara and Memphis"],
      days: [
        day("Welcome to the Land of the Pharaohs", "Cairo is waiting. Your Egyptian adventure starts here.", "Cairo", [blk("TRANSFER", "On arrival", "Airport meet and greet", "Your driver meets you at arrivals and takes you to your hotel.", "Cairo International Airport"), blk("FREE_TIME", "Evening", "Settle in and rest")], { name: "Hotel in Cairo or Giza", notes: "Confirmed on your quote." }),
        day("Stand Before the Great Pyramids", "Walk in the footsteps of ancient kings and discover the story behind one of the world's greatest wonders.", "Giza", [blk("TRANSFER", "Early", "Hotel pickup"), blk("TOUR", "", "Giza Plateau", "The Great Pyramid, the panoramic viewpoint and the Sphinx, timed around the crowds and the heat.", "Giza"), blk("MEAL", "Midday", "Lunch stop")], { name: "Hotel in Cairo or Giza" }),
        day("A Museum Worth an Afternoon", "Thousands of years of treasures, and a guide who keeps it lively.", "Giza", [blk("TOUR", "Morning", "Grand Egyptian Museum", "Highlights tour with time to linger.", "Giza"), blk("MEAL", "Midday", "Lunch"), blk("FREE_TIME", "Afternoon", "Free time")], { name: "Hotel in Cairo or Giza" }),
        day("Old Cairo, Alive and Loud", "Churches, mosques and a bazaar that never really sleeps.", "Cairo", [blk("TOUR", "Morning", "Coptic Cairo", "The Hanging Church and the old Roman fortress area.", "Coptic Cairo"), blk("TOUR", "Midday", "Islamic Cairo", "Historic mosques and Al-Muizz street.", "Islamic Cairo"), blk("FREE_TIME", "Afternoon", "Khan el-Khalili", "Free time in the bazaar, with a tea stop.")], { name: "Hotel in Cairo or Giza" }),
        day("Where the First Pyramids Began", "A calm last day, and a look back to the very beginning.", "Saqqara · Memphis", [blk("TOUR", "Morning", "Saqqara and Memphis", "The Step Pyramid of Djoser and the ancient capital of Memphis.", "Saqqara"), blk("TRANSFER", "Afternoon", "Transfer to Cairo Airport", "For your departure.")]),
      ],
      included: ["Private transfers in an air-conditioned vehicle", "Hotel pickup and drop-off", "Egyptologist guide on touring days", "Entrance fees to the sites listed", "Bottled water"],
      excluded: ["International flights", "Entry visa for Egypt", "Meals unless listed", "Tips"],
      important: ["Wear comfortable shoes, a hat and sunscreen.", "Exact pickup times are confirmed the day before each tour."],
    },
  },
];
