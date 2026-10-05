# HunterPCBuilds Tech Repair

Website for a student-run PC repair and build service in York, PA.
Built with Vite + React + TypeScript + Tailwind.

## How the folders work
- **Root folder** = the finished website (`index.html`, `assets/`, `gallery/`). GitHub Pages serves this, so don't edit these files by hand.
- **`app/`** = the source code. All your edits happen here.
- `legacy/` = your original single-file site, for reference.

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

**Adding something = copying one `{ ... }` block and pasting it right below.**
Keep the commas. Example, a new repair service:

```ts
{ icon: "🎮", name: "Controller repair", description: "Stick drift fix", price: "$20", plusParts: true },
```

Questions asked in the forms live in `app/src/forms/` (`repairForm.ts`, `buildForm.ts`).

The original single-file version of the site is kept in `legacy/index.html` for reference.

## Status
- [x] Phase 2: public site (all pages, forms validate)
- [ ] Phase 3: Supabase + Web3Forms (forms actually send)
- [ ] Phase 4: admin panel
- [ ] Phase 5: calendar
- [ ] Phase 6: GitHub Pages deploy
