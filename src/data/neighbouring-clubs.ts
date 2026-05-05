/**
 * Neighbouring clubs whose events PFO members may also want to enter.
 *
 * `bofClubId` is the club's ID inside British Orienteering's event search
 * (the `evt_club=` URL parameter). Used by the build-time fetcher to pull
 * a per-club filtered listing — much more reliable than scraping the
 * national list and matching by club name.
 */

export interface NeighbourClub {
  abbr: string;
  name: string;
  region: string;
  eventsUrl: string;   // public-facing club events page (fallback link)
  bofClubId: number;   // ID inside britishorienteering.org.uk event search
}

export const neighbouringClubs: NeighbourClub[] = [
  {
    abbr: 'EPOC',
    name: 'East Pennine Orienteering Club',
    region: 'West Yorkshire & Pennines',
    eventsUrl: 'https://www.epoc.org.uk/events',
    bofClubId: 26,
  },
  {
    abbr: 'SROC',
    name: 'South Ribble Orienteering Club',
    region: 'Lancashire & Cumbria',
    eventsUrl: 'https://sroc.org/events',
    bofClubId: 81,
  },
  {
    abbr: 'AIRE',
    name: 'Airienteers',
    region: 'Aire Valley & Yorkshire',
    eventsUrl: 'https://aire.org.uk/events',
    bofClubId: 23,
  },
  {
    abbr: 'SELOC',
    name: 'South East Lancashire Orienteering Club',
    region: 'Greater Manchester & East Lancs',
    eventsUrl: 'https://www.seloc.org.uk/wp/events',
    bofClubId: 79,
  },
  {
    abbr: 'MDOC',
    name: 'Manchester & District Orienteering Club',
    region: 'Greater Manchester',
    eventsUrl: 'https://www.mdoc.org.uk/events',
    bofClubId: 66,
  },
];
