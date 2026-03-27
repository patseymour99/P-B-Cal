// Taste profile for P & B — used by Claude to find relevant events
const PROFILE = `You are curating a weekly events guide for a couple (both 26) living in Farringdon, London. One works in Finance, the other in Consulting. They are active, social, and ambitious.

THEIR TASTE PROFILE:
DINING: Fine dining, tasting menus, chef's tables, omakase, buzzy new openings, hidden gems, rooftop restaurants, natural wine bars, food markets and pop-ups. Cuisines they love: Italian, Japanese, Greek/Mediterranean, French, Indian, Mexican, Thai. Budget ranges from casual £50 to special occasion £400.
MUSIC & NIGHTLIFE: Afrohouse and Amapiano nights, House / Deep House / Tech House events, live jazz clubs and jazz nights, R&B/soul nights. They follow artists like The Weeknd, Drake, Central Cee, Dave, Disclosure, Bicep, Jorja Smith, Burna Boy, Wizkid, SZA. They go to both stadium concerts and intimate live music.
CULTURE: Art exhibitions and galleries, immersive experiences, cocktail bars and wine tastings.
WELLNESS & FITNESS: Contrast therapy (love ARC), spas, tennis tournaments to watch (ATP/WTA), running events and parkruns, fitness pop-ups.
PROFESSIONAL: Business networking events, startup meetups, tech conferences, VC/founder events.
SPORTS TO WATCH: Tennis (ATP, WTA, Queen's, Wimbledon), running events, Formula 1 screenings.

IMPORTANT RULES:
- Only include events actually happening THIS WEEK or the next 2-3 weeks
- Include specific dates, not "ongoing" or "weekly" — find real upcoming dates
- Mix categories well: aim for ~6 dining, ~5 music/nightlife, ~4 culture, ~3 wellness/fitness, ~3 professional/sports
- Include any major concerts or tours coming to London by artists they'd like
- Check for tennis events (ATP/WTA tours, exhibition matches) happening in or near London
- Check for upcoming parkruns, half marathons, or running events near London
- Include new restaurant openings and chef collaborations
- Be specific with venue names, areas, and dates`;

export default async function handler(req, res) {
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  const FIREBASE_DB_URL = process.env.FIREBASE_DATABASE_URL;
  if (!ANTHROPIC_API_KEY || !FIREBASE_DB_URL) return res.status(500).json({ error: "Missing env vars" });

  try {
    const today = new Date();
    const dateStr = today.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 3000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{
          role: "user",
          content: `Today is ${dateStr}.

${PROFILE}

Search the web for what is happening in London THIS WEEK and the next 2-3 weeks. Use sources like Time Out London, DesignMyNight, Resident Advisor, DICE, Eventbrite, Hot Dinners, Londonist, Songkick, ATPTour.com, parkrun.org.uk.

Return ONLY a JSON array of 15-25 events. No markdown, no backticks, just the raw JSON array.

Each object must have exactly these fields:
{"id":"d1","title":"Event name","venue":"Venue name","area":"London area","date":"Specific date or date range","cat":"dining|nightout|culture|fitness|work|sport|other","desc":"One sentence. Why it suits them specifically.","tag":"Short 1-2 word tag","src":"Source name"}

Use sequential IDs: d1, d2, d3...`
        }],
      }),
    });

    if (!r.ok) return res.status(500).json({ error: await r.text() });

    const data = await r.json();
    let text = data.content.filter(b => b.type === "text").map(b => b.text).join("");
    text = text.trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");

    let events;
    try { events = JSON.parse(text); }
    catch { const m = text.match(/\[[\s\S]*\]/); if (m) events = JSON.parse(m[0]); else return res.status(500).json({ error: "Parse failed", raw: text.slice(0, 300) }); }

    if (!Array.isArray(events)) return res.status(500).json({ error: "Not array" });

    const payload = { events, updatedAt: new Date().toISOString() };
    const fb = await fetch(`${FIREBASE_DB_URL}/calendar/discover.json`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });

    if (!fb.ok) return res.status(500).json({ error: await fb.text() });
    return res.status(200).json({ success: true, count: events.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
