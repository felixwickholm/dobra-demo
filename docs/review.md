# UX review, 10 November 2026

| Before | After | Why |
| --- | --- | --- |
| Intro dialog covered the requested page | Opens the working view directly; guided tour is optional | Immediate access to the demo |
| Person switch buried in the Today task card | Labelled selector visible on every screen | Easy handover between Johanna and Antti |
| Large presentation panels before the tasks | Compact greeting, relevant counts and next actions | The work leads the screen |
| Repeated fabricated-data notices | Small Demo label and one information page | Less noise during the presentation |
| 30 visible workers against a claimed 214 | Counts derived from the actual 30 records | Numbers agree with the list |
| Filters without text search | Search, combined filters, result count and preserved return links | Faster worker lookup |
| Wide register tables on phones | Labelled stacked rows; filters collapse | Details stay readable |
| Fixed time-savings claims | Editable quantities and minutes with visible calculation | Assumptions can be discussed |
| Simulated send labels | Save-draft and prepare-for-review labels | Actions describe their actual effect |

## Design direction

Editorial greeting, seed 1856874379. Existing Dobra colours and fonts retained. No redraw.
The personal greeting and staffing request are the identifying elements.
Today answers “What needs my attention?” Registers answer “Who fits this staffing need?”

## Verification

- JavaScript syntax checks.
- Browser smoke checks across 12 views at 1440, 768, 390 and 320 pixels.
- Person persistence, search with special characters, combined filters, preserved back links and empty results.
- Calculator recalculation, saved inputs and restored defaults.
- Example answers and unsupported-query fallback.
- Independent browser checks of staffing, application, sales and quote workflows.
- Long/short names, absent optional fields and lists containing 0, 1 and 1000 rows.
- Design inspection at desktop, tablet and phone widths.

One accepted visual warning: the two Today columns have different heights because their task counts differ.
Keeping their natural heights avoids a large blank area in the shorter panel.

## Workflow corrections

- Reset now reloads state immediately and preserves the chosen person.
- Final staffing confirmation requires three unconditional acceptances.
- A housing-dependent reply remains pending.
- Changing person during replies no longer stalls the workflow.
- Customer order status and open counts follow the saved confirmation.
- Quote availability lists the proposed workers instead of unsupported totals.

Final syntax and browser checks passed. No JavaScript page errors occurred in the tested paths.
