# The Fraction Carnival: 45-minute lesson plan

**Audience:** advanced 4th graders (all-girls class) who are learning fractions.
**Tool:** open `index.html` in Chrome, press **F** for fullscreen, and keep sound on (the characters talk). Press **M** to mute everything, or **B** to turn off just the background music (voices stay on). The music ducks automatically whenever a character talks.
**Navigation:** → / Space / clicker = next, ← = back. On slides with builds, Next reveals the next idea before it moves to the next slide.
**Big ideas:** *divide & conquer*, *recursion*, and *fractions as a way to see numbers*.

## Run of show

| Time | Slide(s) | What happens |
|---|---|---|
| 0–7 | **Madame Halvina** | Everyone secretly writes a number from 1 to 1,000. A volunteer answers Halvina's questions (↓ less, ↑ greater, Enter = yes). Play 2–3 rounds with different volunteers. On round 3, have a volunteer **lie**. Halvina catches it. |
| 7–10 | **Halvina's Secret** | Replays the class's last game guess by guess. Each Next = one guess, so half the line disappears. Ask: "Where would YOU guess next?" |
| 10–12 | **Divide & Conquer** | The strategy, the chop animation (1 → 1/2 → 1/4 → … → 1/1,024), and ½ × ½ × … = 1/1,024. |
| 12–15 | **How Big Can We Go?** | Before each reveal, have kids shout guesses. The big one: one second in the life of the universe = **59 guesses**. |
| 15–22 | **Mr. Ledger** | Kids call out fractions, and you switch between the views (loading bar, pie, chocolate, cats, hero health, boba, battery, Show All). Ask: "Which picture makes 5/12 easiest to see?" |
| 22–25 | **Sierpinski Triangle** | BEGIN. Watch the middles fall out. Click a small triangle to zoom: it's the same picture again! |
| 25–32 | **Your Turn!** | Hand out the triangle sheet and set the timer (5 min). Kids draw levels 1–3. |
| 32–36 | **How Much Is Left?** | Have kids compute each step on paper before you press Next: 3/4 → 9/16 → 27/64 → 81/256 → 243/1,024. |
| 36–38 | **Recursion** | A rule that uses itself + a stopping rule. The cat-in-a-frame shows it. |
| 38–44 | **Merge sort (physical) → slide** | 8 kids hold number cards in a line. Split in half, then into quarters (pairs), then eighths: everyone alone is "already sorted." Merge back: the two kids at the front of each line compare cards, and the smaller one steps forward into the new line. Pairs → fours → the whole team. Ask: "What fraction of the team is each group now?" Then play the slide to show what they did. |
| 44–45 | **You Did It!** | Three badges: Divide & Conquer, Fractions, Recursion. |

## Timing notes

- This plan is **full**. If you run long, shorten Ledger (pick 3 views) and play Halvina only twice.
- If you have extra time: let a kid try to "stump" Halvina (impossible: 10 guesses is always enough), or zoom the Sierpinski deeper.

## Talking points

- **Binary search:** "Guess the middle, and every answer throws away half." 1,000 → 500 → 250 → … → 1, in 10 guesses.
- **Divide & conquer:** split a big problem into smaller ones of the same kind. Binary search and merge sort both do it.
- **Fractions × fractions:** the Sierpinski triangle keeps 3/4 of what's left each time. 3/4 of 3/4 = 9/16 (multiply tops, multiply bottoms).
- **Recursion:** a rule that uses itself, plus a **stopping rule** so it ends. Sierpinski: "Split into 4, remove the middle, then do the same thing to each corner, unless it's tiny."
- **Merge sort:** split the team in half, again and again (1/2 → 1/4 → 1/8). A group of 1 is already sorted (the stopping rule!). Then merge: compare the two at the front, the smaller one steps up. 8 kids sort in 3 rounds of merging.

## Setup checklist

- [ ] Open `index.html` in Chrome on the projector laptop. Press F for fullscreen and test the sound.
- [ ] Print the Sierpinski triangle sheet (one big equilateral triangle per page) and get colored pencils.
- [ ] Make 8 big number cards for merge sort (any whole numbers, e.g. 3, 17, 8, 12, 1, 20, 6, 14). Tape a spot on the floor for the "merged" line in front.
- [ ] Slides remember nothing between page reloads. Reload before class to reset.
