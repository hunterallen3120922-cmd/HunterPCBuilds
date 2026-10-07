# HunterPCBuilds Tech Repair

Website for a student-run PC repair and build service.
Built with Vite + React + TypeScript + Tailwind.

## How the folders work
- **Root folder** = the finished website (`index.html`, `assets/`, `gallery/`). GitHub Pages serves this, so don't edit these files by hand.
- **`app/`** = the source code. All your edits happen here.

## After you edit anything, rebuild
```
cd app
npm install      # first time only
npm run build    # rewrites the finished site in the root folder
```
Then commit and push. Preview before building with `npm run dev`.

**GitHub Pages setting (one time):** Settings → Pages → Source: *Deploy from a branch* → pick the branch → folder **/ (root)**.

## How to edit the site (no coding experience needed)

**Everything you'll want to change is in `app/src/content/`.** Open a file, change the
text between the quotes, save. You never need to touch the other folders.

| I want to…                         | Edit this file                  |
| ---------------------------------- | ------------------------------- |
| Change business name, email, footer | `app/src/content/site.ts`           |
| Change colors or fonts             | `app/src/content/theme.ts`          |
| Change a repair price              | `app/src/content/repairServices.ts` |
| Add a repair service               | `app/src/content/repairServices.ts` (copy a `{ ... }` block) |
| Change build packages              | `app/src/content/buildTiers.ts`     |
| Add a photo of a finished build    | put the photo in `app/public/gallery/`, then add a block in `app/src/content/gallery.ts` |
| Add a FAQ question                 | `app/src/content/faq.ts`            |
| Change dropdown / choice options in the forms | `app/src/content/formOptions.ts` |

**Home page carousel:** it shows the "At a glance" card, every build in `gallery.ts` with `featured: true`, and every repair in `repairServices.ts` with `featured: true`. Set `featured: true` on any entry to add it, remove the line to take it out. The glance rows are in `site.ts`. The carousel is centered, loops forever and rotates by itself; change the speed with `INTERVAL` at the top of `app/src/components/Carousel.tsx` (3500 = 3.5 seconds).

**Home page opening:** your logo, headline and buttons, with a large faint circuit ring behind them. As you scroll, the circuit lines in the badge turn and the ring turns the other way. Speeds are the `deg` numbers in the `.hero-spin` and `.hero-ring` rules in `app/src/index.css`; the artwork is in `app/public/hero/`; the component is `app/src/components/HomeHero.tsx`.

**PC builds page opening:** every time you arrive, a modern glass-panel PC builds itself (power supply, motherboard, CPU cooler, RAM, graphics card, top and front fans, then the glass panel, then it powers on) while four captions walk through the process. It runs on a timer, never reverses, and you can scroll away at any time. When it's built, the page's heading, text and button fade in beside it (on phones and tablets the PC sits above them) and the fans keep turning. There's a "Skip intro" button. Tweak it here:
- Captions: `heroSteps` in `app/src/content/site.ts`.
- The drawing (parts, colors, shapes): `app/src/components/BuildScene.tsx`. The glow uses your accent color from `theme.ts`.
- How long it takes (`DURATION`, in milliseconds), when each part appears (`PARTS`), and the page text: `app/src/components/PcBuildHero.tsx`.
- Fan speed: `.fan-spin` in `app/src/index.css` (`1.3s` per turn).
Visitors who turn on "reduce motion" see the finished layout straight away, with the fans still.

**Tech Repair page opening:** every time you arrive, a broken laptop gets repaired: a scan finds the problems (readouts for CPU temp, battery, disk and malware show in red), the cracked screen clears, old parts pop out and new ones go in, it reboots to "All systems normal" and every readout turns green. Then the page text fades in beside it. Captions are `repairSteps` in `app/src/content/repairServices.ts`; the drawing is `app/src/components/RepairScene.tsx`; timing (`PARTS`, `WINDOWS`, `duration`) is in `app/src/components/RepairHero.tsx`. On phones the readouts are left out so the laptop stays large.

**Adding an animated opening to another page:** both animated openings use `app/src/components/AnimatedHero.tsx`. Give it a drawing, a list of timed parts, captions and the page text (see `PcBuildHero.tsx` or `RepairHero.tsx` as examples).

**Top menu:** it floats invisibly over the top of each page, then condenses into a glass pill once you scroll. Links are the `links` list at the top of `app/src/components/Nav.tsx` (FAQ is in the footer).

**Overall size:** the whole site is sized in `rem`, so one number scales everything. It's the `html { font-size }` rules at the top of `app/src/index.css`: 90% on laptop-sized windows (1024 to 1599px wide), 100% on phones, tablets and big monitors. Make 90% smaller or larger to taste.

**Adding something = copying one `{ ... }` block and pasting it right below.**
Keep the commas. Example, a new repair service:

```ts
{ icon: "🎮", name: "Controller repair", description: "Stick drift fix", price: "$20", plusParts: true },
```

**Icons:** wherever you see `icon: "shield"`, use any name from the list at the top of `app/src/components/Icon.tsx` (search, shield, shield-check, disc, chip, battery, monitor, fan, laptop, desktop, gamepad, phone, help, graduation, tag, chat, pin, box, video, save, wrench, clock, mail).

**Look & feel:** colors, fonts and corner roundness are all in `app/src/content/theme.ts`. The home page "at a glance" card and the "Local, not a call center" text are in `app/src/content/site.ts`.

Questions asked in the forms live in `app/src/forms/` (`repairForm.ts`, `buildForm.ts`).

## Status
- [x] Phase 2: public site (all pages, forms validate)
- [ ] Phase 3: Supabase + Web3Forms (forms actually send)
- [ ] Phase 4: admin panel
- [ ] Phase 5: calendar
- [ ] Phase 6: GitHub Pages deploy
