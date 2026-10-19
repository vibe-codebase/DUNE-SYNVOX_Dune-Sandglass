# Dune Sandglass

By **DUNE SYNVOX** · package `com.dunesynvox.dunesandglass` · Expo owner `904-907`.

A puzzle game for Android about coloured sand: turn a glass case a quarter turn at a time, and pour each layer into its vial.

**How it plays.**
- The case holds wooden hoppers of coloured sand, a few shelves, and glass vials.
- Swipe left or right, or tap the brass arrows, to turn the case a quarter turn. Gravity swings round and the sand pours, grain by grain, until it settles.
- Each vial shows faintly the layers it wants, base first, up to a dotted line. Fill every vial with its pattern.
- Order is everything: a vial takes whatever reaches it first. Undo takes back a turn. A hint finds the next turn, and the game tells you when the pattern can no longer be made.
- Stars are vials: three for par (the fewest turns, found by search), two for a couple more. A hint caps a case at two.

**Content.**
- 24 cases in three chapters:
  - **Dunes:** hoppers, shelves and vials.
  - **Sieves:** brass sieves that pass only the fine white sand.
  - **Corks:** a vial is corked the moment it is full, and keeps what it has.
- Every case is generated from a played sequence of turns and checked by a breadth-first search for the shortest answer.

**Look and sound.**
- Visuals:
  - A brass-cornered glass case on a warm wall in low sun, with sand drawn grain by grain and its slopes smoothed into piles.
  - Wooden hoppers, clear glass vials with their wanted layers ghosted in, and corks.
- Sound:
  - A plucked oud and a frame drum in the Hijaz mode.
  - The hiss of sand rising with the flow, and the clink of the case as it turns.
  - A glass note when a vial comes right, and the pop of a cork.

## Structure

| Path | What it is |
| --- | --- |
| `web/src/game/sim.ts` | The sand: a 48×48 cellular automaton with four gravities, sieves, corks, layers, and the breadth-first solver |
| `web/src/game/levels.json` | The 24 generated cases with par and the answer |
| `web/tools/gen.ts` | The case generator |
| `web/src/game/scene.ts` | The Phaser case: turning, pouring, undo, hint, dead-end check |
| `web/brand/` | Icon, splash and feature graphic |
| `Delivery/` | Play Store icon, feature graphic and screenshots |
| `src/native/` | Expo WebView shell |

```bash
npm install && npm run web:install
npm run web:test
npm run build:game && npm run validate:assets && npm run android
```

## Release builds

The Android release is configured for Google Play: target and compile SDK 36, R8 minification and resource shrinking, a non-debuggable release build, no Internet permission, and the game served offline from the app's own assets. Builds run on EAS; `eas.json` has two profiles:

```bash
npm install -g eas-cli && eas login
eas init                     # once: links this folder to your Expo project
npm run eas:apk              # preview profile: a signed APK for testing on devices
npm run eas:aab              # production profile: an AAB for Google Play (versionCode auto-increments)
```
