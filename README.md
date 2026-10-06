# HunterPCBuilds Tech Repair

Website for a student-run PC repair and build service in York, PA.
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
