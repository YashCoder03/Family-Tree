# Deploying to Vercel

The app is a static site (`public/`) plus one serverless function (`api/[...path].js`) that stores
accounts and trees in **MongoDB**. Everything below uses free tiers.

## 1. MongoDB Atlas (free)

1. Create a free **M0** cluster at <https://www.mongodb.com/atlas>.
2. **Database Access** → add a user with a strong password.
3. **Network Access** → add `0.0.0.0/0` (Vercel's addresses change, so it cannot be one IP).
4. **Connect → Drivers** → copy the connection string (`mongodb+srv://…`) and put your password in it.

## 2. Push the code to GitHub

`data/` (your local trees and accounts), `local/` (your family seed) and `.env*` are ignored by git,
so none of your real data is uploaded.

```
git add .
git commit -m "Family Tree Builder"
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin master
```

## 3. Import into Vercel

1. <https://vercel.com/new> → import the repository. Leave the framework as **Other**; `vercel.json` sets the rest.
2. Add these **Environment Variables** (Settings → Environment Variables), then deploy:

| Name | Required | Meaning |
|---|---|---|
| `MONGODB_URI` | yes | the Atlas connection string |
| `MONGODB_DB` | no | database name, default `familytree` |
| `ALLOW_SIGNUP` | no | set to `false` to stop new accounts (after you and your family have registered) |
| `RESEND_API_KEY` | no | enables reset-code emails through <https://resend.com> |
| `RESEND_FROM` | no | sender, for example `Family Tree <tree@yourdomain.com>`; default is Resend's test sender, which only delivers to your own Resend account email |

Without `RESEND_API_KEY`, password-reset codes are written to the function logs (Vercel → Logs) instead.

## 4. Move your trees to the live site

1. Open your deployed site and **Create account**.
2. On your computer (local server) open each tree and use **Export → Tree file (.json)**.
3. On the live site use **My family trees → Import tree from file**.

## Good to know

- **Live sync:** Vercel cannot hold connections open, so browsers check for changes every 6 seconds while the page is visible (the local server pushes instantly).
- **Size limit:** a tree is saved in one request, and Vercel allows 4.5 MB per request. Photos are shrunk when added, but a tree with very many photos can hit the limit; the footer then says it could not save.
- **Vercel Hobby (free)** is for personal, non-commercial use.
- **Privacy:** view-only links are long random codes. Anyone with a link can see that tree; use **Share → Stop sharing** to turn it off.
- **Local use** is unchanged: `start.cmd` (or `node server.js`) runs the same app on <http://localhost:3000> with file storage in `data/`.
