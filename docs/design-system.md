# Design system

ADAC4CARE’s interface is quiet, generous, and content-first. The experience should reduce cognitive load on a busy shift rather than resemble dense legacy clinical software.

## Colour

- Primary lavender: `#B19CD7`; the interface uses a darker accessible action shade, `#8F74C2`, for small text and filled controls.
- App background: `#F7F5FB`.
- Navigation sage: `#C2D79C`.
- White surfaces and warm-neutral greys support hierarchy.
- Muted red/amber appears only for missed doses, medication warnings, and errors.

## Type and spacing

Use a modern system sans-serif with clear weight contrast. Body copy should remain comfortable at tablet distance. Space is based on a 4px rhythm with generous 16–24px card padding and 12–20px section gaps.

## Components

- Corners are soft: 12px controls, 18–22px cards and dialogs.
- Shadows are diffuse and low contrast; borders are subtle.
- Status always combines text with colour.
- Every interactive control needs a visible focus style and at least a 40px touch target where practical.
- Motion uses 150–250ms easing and never blocks a medication workflow.

## Content patterns

Use the person’s name first, then medication, dose, route, and time. Use explicit verbs such as “Record as administered.” Never rely on a colour alone for clinical meaning. Confirmation dialogs must keep the eight rights scannable and preserve a clear cancellation path.
