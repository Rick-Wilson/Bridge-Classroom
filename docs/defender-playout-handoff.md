# Handoff: full defensive play-out lessons (student defends as South)

Branch: `defender-playout-investigation` (not pushed). This issue is the build
spec. Background + rationale: `docs/defender-playout-investigation.md`.

## What we're adding

A lesson type where the student defends an entire hand as South (declarer E/W),
playing every card. The other three seats play a scripted line. When the student
plays a wrong card, the correct card is substituted, play continues, and a short
note explains the right play ("swap-and-explain"). A confirmation note shows on
correct cards too.

## Why it's mostly done

The hard part — a graded, scripted, revertible play-out — is built and tested in
the existing cardplay engine. Remaining work is a parser path and UI wiring.

## Already on the branch

- `src/composables/useCardPlay.js` — new `coachLine` mode. `startPlay({ …,
  coachLine, coachAutoCorrect=true })`. `coachLine` is the full chronological
  line `[{seat,suit,rank,note?}, …]`.
  - Non-user seats play straight from the line (no bot).
  - `onUserCard()` grades the click. Default (`coachAutoCorrect`): a miss records
    the correct card and returns `{ ok:true, corrected:true, expected, note }`;
    `coachNote` = `{ corrected:true, card, wrong, text }`. A correct play returns
    `{ ok:true, corrected:false, note }`. Strict mode (`coachAutoCorrect:false`)
    rejects the click instead.
  - New reactive surface: `coachExpected`, `coachNote`, `lastCoachMiss`.
- `src/composables/__tests__/useCardPlay.coach.test.js` — proves both modes end
  to end (South defends all 13 tricks vs declarer; wrong cards handled). 16/16
  cardplay tests pass; existing behavior unchanged when `coachLine` is absent.
- `docs/sample-defender-playout.pbn` — sample lesson + the proposed `[PlayOut]`
  authoring format (machine-verified-legal line).

## To build

1. **Parser** (`src/utils/pbnParser.js`): read a `[PlayOut "<leader>"]` block
   into `coachLine`. Each trick line is four `<seat>:<card>` tokens in play
   order; the student's card is marked `*` and may carry `{note}`. Capture
   `[Student "S"]` as the student/user seat. Validate each authored line through
   `isLegalPlay` once at parse/build time.
2. **Lesson view**: when a board has a `coachLine`, call
   `useCardPlay.startPlay({ hands, contract, declarer, bot, userSeats:[student],
   coachLine })` and render with the existing `BridgeTable`/`HandDisplay` (as
   `BiddingPracticeView` does). Make the student seat clickable; on `coachNote`
   show the explanation panel; flash `lastCoachMiss.wrong` then the corrected
   card. Reveal dummy after the opening lead (engine already exposes
   `hiddenSeats`/`dummyRevealed`).
3. **Observations**: record each graded card (correct / corrected) into the
   existing observation pipeline, mirroring `useDealPractice`'s
   `recordBoardObservation`, so defender play-outs appear in progress/mastery.

## Watch-outs

- `useCardPlay` and `useDealPractice` are both module-level singletons — reset /
  hand off cleanly if a board mixes bidding/choose-card steps with a play-out.
- Keep opponents scripted; never fall back to the bot mid-line (breaks the
  teaching point; BEN is also slow/networked).
- Confirm the revert UX (swap-and-explain vs strict) per lesson — both supported
  via `coachAutoCorrect`.

## Acceptance

- Loading `sample-defender-playout.pbn` (via the hidden Load-PBN option) plays
  out as a clickable South defense, with swap-and-explain and dummy revealed.
- Wrong-then-correct and all-correct paths both finish 13 tricks with the right
  trick tally and produce an observation.
- `npm test` green.
