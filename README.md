# Middleclass Diecast BST

**Collect Responsibly.**

A simple, mobile-first Buy / Sell / Trade / ISO board for diecast collectors in India.

## What's fixed in this version

- Dark / Light theme toggle with saved preference.
- JSON is loaded with cache-busting and `no-store` headers.
- The supplied sample `data/listings.json` is read correctly.
- Contact platform dropdown has enough width and truncation protection.
- New listings are now written directly into `data/listings.json`.
- Listing IDs are sequential: `MCD001`, `MCD002`, etc.
- Every new listing gets a 7-day expiry.
- Expired listings are removed when the server processes a new listing.
- A daily backup is kept in `data/backups/listings-YYYY-MM-DD.json`.
- If the main JSON is corrupted, the server attempts to restore the newest backup.
- Instagram and YouTube links are visible in the top header.
- Mobile layout remains the priority.

## Important: why there is now a tiny server.py

A browser-only static site **cannot modify a hosted JSON file**. It can read JSON, but it cannot safely write back to `data/listings.json` on the server.

Because you asked for the form to actually add the listing into the existing JSON and maintain a daily backup, this version includes a very small Python standard-library server.

There is still **no database, framework, login system or complicated backend**.

## Run it

Install Python 3 if it is not already installed.

From this project folder:

```bash
python server.py
```

Then open:

`http://localhost:8000`

Do not double-click `index.html`. Use `server.py`.

## How posting works

1. User fills the form.
2. Browser sends the listing to `server.py`.
3. Server assigns the next MCD number.
4. Server writes the listing directly to `data/listings.json`.
5. Before the first write each day, the current JSON is copied to:
   `data/backups/listings-YYYY-MM-DD.json`
6. The page reloads the JSON and immediately displays the new listing.

## Backups

Example:

```text
data/
  listings.json
  backups/
    listings-2026-09-29.json
    listings-2026-09-30.json
```

The backup is made once per calendar day, before the first modification of that day.

The main JSON also contains `postedAt` and `expiresAt`.

## Seven-day expiry

Listings older than seven days are not displayed.

When a new listing is submitted, the server also cleans expired listings from the main JSON.

For a completely automatic cleanup even when nobody submits a new listing, you can later add a daily scheduled task/cron job. The current project deliberately avoids that extra complexity.

## Public deployment

For a real public website, this tiny Python server needs to run on a host that supports Python.

A static host such as GitHub Pages cannot execute `server.py`.

If you eventually want many users, the next logical upgrade would be:

- tiny hosted API
- admin moderation
- report listing
- image upload
- rate limiting / anti-spam
- automated scheduled expiry
- seller verification

The public design does not need to become more complicated.

## Safety

Middleclass Diecast BST is a community listing board. It is not an escrow service or payment-protection service.

Collectors should verify sellers, ask for current photos/video proof, confirm condition, and use safe payment/shipping practices.

For local trades, meet in a safe public place.

## Your links

Instagram:
https://www.instagram.com/middleclass_diecast/

YouTube:
https://www.youtube.com/@MiddleclassGarage
