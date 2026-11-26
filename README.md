# homemuse.fr

Website of Home Muse, holistic home staging on the Côte d'Azur. English at the root, French under /fr/.

## Home Muse Studio (`/studio/`)

Lou's private iPad app for client visits: one project per client with the archetype quiz, the onboarding questionnaire, visit notes, layout plans drawn to scale and photos of the house. Not linked from the site, hidden from search engines.

- **Data** is saved on the device first (IndexedDB), so it works offline in clients' homes. Cloud sync to Lou's own Supabase account is set up from Studio's Settings page (the SQL script is there too).
- **Quiz and questionnaire** are the same pages as `/quiz/` and `/clarity/`, opened in a frame with `?studio=<project id>`. In that mode they send their answers to the project instead of emailing directly; Studio emails them through FormSubmit, queuing them while offline.
- **Offline**: `/studio-sw.js` caches Studio, the quiz and the questionnaire. It is only registered by Studio and ignores every other page of the site.
