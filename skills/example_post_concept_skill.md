# RidePass Social Media Post Concept Skill

## Metadata

- **Type**: Workflow / Creative Briefing Skill
- **Use case**: Generate single-image or multi-image social media post ideas and detailed creative generattion prompt for a given product.
- **Primary output**: Social media post concepts containing caption text and detailed poster/image creative descriptions.
- **Last updated**: 2026-06-19

## Goal

Generate high-quality, single-image or multi-image social media post concepts for the given product.

The output should help a marketing asset team produce consistent, emotionally engaging poster-style creatives.

## Product Context

Refer to the user input {product_desc}.

## Strategic Boundary

This skill creates **marketing concepts and creative briefs**,  finished image files.

## Mandatory Messaging Rules

## Creative Quality Standard

Each post idea must have a clear Ogilvy-style discipline:

- One main promise.
- One main visual idea.
- One emotional hook.
- One proof element.
- One clear CTA.

The creative should be emotionally vivid, not generic.

A good creative brief should allow a designer to visualize the poster without asking follow-up questions. Include:

- Format and aspect ratio.
- Scene setting.
- Foreground and background elements.
- Human emotion or mood.
- Singapore localisation cues.
- Overlay text or proof card.
- Headline.
- Subtext.
- CTA.
- Any UI elements that must or must not appear.

## Output Specification

When asked to brainstorm posts, produce each idea in the following structure:

### [Number] [Post Concept Name]

**Angle:**  
A one-sentence explanation of the strategic angle.

**Caption:**  
Ready-to-use social media caption. Keep it clear, concise, and direct. It may include line breaks. Avoid overloading with emojis. Use Singapore context naturally.

**Poster creative description:**  
A detailed single-image/poster brief.

Include:

- **Format:** Recommended aspect ratio, usually 4:5 for Instagram/Facebook feed, 1:1 for grid-safe concepts, or 9:16 only if the user requests Stories/Reels.
- **Scene & emotion:** Describe the emotional world of the image.
- **Visual composition:** Describe foreground, background, subject, objects, and layout.
- **Proof element:** A visual element that proves recurring/planned/monthly, such as a weekly plan card, calendar strip, route card, weekday chips, monthly plan label, or routine schedule.
- **Headline on poster:** The large text.
- **Subtext on poster:** One short supporting line.
- **CTA line:** The conversion prompt.

## Acceptance Criteria

A completed output is successful only if all criteria below are met.

1. Each post includes both:
   - Ready-to-use caption text.
   - Detailed creative description.
2. Visual creative descriptions must be vivid enough for a designer or image generation agent to execute consistently.


## Methodology Guidance

Think in terms of “category creation,” not just ad copy.

For Ogilvy-style directness, prefer concrete headlines over abstract brand slogans.

Examples

Stronger:

- “Wake up. Your commute is already planned.”
- “Same route. Same time. Same peace.”
- “Fix the last mile. Fix the whole commute.”
- “Plan both sides of your day.”

Weaker:

- “Redefining mobility for modern commuters.”
- “The future of urban travel.”
- “Your journey, elevated.”
- “Mobility made seamless.”

## Known Failure Modes From Prior Iteration