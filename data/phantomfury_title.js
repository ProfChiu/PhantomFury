/* phantomfury_title.js — the title screen: who made the original game, what
 * this edition is, and the three ways in (Play, Learn to play, Load).
 *
 * Same voice as Silent War's title screen. Credits are the rulebook's own
 * (source/pdf, p. 2: "Credits").
 */
(function (global) {
  "use strict";

  global.PhantomFuryTitle = {
    kicker: "A digital study edition · Version 1",
    name: "Phantom Fury",
    sub: "The Second Battle of Fallujah, November 2004",
    original: {
      head: "The original board game",
      text: "Solitaire board wargame. Designed by Laurent Closier, developed by Thomas Pouchin, " +
            "artwork by Thomas Pouchin and Nicolas Roblin. Published by Nuts! Publishing: second edition, " +
            "rulebook © 2023 Nuts! Publishing.",
      owns: "Game design, map, counters, charts, rules text and cover art: all Nuts! Publishing. " +
            "Follows their printed rulebook; every rule cites the book's paragraph."
    },
    privacy: {
      head: "For private use only",
      text: "Unofficial, non-commercial translation for study and teaching. Not affiliated with, licensed or endorsed by " +
            "Nuts! Publishing. Not for sale, publication or distribution."
    },
    vibe: {
      head: "Made with vibe coding",
      text: "Tools: Photoshop / Visual Studio / Claude AI."
    },
    buttons: {
      play:  { label: "Play",           sub: "Clear the Jolan district in 16 turns" },
      learn: { label: "Learn to play",  sub: "Seven chapters with Spc. Walsh" },
      load:  { label: "Load a saved game", sub: "No saved game yet" }
    },
    updated: "October 31, 2026"
  };
})(typeof window !== "undefined" ? window : globalThis);
