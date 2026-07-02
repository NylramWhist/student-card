# Student Card

Simple Foundry VTT module for D&D 5e student campaigns.

## Compatibility

- Foundry Virtual Tabletop: generations 13 and 14
- D&D 5e system: 5.0.0 or newer; verified with 5.3.3
- Tidy 5e Sheets: classic and modern actor sheets; verified with 13.5.0

## Features

- Student card stored on each character actor.
- Player-friendly floating card window.
- GM actor directory button for opening student cards quickly.
- Relationships with automatic Friend/Rival status from points.
- Quick +1/-1 relationship controls.
- Manual Beloved and Inspiration tracking.
- Report cards for years 1-4.
- Exam results can automatically create matching Student Dice.
- Extracurriculars, job, and student dice tracking.
- Relationship Inspiration can be spent from a roll prompt to make an extra d20 reroll.
- Preset extracurricular and job dropdowns.
- JSON import/export for student card backups.
- Manual Student Dice reset, plus optional reset after long rest.
- Student Dice prompts driven by the official D&D 5e skill and tool check hooks.
- Open player cards refresh when the GM changes the same actor's record.
- Client setting for showing or hiding the floating button.
- Polish and English localization.

## Usage

- Players can open their own card with the floating graduation-cap button.
- The button uses the selected token first, then the user's assigned character.
- Actor sheets also receive a **Student Card** header button when supported by the sheet.
- The GM can open the actor directory and use **Student Cards** to pick a character.

## Notes

This module intentionally avoids copying adventure text. It provides the tracker and light automation, while names, clubs, jobs, boons, and banes can be entered by the table.

## Changelog

### 1.1.16

- Added a collapsible Student Dice panel so the lower section can be hidden when it is not being used.
- The collapse state is remembered per client and per actor.
