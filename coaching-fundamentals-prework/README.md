# Coaching Fundamentals: Essential Concepts (pre-work e-Learning)

Self-paced pre-workshop e-Learning. Genio Talent Development · www.genio-me.com

Built on the Genio e-Learning engine (`app.js` + `style.css`). All course content is in **`course.js`**: that is the only file you edit.

## Files

```
index.html   course.js   app.js   style.css   README.md   robots.txt
cover.jpg
img/     one image per screen   (M1-01.jpg, M1-02.jpg, ...)
audio/   one narration clip per screen (M1-01.mp3, ...): optional per slide
assets/  Workbook.pdf, logo.png, signature.png, stamp.png
```

## Publishing (GitHub Pages → embed on the Genio site)

1. Copy this folder into your repo under a course slug, e.g. `coaching-fundamentals-prework/`.
2. Repo → **Settings → Pages** → Source: `main`, folder `/ (root)` → Save.
3. Wait ~1 min, then open `https://<user>.github.io/<repo>/coaching-fundamentals-prework/`.
4. In the Hostinger builder, add an **Embed / HTML** element on genio-me.com:

```html
<iframe src="https://<user>.github.io/<repo>/coaching-fundamentals-prework/"
        style="width:100%;height:900px;border:0" loading="lazy"
        title="Coaching Fundamentals e-Learning"></iframe>
```

## Notes

- Progress and quiz scores are stored in the learner's browser (localStorage). No server, no tracking.
- Audio does not autoplay on first load in some embedded contexts: learners press play. This is a browser rule, not a bug; the engine falls back to the transcript if audio can't play.
- `robots.txt` and the `noindex` meta tag keep the course out of search results.
- Bump `build` in `course.js` when you re-publish and want to reset saved progress.


## This build

- Client: Pharo Pharma first line sales managers. 4 modules, 44 screens, about 21 minutes of narration, 17 quiz questions.
- Narration: AI voice (en-GB Ryan). To re-record, keep the same file names in `audio/`.
- Workbook: `assets/Coaching_Fundamentals_Prework_Workbook.pdf` (12 pages, 7 activities, Genio wording).
- Source of truth for content, images and audio: the `build/` scripts (spec.py). Edit spec.py, then re-run make_course.py, make_images.py, make_audio.py.
