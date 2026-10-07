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

**PC builds page opening:** every time you arrive, a modern glass-panel PC builds itself in about 3.5 seconds (the parts float around the case, then fly in one after another, the glass goes on, it powers on), then slides to the right as the page's heading, text and button fade in (on phones and tablets the PC sits above them). The fans keep turning. The drawing is `app/src/components/BuildScene.tsx`; speed (`duration`, in milliseconds), when each part appears (`PARTS`) and the page text are in `app/src/components/PcBuildHero.tsx`. Fan speed is `.fan-spin` in `app/src/index.css`.

**Tech Repair page opening:** every time you arrive, a broken laptop gets fixed in about 3.5 seconds: new parts (screen, fan, SSD, battery, a security shield) float around it, readouts show the problems in red, old parts pop out as the new ones fly in, it reboots to "All systems normal" and the readouts turn green, then it slides aside as the page text fades in. The drawing is `app/src/components/RepairScene.tsx`; speed and timing are in `app/src/components/RepairHero.tsx`.

Floating parts are in `app/src/components/Floaters.tsx` (start positions are the `FLOATS` lists in each scene). Both use `app/src/components/AnimatedHero.tsx`, so another page can get its own animated opening the same way. Visitors who turn on "reduce motion" see the finished layout straight away.

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
