# homemuse.fr

Website of Home Muse, holistic home staging on the Côte d'Azur. English at the root, French under /fr/.

## Home Muse Studio (`/studio/`)

Lou's private iPad app for client visits: one project per client with the archetype quiz, the onboarding questionnaire, visit notes, layout plans drawn to scale and photos of the house. Not linked from the site, hidden from search engines.

- **Data** is saved on the device first (IndexedDB), so it works offline in clients' homes. Sync goes to Lou's own Google Drive (`drive.file` permission only: Studio sees just the files it creates). Setup steps for the Google Client ID are on Studio's Settings page.
- **In Drive**: a `Home Muse Studio` folder with one folder per client (`project.json`, photos, plans and drawings as PNG/JPEG, and a Google Doc with the archetype and onboarding answers), plus two Google Sheets, `Archetype quiz results` and `Onboarding answers`, with one row per submission.
- **Quiz and questionnaire** are the same pages as `/quiz/` and `/clarity/`, opened in a frame with `?studio=<project id>`. In that mode they send their answers to the project instead of emailing directly; Studio saves them to the project, emails them through FormSubmit and adds a row to the matching Google Sheet, queuing both while offline.
- **Offline**: `/studio-sw.js` caches Studio, the quiz and the questionnaire. It is only registered by Studio and ignores every other page of the site.
