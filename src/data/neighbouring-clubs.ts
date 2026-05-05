/**
 * The neighbouring orienteering clubs whose events PFO members may
 * also want to explore. Edit this list to add or remove clubs without
 * touching template code.
 *
 * Each entry must have:
 *   abbr       — short identifier shown as the card eyebrow
 *   name       — full club name
 *   region     — short geographic descriptor
 *   eventsUrl  — direct link to the club's upcoming-events / fixtures page
 */

export interface NeighbourClub {
  abbr: string;
  name: string;
  region: string;
  eventsUrl: string;
}

export const neighbouringClubs: NeighbourClub[] = [
  {
    abbr: 'EPOC',
    name: 'East Pennine Orienteering Club',
    region: 'West Yorkshire & Pennines',
    eventsUrl: 'https://www.epoc.org.uk/events',
  },
  {
    abbr: 'SROC',
    name: 'South Ribble Orienteering Club',
    region: 'Lancashire & Cumbria',
    eventsUrl: 'https://sroc.org/events',
  },
  {
    abbr: 'AIRE',
    name: 'Airienteers',
    region: 'Aire Valley & Yorkshire',
    eventsUrl: 'https://aire.org.uk/events',
  },
  {
    abbr: 'SELOC',
    name: 'South East Lancashire Orienteering Club',
    region: 'Greater Manchester & East Lancs',
    eventsUrl: 'https://www.seloc.org.uk/wp/events',
  },
  {
    abbr: 'MDOC',
    name: 'Manchester & District Orienteering Club',
    region: 'Greater Manchester',
    eventsUrl: 'https://www.mdoc.org.uk/events',
  },
];
