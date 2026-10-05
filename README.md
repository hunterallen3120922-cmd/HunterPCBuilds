# HunterPCBuilds Tech Repair

Website for a student-run PC repair and build service in York, PA.
Built with Vite + React + TypeScript + Tailwind.

## Run it on your computer
```
npm install
npm run dev      # opens a live preview
npm run build    # makes the final site in /dist
```

## How to edit the site (no coding experience needed)

**Everything you'll want to change is in `src/content/`.** Open a file, change the
text between the quotes, save. You never need to touch the other folders.

| I want to…                         | Edit this file                  |
| ---------------------------------- | ------------------------------- |
| Change business name, email, footer | `src/content/site.ts`           |
| Change colors or fonts             | `src/content/theme.ts`          |
| Change a repair price              | `src/content/repairServices.ts` |
| Add a repair service               | `src/content/repairServices.ts` (copy a `{ ... }` block) |
| Change build packages              | `src/content/buildTiers.ts`     |
| Add a photo of a finished build    | put the photo in `public/gallery/`, then add a block in `src/content/gallery.ts` |
| Add a FAQ question                 | `src/content/faq.ts`            |
| Change dropdown / choice options in the forms | `src/content/formOptions.ts` |

**Adding something = copying one `{ ... }` block and pasting it right below.**
Keep the commas. Example, a new repair service:

```ts
{ icon: "🎮", name: "Controller repair", description: "Stick drift fix", price: "$20", plusParts: true },
```

Questions asked in the forms live in `src/forms/` (`repairForm.ts`, `buildForm.ts`).

The original single-file version of the site is kept in `legacy/index.html` for reference.

## Status
- [x] Phase 2: public site (all pages, forms validate)
- [ ] Phase 3: Supabase + Web3Forms (forms actually send)
- [ ] Phase 4: admin panel
- [ ] Phase 5: calendar
- [ ] Phase 6: GitHub Pages deploy
