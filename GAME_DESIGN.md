# Dune Sandglass: design notes

## The idea
Sand art bottles are made by pouring one colour at a time. Sandglass takes away the funnel: everything in the case moves at once, and the only control is which way is down. Planning the order of the turns is the whole puzzle. Watching the sand flow is the reward.

## The sand
- **The grid:** a 48×48 grid of cells: empty, wooden wall, brass sieve, or a grain of one of six colours.
- **Each step:** grains are scanned from the bottom up, in gravity's sense. A grain falls if the cell below is free, otherwise it slides diagonally if both the side and the diagonal cell are free. The side tried first alternates by position and step, so piles form at a natural angle with no bias.
- **Sieves:** only fine white grains may enter or pass a sieve cell.
- **Corks:** in the last chapter, a vial whose every cell is full is corked at once: its mouth becomes wall.
- **Determinism:** the same case and the same turns always give the same sand, which lets a breadth-first search over turn sequences find par exactly, offer hints, and notice when the pattern can no longer be made.

## Vials and layers
A vial is read from its base. Each row's colour is the commonest in it, and runs of rows make the layers. A vial matches when its colours come in the target order, each layer within a row (or a quarter) of the target depth.

## Generation
For each template (hoppers, vials, shelves, sieves, corks, a range for par), the generator lays out wooden hoppers in the corners, open at the top or toward the middle, and puts vials in the middle. Sand that would spill at rest is removed, so nothing moves before the first turn. It then plays a random sequence of turns, and takes what lands in the vials as the target. A case is kept only if:
- every vial ends with one to three clean layers, each at least two rows, and filled at least 40% of the way;
- enough vials are layered;
- the search finds no answer shorter than the template's minimum par.

## Stars
Three at par, two within two turns, one otherwise. A hint caps the case at two.
