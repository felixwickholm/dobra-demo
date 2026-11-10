# Dobran työpöytä

A Finnish staffing workflow demo with a personal morning view for Johanna and Antti.

## Try it

**[Open the demo](https://felixwickholm.github.io/dobra-demo/)**

Use **Näytä henkilönä** to switch between Johanna Gräsbeck and Antti Flander.
The selection persists across views and reloads. The sidebar opens all workflows.
**Opastettu kierros** starts a 13-step guide with large instructions, highlighted actions, and saved progress.
Minimize it while trying a task. Escape closes it; the top button resumes the same step.

Included:

- Role-specific priorities and follow-up needs.
- Staffing request → candidate comparison → replies → confirmation draft.
- Spacious application review: original CV, Finnish summary, source links, recommendation and reply.
- Sales dashboard with stage bars, monthly order-value chart, period filters and next actions.
- 20 company records across several industries, plus Finnish/Swedish outreach drafts.
- New leads join the same CRM and sales pipeline.
- Quote preparation and review.
- Searchable worker register, combined filters and linked customer records.
- An editable weekly time-savings calculator.
- Responsive desktop, tablet and mobile layouts.

## Run locally

No build step or backend is required.

```sh
python3 -m http.server 8793 --bind 127.0.0.1
```

Open http://127.0.0.1:8793/.

```sh
npm install
npx playwright install chromium
npm run check
npm test
```

The smoke test assumes the local server is running. Set `DEMO_URL` to test another deployment.

## Demo boundaries

The records, messages and workflow outcomes are sample scenarios. No messages are sent and no customer systems are connected.
Answers use five predefined examples. Workflow state and calculator inputs stay in the current browser's local storage.
The dataset represents 10 November 2026. **Aloita alusta** resets this browser's workflow choices and retains the selected person.

## Source and design

This revision started from the static assets served by https://dobra-demo.vercel.app/ on 10 November 2026.
It retains the original Dobra identity and sample scenarios. Dobra's website, https://dobrafinland.fi/, informed terminology.
The revision uses action-first task lists, a visible person switcher, semantic colors and concise Finnish wording.
The guided tour takes inspiration from https://traficom-console.vercel.app/; the larger in-page guide keeps tasks usable.
Wärtsilä, Valmet and Posti are example target companies. Their names do not imply a customer relationship.
Only these intended demo assets are in this repository. Original client systems and private project records are not included.

Dobra branding belongs to its owner. This repository does not grant rights to reuse third-party branding or fonts.
Roboto and Clash Grotesk are loaded from their original font providers.
