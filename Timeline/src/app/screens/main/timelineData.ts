export interface TimelineEventData {
  /** ISO date string used for ordering events */
  date: string;
  /** Headline displayed next to the marker */
  title: string;
  /** Supporting copy for a bit of story-telling */
  description: string;
}

export const timelineEvents: TimelineEventData[] = [
  {
    date: "2021-12-31",
    title: "Vodga Crashout",
    description:
      "Max geht komplett Crashout nach Silvester, nachdem er ein Vodka Glas geext hat. Er fällt rückwärts von der Couch und schlägt mit dem Kopf auf dem Boden auf. Zum Glück trägt er einen Helm. Er überlebt den Sturz ohne bleibende Schäden. Seitdem meidet er Vodka.",
  },
  {
    date: "2030-09-01",
    title: "Ende",
    description:
      "Leon wird von einem Lidl Truck überfahren. RIP Leon. Er starb im Alter von 29 Jahren. Er hinterlässt eine trauernde Familie und Freunde. Er wird für immer in unseren Herzen bleiben. Möge er in Frieden ruhen. Amen.",
  },
  {
    date: "2003-07-18",
    title: "Anfang vom Ende",
    description:
      "Jerre erblickt das Licht der Welt in einer kleinen Stadt in Deutschland. Seine Eltern sind überglücklich, ihren ersten Sohn willkommen zu heißen.",
  },
  {
    date: "2025-11-15",
    title: "Psychosen beginnen",
    description:
      "Der erste Tag an dem Jerre denkt, dass Leon ihn beobachtet. Er fängt an Paranoia zu entwickeln.",
  },
  {
    date: "2025-11-15",
    title: "Leons Unfall",
    description:
      " Leon hat einen schweren Unfall mit seinem Fahrrad. Er wird ins Krankenhaus eingeliefert und muss mehrere Wochen im Koma verbringen. Seine Freunde und Familie sind sehr besorgt um ihn. Glücklicherweise erholt er sich vollständig.",
  },
];
