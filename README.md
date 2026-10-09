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

**PC builds page opening:** every time you arrive, a modern glass-panel PC builds itself in about 3 seconds as one continuous motion (the parts float around the case and spiral in together, the PC bounces from the impact, the glass goes on and it powers on as it slides aside), then slides to the right as the page's heading, text and button fade in (on phones and tablets the PC sits above them). The fans keep turning. The drawing is `app/src/components/BuildScene.tsx`; speed (`duration`, in milliseconds), when each part appears (`PARTS`), the bounce and glow (`motion`) and the page text are in `app/src/components/PcBuildHero.tsx`. Fan speed is `.fan-spin` in `app/src/index.css`.

**Tech Repair page opening:** every time you arrive, a broken laptop gets fixed in about 3.5 seconds: new parts (screen, fan, SSD, battery, a security shield) float around it, readouts show the problems in red, old parts pop out as the new ones fly in, it reboots to "All systems normal" and the readouts turn green, then it slides aside as the page text fades in. The drawing is `app/src/components/RepairScene.tsx`; speed and timing are in `app/src/components/RepairHero.tsx`.

**Real photos after the openings:** a few seconds after each opening animation finishes, the drawing can fade into your real photos, which then slowly rotate with a small caption. Put photos in `app/public/photos/` and list them in `app/src/content/heroPhotos.ts` (instructions are at the top of that file). The PC Builds page also uses your real Past builds photos automatically if its own list is empty. With no photos, the drawing just stays.

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

## Admin portal (builds + requests)

A private page at **`/#/admin`** on your site (for example `https://YOUR-SITE.netlify.app/#/admin`). It isn't linked anywhere and search engines are told to skip it. Sign in to:

- **Builds:** add a build (name, price, specs, photos), reorder with ▲▼, and switch where it shows:
  - **Home carousel:** the carousel on the home page.
  - **Past builds:** the gallery on the PC Builds page. Clicking a build shows all its photos.
  - **Slideshow:** its photos rotate at the top of the PC Builds page.
  - **Published:** turn off to hide it (a draft).

  Photos are shrunk automatically when you upload them. Changes show the next time someone loads the page, no rebuild needed. If the list is empty, an **Import** button brings in the photos already in your slideshow.
- **Requests:** every build/repair request from the site's forms (you still get the emails). Filter by status (new → quoted → scheduled → done → archived), search, read every answer, reply by email/call/text, and keep private notes.

It runs on [Supabase](https://supabase.com) (free). Until it's set up, the site simply uses the files in `app/src/content/`, and it falls back to them if Supabase is ever unreachable. Free Supabase projects pause after about a week with no visits; normal site traffic keeps it awake, and if it does pause, open the Supabase dashboard and press "Restore".

**One-time setup:**
1. Create a free account and a new project at supabase.com (any name and region, and save the database password somewhere).
2. In the project, open **SQL Editor → New query**, paste everything in `supabase/schema.sql`, and press **Run**.
3. Open **Authentication → Users → Add user → Create new user**: your email and a strong password, with "Auto Confirm User" ticked. The first user becomes the admin automatically.
4. Open **Authentication → Sign In / Providers** and turn off **Allow new users to sign up**, so nobody else can make an account.
5. Open **Project Settings → API** and copy the **Project URL** and the **anon public** key into `app/.env` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then rebuild. The anon key is safe to be public; the database rules in `schema.sql` only let your admin login read requests or change builds.

To change your password: Supabase dashboard → Authentication → Users → your user → reset or update the password there.

## Status
- [x] Phase 2: public site (all pages, forms validate)
- [x] Phase 3: Web3Forms email + Supabase (requests are emailed and saved)
- [x] Phase 4: admin panel (builds + requests)
- [ ] Phase 5: calendar
- [x] Phase 6: deploy
