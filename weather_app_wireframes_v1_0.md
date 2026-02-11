# Weather Web App

## Wireframe & Layout Specification Document

**Version:** 1.0

------------------------------------------------------------------------

# 1. Global Layout Structure

## Protected App Layout

    ┌──────────────────────────────────────────────┐
    │ Top Bar                                      │
    │ Logo | Saved | + Add | Lookup | User Menu   │
    ├──────────────────────────────────────────────┤
    │ Main Content (route outlet)                  │
    └──────────────────────────────────────────────┘

-   AI Lookup is global overlay
-   Add Location: Mobile = full page, Desktop = modal

------------------------------------------------------------------------

# 2. Authentication Views

## Login (Mobile & Desktop)

    ┌──────────────────────────────┐
    │ Weather App                  │
    │                              │
    │ Welcome back                 │
    │                              │
    │ [ Username / Email ]         │
    │ [ Password            👁 ]   │
    │                              │
    │ [ Log in ]                   │
    │                              │
    │ Don't have an account?       │
    │ [ Sign up ]                  │
    └──────────────────────────────┘

## Signup

    ┌──────────────────────────────┐
    │ Weather App                  │
    │                              │
    │ Create account               │
    │                              │
    │ [ Username ]                 │
    │ [ Email ]                    │
    │ [ Password            👁 ]   │
    │ [ Confirm Password    👁 ]   │
    │                              │
    │ [ Create account ]           │
    │                              │
    │ Already have an account?     │
    │ [ Log in ]                   │
    └──────────────────────────────┘

------------------------------------------------------------------------

# 3. Location Detail View

## Mobile Layout

    Location Name
    Condition

          72°
    Feels like 74° • H:78° L:61°

    [ ☔ 10% ][ 💨 8mph ][ 💧 54% ][ UV 5 ] →

    Hourly (horizontal scroll)

    Daily (vertical list)

    Details (accordion)

## Tablet Layout

-   Header stacked
-   Metrics row expanded
-   Hourly partially visible without scroll
-   Details always visible

## Desktop Layout

    Header

    ┌───────────────┬──────────────────┐
    │ Metrics       │ Hourly           │
    ├───────────────┼──────────────────┤
    │ Daily         │ Details          │
    └───────────────┴──────────────────┘

------------------------------------------------------------------------

# 4. Saved Locations View

## Card Order Rules

1.  Current Location (first, not reorderable)
2.  Saved Locations (reorderable)
3.  Add Location card (last, not reorderable)

## Mobile (Carousel)

    [ Current ]
    [ Saved A ]
    [ Saved B ]
    [ + Add ]

Swipe horizontally.

## Desktop (Grid)

    [ Current ] [ Saved A ] [ Saved B ]
    [ Saved C ] [ Saved D ] [ + Add ]

Drag-and-drop reorder (saved only).

------------------------------------------------------------------------

# 5. Add Location

## Mobile (Full Page)

    ← Back     Add Location

    [ Search Input ]

    📍 Use Current Location

    Results List
    [ Austin, TX ]
    [ Austin, MN ]

## Desktop (Modal)

    Add Location   ✕

    [ Search Input ]

    📍 Use Current Location

    Results List

Duplicate entries show badge: "Saved".

------------------------------------------------------------------------

# 6. AI Weather Lookup

Purpose: Natural language weather lookup only. No conversation history.

## Mobile (Fullscreen)

    ← Weather Lookup

    [ What’s the weather in Denver tomorrow? ]

    Result:
    Short summary sentence.

    [ Temporary Weather Card ]

## Desktop (Right Panel)

    Weather Lookup  ✕

    [ Query Input ]

    Result:
    Summary text

    [ Temporary Card ]

Rules: - Only most recent query shown - No back-and-forth chat - Card is
dismissible - Optional "Save Location" CTA

------------------------------------------------------------------------

# 7. Empty & Error States

-   No saved locations → show Current + Add card
-   Geolocation denied → show banner in location detail
-   Search no results → "No locations found"
-   Duplicate save → 409 → show "Already saved"
-   Weather loading → skeleton components

------------------------------------------------------------------------

# 8. Responsive Strategy Summary

Mobile: - Vertical stacking - Horizontal scroll for dense data -
Fullscreen overlays

Desktop: - Grid layouts - Side panels - Modal overlays

------------------------------------------------------------------------

# End of Wireframe Document
