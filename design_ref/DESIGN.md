# Design System Document: The Cozy Curator

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Tactile Hug."** We are moving away from the cold, clinical precision of traditional "modern" minimalism and toward a high-end, editorial warmth. The goal is to make the user feel as though they are stepping into a sun-drenched, quiet cafe where every object has been placed with intention.

To break the "template" look, we utilize **Intentional Asymmetry**. Do not align every image to a rigid center; allow cat-themed illustrations to bleed off the edges of containers. Overlap typography onto image containers using negative margins. This layering creates a bespoke, scrapbook-like depth that feels premium and curated rather than "off-the-shelf."

---

## 2. Colors
Our palette is a sophisticated blend of caffeine-inspired tones and organic greens, designed to evoke comfort.

*   **Primary (`#7d5d51`) & Primary Container (`#fcd1c2`):** These represent the roasted bean and the soft foam of a latte. Use them for "warmth" and core actions.
*   **Secondary (`#6f634b`) & Tertiary (`#5d6947`):** The Secondary provides a grounded, woody depth, while the Tertiary (Matcha) acts as a refreshing accent for success states or organic highlights.
*   **The "No-Line" Rule:** Under no circumstances should 1px solid borders be used to define sections. Layout boundaries must be established via color blocking. For example, a `surface-container-low` section should sit directly against a `surface` background to create a soft, edge-less transition.
*   **Surface Hierarchy & Nesting:** Treat the UI as layers of fine parchment. 
    *   **Level 0 (Background):** `surface` (#fffbff)
    *   **Level 1 (Sectioning):** `surface-container-low` (#fdf9ef)
    *   **Level 2 (Cards/Interaction):** `surface-container` (#f7f3e9)
*   **The Glass & Gradient Rule:** For floating headers or navigation bars, use **Glassmorphism**. Apply `surface` at 80% opacity with a `24px` backdrop-blur. For primary CTAs, use a subtle linear gradient from `primary` to `primary_dim` at a 135-degree angle to add "soul" and dimension.

---

## 3. Typography
We utilize **Plus Jakarta Sans** for its friendly, open apertures and modern geometric foundation.

*   **Display (L/M/S):** Used sparingly for "Hero" moments. Use `display-lg` (3.5rem) with tight letter-spacing (-0.02em) to create a bold, editorial impact.
*   **Headlines & Titles:** These are the "voice" of the cafe. They should feel approachable. Use `headline-md` (1.75rem) for section titles to guide the user gently.
*   **Body & Labels:** Designed for maximum legibility. Always ensure `body-md` (0.875rem) has a line-height of at least 1.5 to maintain the "relaxed" atmosphere.
*   **Visual Hierarchy:** Contrast a `display-sm` headline in `on_surface` with a `label-md` in `primary` (all caps, +0.05em tracking) to create a high-end magazine feel.

---

## 4. Elevation & Depth
We eschew traditional "Drop Shadows" in favor of **Tonal Layering**.

*   **The Layering Principle:** To lift a card, do not reach for a shadow first. Place a `surface-container-lowest` (#ffffff) card on a `surface-container` (#f7f3e9) background. The subtle shift in hex code provides enough "lift" for a sophisticated eye.
*   **Ambient Shadows:** When a physical float is required (e.g., a modal), use an ultra-diffused shadow: `box-shadow: 0 20px 40px rgba(57, 56, 50, 0.06);`. The shadow color is a 6% opacity tint of `on_surface`, ensuring it feels like natural light, not a digital effect.
*   **The "Ghost Border" Fallback:** If a container requires a boundary for accessibility, use `outline_variant` at 15% opacity. It should be felt, not seen.
*   **Roundedness Scale:** Everything is soft. Use `xl` (3rem) for main containers and `full` (9999px) for buttons and chips. The large radii are the cornerstone of the "adorable" aesthetic.

---

## 5. Components

### Buttons & Inputs
*   **Primary Button:** Rounded `full`. Background: `primary`. Text: `on_primary`. High-gloss finish: use a 10% white inner glow on the top edge.
*   **Secondary/Ghost Button:** No background. Text: `primary`. On hover, transition to `primary_container` with 0% border.
*   **Input Fields:** Use `surface_container_highest` for the field background. No bottom line. Use `md` (1.5rem) corner radius. Labels should sit "outside" in `label-md` style.

### Cards & Lists
*   **Forbid Dividers:** Do not use horizontal lines to separate list items. Use `spacing-4` (1.4rem) of vertical white space or alternating background tints between `surface` and `surface_container_low`.
*   **Card Styling:** Use `lg` (2rem) corner radius. Content should have generous internal padding (`spacing-6`).

### Signature Components
*   **The "Cat-Nap" Loader:** A custom progress bar using `tertiary_fixed` (Matcha) with a small cat-head icon tracking the progress.
*   **Editorial Hero:** An asymmetrical layout where the image (rounded `xl`) overlaps the header text by `spacing-10`, creating a layered, premium feel.

---

## 6. Do's and Don'ts

### Do:
*   **Do** use white space as a structural tool. If a layout feels crowded, increase spacing tokens by two levels.
*   **Do** lean into the "Adorable" theme by using the `tertiary` (Matcha) color for subtle highlights like notification dots or toggle states.
*   **Do** use "Soft Shadows" only on elements that the user can physically move or click.

### Don't:
*   **Don't** use pure black (#000000). Always use `on_surface` (#393832) for text to maintain the "warm latte" tone.
*   **Don't** use sharp corners. Every corner must have at least the `sm` (0.5rem) radius.
*   **Don't** use "Alert Red" for everything. Use the `error_container` (#fb5151) for a softer, less aggressive warning that fits the "relaxed" brand.