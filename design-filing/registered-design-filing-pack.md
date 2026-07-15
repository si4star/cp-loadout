# UK Registered Design — filing prep pack

**CP Loadout** · prepared 5 July 2026

- File at: https://www.gov.uk/register-a-design (online, single application)
- Fee: £85 for up to 10 designs (£60 for one)
- Views: 1–12 per design; photos or renders accepted. Plain, uncluttered background; only the product in frame; consistent lighting; no unrelated objects.
- Grace period: all products first disclosed within the 3 months before 5 July 2026 → **hard deadline ~April 2027** for the earliest-disclosed design. File sooner — no protection exists until registration.
- Before filing, record the exact first-disclosure date per product below (site launch, social posts, event demos — whichever came first).

| # | Design | First disclosed (fill in) | Status |
|---|--------|---------------------------|--------|
| 1 | Dice Tray — 16mm | | On sale |
| 2 | Token Holder | | On sale |
| 3 | Token Set — Age of Sigmar | | On sale |
| 4 | Token Set — Warhammer 40,000 | | On sale |
| 5 | Seasonal Objectives Storage Case | | On sale |
| 6 | CP, Fury & Rage Tracker | | On sale |
| 7 | Lift-out Tray | | Coming soon — see note |
| 8 | Dice Tray — 12mm | | Coming soon — see note |
| 9 | Dice Tray — Mixed | | Coming soon — see note |

**Coming-soon items (7–9):** if these haven't been shown publicly beyond a name and price on the site, the shapes are undisclosed — filing before you publish any product image gives clean novelty with no reliance on the grace period. The current site shows no images of them, only names/prices.

---

## Per-design image assessment (from /img)

### 1. Dice Tray — 16mm
- **Have:** `dice-tray-16.png` — clean ¾ render, empty tray. Usable.
- **Not usable for this design:** the `dice-tray-16-token-holder*.png` combo renders (contain other products) and hero photos (contain dice, which aren't part of the design).
- **Still needed:** top-down, long side, short side; underside if it has distinctive geometry.

### 2. Token Holder
- **Have: nothing standalone.** Only combo renders exist.
- **Still needed:** full set of solo views — ¾, top (gauge and token rack layout), sides, back.
- ⚠ **Separate site bug found while checking:** `/img/token-holder.png` is referenced by index.html (Step 3 preview fallback and the Token Holder JSON-LD image) but the file doesn't exist in the repo or on the live site. A solo render fixes the filing gap and the 404 together.

### 3–4. Token Sets (AoS / 40K)
- **Have:** `tokens-aos.png` — plain white background, whole set laid out. Good filing quality. `tokens-40k.png` is small (10 KB) — likely needs a better shot.
- **Decision needed:** one registration per *set* protects the collection as depicted; it does not protect individual token designs copied singly. Registering key individual tokens separately costs a design slot each. Worth asking an attorney which matters more.

### 5. Seasonal Objectives Storage Case
- **Have:** `objective-case.png` — photo, ¾ view with lid ajar showing the printed board inside.
- **Not usable as-is:** busy wood table, unrelated objects in the top-left of frame. Retake on plain background or crop tightly.
- **Still needed:** closed top view, open view, side profile, underside.
- **Note:** the printed board inside is visible in the photo. If the board artwork isn't yours to claim, use views of the empty case only.

### 6. CP, Fury & Rage Tracker
- **Have:** `fury-tracker.png` — render, single ¾ view, front only.
- **Still needed:** back view (the battle plan / battle tactic card holder is a distinctive feature — currently undocumented in any image), top-down, side showing peg height.
- **Note:** the "Commands / Fury / Rage" lettering appears in the render. Views define what's protected — decide whether lettering is part of the claimed design or whether to also file a view without it.

### 7–9. Lift-out Tray, Dice Tray 12mm / Mixed
- **Have: nothing.** Renders needed when designs are final — ideally filed before any public image is published.

---

## Summary of image work needed

1. Token Holder — full solo view set (also fixes the live-site 404).
2. Tracker — back, top and side views.
3. Case — plain-background reshoot; closed/open/side/underside.
4. 40K token set — higher-quality layout shot.
5. Additional angles for the 16mm dice tray.
6. Renders for lift-out tray and 12mm/mixed trays when final.

Drop new views in this `design-filing/` folder to keep filing images separate from web images (web renders have styled backgrounds; filing views should be plain).

*Prepared as factual prep, not legal advice. A CIPA-registered design attorney should sanity-check the view sets and the token set-vs-individual question before submission.*
