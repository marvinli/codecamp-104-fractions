# The Fraction Carnival: 45-minute lesson plan

**Audience:** Brearley Class IV (4th grade, all girls, 18 students). Per the school's published curriculum they modeled and compared fractions in Class II, did equivalence in Class III, and are doing **fraction operations and decimals** this year, so the math here is pitched at operations, not "what does 3/8 look like."
**Tool:** open the deck in Chrome, click **START THE SHOW** (or press any key), press **F** for fullscreen, and keep sound on (the characters talk). Press **M** to mute everything, or **B** to turn off just the background music (voices stay on). The music ducks automatically whenever a character talks.
**Navigation:** → / Space / clicker = next, ← = back. On slides with builds, Next reveals the next idea before it moves to the next slide.
**Big ideas:** *divide & conquer*, *recursion*, and *fractions as a way to see numbers*.

## Run of show

| Time | Slide(s) | What happens |
|---|---|---|
| 0–7 | **Madame Halvina** | Everyone secretly writes a number from 1 to 1,000. A volunteer answers Halvina's questions (↓ less, ↑ greater, Enter = yes). Play 2–3 rounds with different volunteers. On round 3, have a volunteer **lie**. Halvina catches it. |
| 7–10 | **Halvina's Secret** | Replays the class's last game guess by guess. Each Next = one guess, so half the line disappears. Ask: "Where would YOU guess next?" |
| 10–12 | **Divide & Conquer** | The strategy, the chop animation (1 → 1/2 → 1/4 → … → 1/1,024), and ½ × ½ × … = 1/1,024. |
| 12–15 | **How Big Can We Go?** | Before each reveal, have kids shout guesses. The big one: one second in the life of the universe = **59 guesses**. |
| 15–17 | **Mr. Ledger** (warm-up) | Quick and funny: kids call out 2–3 fractions, show a couple of views (hero health and Show All are the crowd-pleasers). Try 6/8 so he says it can be simplified. Don't linger: it's review for them. |
| 17–23 | **Ledger's Audit** | Five cases, about a minute each. Read the case, give the class 20–30 seconds to work it out (pairs or on paper), take an answer or two, *then* press Next for the proof. Cases: which is larger, 5/8 or 2/3 · prove 6/8 = 3/4 · 7/4 hearts = 1¾ · 1 − 1/4 − 3/8 of a pie · 3 × 2/5 of a boba. Case 1 is the hardest (common denominator 24): let them argue. |
| 23–26 | **Sierpinski Triangle** | BEGIN. Watch the middles fall out. Click a small triangle to zoom: it's the same picture again! |
| 26–32 | **Your Turn!** | Hand out the triangle sheet and set the timer (5 min). Kids draw levels 1–3. |
| 32–37 | **How Much Is Left?** | Have kids compute each step on paper before you press Next: 3/4 → 9/16 → 27/64 → 81/256 → 243/1,024. Then two challenges (question, then Next for the answer): **when did it first drop below ½?** (step 3: 27/64 < 32/64) and the **bonus: about how much after 10 steps?** (¼ × ¼ ≈ 1/16; exactly about 1/18). |
| 37–39 | **Recursion** | A rule that uses itself + a stopping rule. The cat-in-a-frame shows it. |
| 39–44 | **Merge sort (physical) → slide** | 8 kids hold number cards in a line. Split in half, then into quarters (pairs), then eighths: everyone alone is "already sorted." Merge back: the two kids at the front of each line compare cards, and the smaller one steps forward into the new line. Pairs → fours → the whole team. Ask: "What fraction of the team is each group now?" Then play the slide to show what they did. **Round 2 if time:** swap in fraction cards (1/2, 3/8, 2/3, 5/6, 1/4, 7/12, 3/4, 1/3) with the other 8 kids. Same moves, but every comparison is now a fraction comparison. **30-second aside:** one of the first sort-merge programs was written around 1951 by **Betty Holberton**, one of the original ENIAC programmers, for the UNIVAC I. Grace Hopper said it inspired her first ideas about compilers. |
| 44–45 | **You Did It!** | Three badges: Divide & Conquer, Fractions, Recursion. |

## Timing notes

- This plan is **full**. If you run long: play Halvina only twice, skip the Ledger warm-up and go straight to the Audit, do 3 audit cases instead of 5 (1, 3 and 4 are the best), and skip merge sort round 2.
- If you have extra time: let a kid try to "stump" Halvina (impossible: 10 guesses is always enough), or zoom the Sierpinski deeper.

## Talking points

- **Binary search:** "Guess the middle, and every answer throws away half." 1,000 → 500 → 250 → … → 1, in 10 guesses.
- **Divide & conquer:** split a big problem into smaller ones of the same kind. Binary search and merge sort both do it.
- **Fraction operations (Ledger's Audit):** compare with a common denominator (5/8 = 15/24, 2/3 = 16/24); equivalence is "multiply top and bottom by the same number"; an improper fraction is more than one whole (7/4 = 1¾); to add 1/4 + 3/8, rename 1/4 as 2/8 first; 3 × 2/5 = 6/5 = 1⅕.
- **Fractions × fractions:** the Sierpinski triangle keeps 3/4 of what's left each time. 3/4 of 3/4 = 9/16 (multiply tops, multiply bottoms).
- **Recursion:** a rule that uses itself, plus a **stopping rule** so it ends. Sierpinski: "Split into 4, remove the middle, then do the same thing to each corner, unless it's tiny."
- **Merge sort:** split the team in half, again and again (1/2 → 1/4 → 1/8). A group of 1 is already sorted (the stopping rule!). Then merge: compare the two at the front, the smaller one steps up. 8 kids sort in 3 rounds of merging.

## Setup checklist

- [ ] Open `index.html` in Chrome on the projector laptop. Press F for fullscreen and test the sound.
- [ ] Print the Sierpinski triangle sheet (one big equilateral triangle per page) and get colored pencils.
- [ ] Make 8 big number cards for merge sort (any whole numbers, e.g. 3, 17, 8, 12, 1, 20, 6, 14), plus 8 fraction cards for round 2 (1/2, 3/8, 2/3, 5/6, 1/4, 7/12, 3/4, 1/3). Tape a spot on the floor for the "merged" line in front.
- [ ] Scrap paper and pencils for the Audit cases and How Much Is Left?
- [ ] Slides remember nothing between page reloads. Reload before class to reset.
