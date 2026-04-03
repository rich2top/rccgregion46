# Google Sheet Setup

Use the Google Sheet you shared, then do the following:

1. Open the sheet.
2. Click `Extensions > Apps Script`.
3. Delete the default code in `Code.gs`.
4. Paste the contents of [Code.gs](/home/rich2top/projects/MOTHerRePO/RCCG QUIZ PROJECT/2026/google-apps-script/Code.gs).
5. Click `Deploy > New deployment`.
6. Choose `Web app`.
7. Set:
   - `Execute as`: `Me`
   - `Who has access`: `Anyone`
8. Deploy and copy the `Web app URL`.
9. Create `.env.local` in this project with:

```bash
GOOGLE_APPS_SCRIPT_URL=PASTE_YOUR_WEB_APP_URL_HERE
```

10. Restart the Next.js app.

## What This Creates

- `Attempts` sheet:
  stores one row per email attempt
- `Leaderboard` sheet:
  stores ranked results after submission or timeout

## Current Ranking Rule

This uses your requested custom tie rule:

- `1, 1, 1, 3`

If you later want standard competition ranking instead:

- `1, 1, 1, 4`

that can be changed easily in `rebuildLeaderboard_()`.
