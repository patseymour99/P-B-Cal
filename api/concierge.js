const PROFILE = `Couple (both 26), Farringdon, London. Finance + Consulting.
DINING: Fine dining, tasting menus, omakase, buzzy openings, hidden gems, rooftops, natural wine bars, food markets. Italian, Japanese, Greek, French, Indian, Mexican, Thai. Budget: casual £50 to special occasion £400.
MUSIC: Afrohouse, Amapiano, House, Deep House, Tech House, live jazz, R&B/soul. Artists: The Weeknd, Drake, Central Cee, Dave, Disclosure, Bicep, Jorja Smith, Burna Boy, SZA.
CULTURE: Art exhibitions, galleries, cocktail bars, wine tastings, immersive experiences.
WELLNESS: Contrast therapy (ARC), spas, fitness pop-ups.
SPORTS: Play tennis regularly, training for a half marathon (Nov 2026), enjoy watching ATP/WTA tennis, parkruns.
PROFESSIONAL: Business networking, startup events, tech/AI meetups.`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: "Missing ANTHROPIC_API_KEY" });

  const { message, mode, context } = req.body || {};

  const prompts = {
    chat: `You are the AI concierge for this couple. ${PROFILE}
Give specific, actionable London recommendations using your knowledge of restaurants, bars, events, and experiences. Be warm but concise — 2-3 paragraphs max. Don't suggest things they wouldn't like. ${context || ""}`,

    plandate: `Plan a date night for this couple. ${PROFILE}
Create a specific 3-part plan: 1) Pre-dinner drinks — a cocktail bar or wine spot they'd love 2) Dinner — a restaurant matching their taste, with what to order 3) After — activity, late-night bar, or live music. Use real London venue names, areas, times, and approximate costs. One clear itinerary, not options. ${context || ""}`,

    guestplan: `Create a guest itinerary for visitors staying with this couple in Farringdon. ${PROFILE}
Day-by-day plan mixing culture, food, walks, bars, and nightlife. Use real London venues and times. Include places the couple already loves and hidden gems. Be specific and concise. ${context || ""}`,

    wrap: `Create a fun, warm monthly wrap-up for this couple's shared calendar. ${PROFILE}
Be playful and celebratory. Include: highlight of the month, stats summary, best restaurant, favourite moment, suggestion for next month. 2-3 paragraphs. ${context || ""}`,
  };

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        system: prompts[mode] || prompts.chat,
        messages: [{ role: "user", content: message }],
      }),
    });

    if (!r.ok) { const e = await r.text(); return res.status(500).json({ error: e }); }
    const data = await r.json();
    const text = data.content.filter(b => b.type === "text").map(b => b.text).join("\n");
    return res.status(200).json({ reply: text });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
