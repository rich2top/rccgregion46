# RCCG Region 46 Quiz App

A clean and modern quiz web app built with Next.js for Vercel deployment.

## Pages

- Landing page with RCCG branding and call to action
- Biodata page for participant details
- Instructions page with test rules and time limit
- Timed quiz page
- Results and answer review page

## Run locally

```bash
npm install
npm run dev
```

## Deploy to Vercel

1. Push this folder to GitHub.
2. Import the project into Vercel.
3. Add `GOOGLE_APPS_SCRIPT_URL` to the project environment variables.
4. Deploy with the default Next.js settings.

## Notes

- Region is fixed to `Region 46`.
- Email is used as the one-attempt identifier.
- Province and Zone are editable fields.
- Quiz questions are generated into `lib/question-banks.generated.js`.
- Google Sheet setup steps are in [google-apps-script/README.md](/home/rich2top/projects/MOTHerRePO/RCCG QUIZ PROJECT/2026/google-apps-script/README.md).
