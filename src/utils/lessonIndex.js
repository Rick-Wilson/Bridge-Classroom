/**
 * Baker Bridge Lesson Index
 *
 * This file provides the lesson catalog for navigation/browsing.
 * It lists available lessons organized by category with display metadata.
 *
 * NOTE: Skill paths are NOT stored here - they are embedded in PBN files.
 * This separation allows lesson collections from other sources to use
 * their own skill path taxonomy while still being browsable.
 */

/**
 * Lesson catalog organized by category
 */
export const LESSON_CATALOG = {
  // BASIC BIDDING
  'Major': {
    name: 'Major Suit Openings',
    category: 'Basic Bidding',
    description: 'Opening 1H and 1S, responses and rebids'
  },
  'Minor': {
    name: 'Minor Suit Openings',
    category: 'Basic Bidding',
    description: 'Opening 1C and 1D, responses and rebids'
  },
  'Notrump': {
    name: 'Notrump Openings',
    category: 'Basic Bidding',
    description: 'Opening 1NT, 2NT, responses'
  },

  // BIDDING CONVENTIONS
  '2over1': {
    name: '2-Over-1 Game Force',
    category: 'Bidding Conventions',
    description: '2/1 game forcing responses'
  },
  '2Club': {
    name: 'Strong 2C Bids',
    category: 'Bidding Conventions',
    description: 'Strong artificial 2C opening and responses'
  },
  'Blackwood': {
    name: 'Blackwood',
    category: 'Bidding Conventions',
    description: '4NT ace-asking convention'
  },
  'Drury': {
    name: 'Reverse Drury',
    category: 'Bidding Conventions',
    description: '2C response to third/fourth seat major opening'
  },
  'FSF': {
    name: 'Fourth Suit Forcing',
    category: 'Bidding Conventions',
    description: 'Bidding the fourth suit to create a force'
  },
  'Help': {
    name: 'Help Suit Game Try',
    category: 'Bidding Conventions',
    description: 'Game tries after major suit agreement'
  },
  'Jacoby': {
    name: 'Jacoby 2NT / Splinters',
    category: 'Bidding Conventions',
    description: 'Forcing major raises and splinter bids'
  },
  'NMF': {
    name: 'New Minor Forcing',
    category: 'Bidding Conventions',
    description: 'Checkback after 1NT rebid'
  },
  'Ogust': {
    name: 'Ogust',
    category: 'Bidding Conventions',
    description: '2NT inquiry after weak two opening'
  },
  'Preempt': {
    name: 'Preemptive Bids',
    category: 'Bidding Conventions',
    description: 'Three-level and four-level preempts'
  },
  'Reverse': {
    name: 'Reverse Bids',
    category: 'Bidding Conventions',
    description: "Opener's reverse showing extra values"
  },
  'Roman': {
    name: 'Roman Key Card Blackwood',
    category: 'Bidding Conventions',
    description: 'RKCB 1430 or 0314'
  },
  'Stayman': {
    name: 'Stayman',
    category: 'Bidding Conventions',
    description: '2C asking for majors over 1NT'
  },
  'Transfers': {
    name: 'Jacoby Transfers',
    category: 'Bidding Conventions',
    description: 'Transfer bids over 1NT/2NT'
  },
  'Weak2': {
    name: 'Weak 2-Bids',
    category: 'Bidding Conventions',
    description: 'Weak two openings and responses'
  },

  // COMPETITIVE BIDDING
  'Cue-bid': {
    name: 'Support Cue-bids',
    category: 'Competitive Bidding',
    description: "Cue-bidding opponent's suit to show support"
  },
  'DONT': {
    name: 'DONT',
    category: 'Competitive Bidding',
    description: "Disturbing Opponent's Notrump"
  },
  'Leben': {
    name: 'Lebensohl',
    category: 'Competitive Bidding',
    description: 'Lebensohl convention after interference'
  },
  'Michaels': {
    name: 'Michaels / Unusual NT',
    category: 'Competitive Bidding',
    description: 'Two-suited overcalls'
  },
  'Negative': {
    name: 'Negative Doubles',
    category: 'Competitive Bidding',
    description: 'Doubles after opponent overcalls'
  },
  'Overcalls': {
    name: 'Overcalls',
    category: 'Competitive Bidding',
    description: 'Simple and jump overcalls'
  },
  'Takeout': {
    name: 'Takeout Doubles',
    category: 'Competitive Bidding',
    description: 'Takeout doubles and responses'
  },

  // DECLARER PLAY
  'Eliminations': {
    name: 'Elimination Plays',
    category: 'Declarer Play',
    description: 'Strip and endplay techniques'
  },
  'Entries': {
    name: 'Entry Management',
    category: 'Declarer Play',
    description: 'Preserving and creating entries'
  },
  'Establishment': {
    name: 'Suit Establishment',
    category: 'Declarer Play',
    description: 'Setting up long suits'
  },
  'Finesse': {
    name: 'Finessing',
    category: 'Declarer Play',
    description: 'Finesse techniques and combinations'
  },
  'Holdup': {
    name: 'Holdup Plays',
    category: 'Declarer Play',
    description: 'Holding up winners to break communication'
  },
  'Squeeze': {
    name: 'Squeeze Plays',
    category: 'Declarer Play',
    description: 'Simple and compound squeezes'
  },
  'Trumpmgmt': {
    name: 'Trump Management',
    category: 'Declarer Play',
    description: 'Drawing trumps, ruffs, and trump control'
  },

  // DEFENSE
  'OLead': {
    name: 'Opening Leads',
    category: 'Defense',
    description: 'Choosing and making opening leads'
  },
  'SecondHand': {
    name: 'Second Hand Play',
    category: 'Defense',
    description: 'Second hand low and exceptions'
  },
  'Signals': {
    name: 'Defensive Signals',
    category: 'Defense',
    description: 'Attitude, count, and suit preference'
  },
  'ThirdHand': {
    name: 'Third Hand Play',
    category: 'Defense',
    description: 'Third hand high and exceptions'
  },

  // PRACTICE DEALS
  '100Deals': {
    name: '100 Miscellaneous Deals',
    category: 'Practice Deals',
    description: 'Mixed practice deals covering various topics'
  },
  '100NT': {
    name: '100 Notrump Deals',
    category: 'Practice Deals',
    description: 'Notrump bidding and play practice'
  },

  // PARTNERSHIP BIDDING
  'Bidpractice/Set1': {
    name: 'Partnership Bidding Set 1',
    category: 'Partnership Bidding',
    description: 'Partnership bidding practice set 1'
  },
  'Bidpractice/Set2': {
    name: 'Partnership Bidding Set 2',
    category: 'Partnership Bidding',
    description: 'Partnership bidding practice set 2'
  },
  'Bidpractice/Set3': {
    name: 'Partnership Bidding Set 3',
    category: 'Partnership Bidding',
    description: 'Partnership bidding practice set 3'
  },
  'Bidpractice/Set4': {
    name: 'Partnership Bidding Set 4',
    category: 'Partnership Bidding',
    description: 'Partnership bidding practice set 4'
  },
  'Bidpractice/Set5': {
    name: 'Partnership Bidding Set 5',
    category: 'Partnership Bidding',
    description: 'Partnership bidding practice set 5'
  },
  'Bidpractice/Set6': {
    name: 'Partnership Bidding Set 6',
    category: 'Partnership Bidding',
    description: 'Partnership bidding practice set 6'
  },
  'Bidpractice/Set7': {
    name: 'Partnership Bidding Set 7',
    category: 'Partnership Bidding',
    description: 'Partnership bidding practice set 7'
  },
  'Bidpractice/Set8': {
    name: 'Partnership Bidding Set 8',
    category: 'Partnership Bidding',
    description: 'Partnership bidding practice set 8'
  },
  'Bidpractice/Set9': {
    name: 'Partnership Bidding Set 9',
    category: 'Partnership Bidding',
    description: 'Partnership bidding practice set 9'
  },
  'Bidpractice/Set10': {
    name: 'Partnership Bidding Set 10',
    category: 'Partnership Bidding',
    description: 'Partnership bidding practice set 10'
  },
  'Bidpractice/Set11': {
    name: 'Partnership Bidding Set 11',
    category: 'Partnership Bidding',
    description: 'Partnership bidding practice set 11'
  },
  'Bidpractice/Set12': {
    name: 'Partnership Bidding Set 12',
    category: 'Partnership Bidding',
    description: 'Partnership bidding practice set 12'
  }
}

/**
 * Category definitions for navigation
 */
export const CATEGORIES = [
  {
    id: 'basic_bidding',
    name: 'Basic Bidding',
    subfolders: ['Major', 'Minor', 'Notrump'],
    count: 3
  },
  {
    id: 'bidding_conventions',
    name: 'Bidding Conventions',
    subfolders: ['2over1', '2Club', 'Blackwood', 'Drury', 'FSF', 'Help',
                 'Jacoby', 'NMF', 'Ogust', 'Preempt', 'Reverse', 'Roman',
                 'Stayman', 'Transfers', 'Weak2'],
    count: 15
  },
  {
    id: 'competitive_bidding',
    name: 'Competitive Bidding',
    subfolders: ['Cue-bid', 'DONT', 'Leben', 'Michaels', 'Negative',
                 'Overcalls', 'Takeout'],
    count: 7
  },
  {
    id: 'declarer_play',
    name: 'Declarer Play',
    subfolders: ['Eliminations', 'Entries', 'Establishment', 'Finesse',
                 'Holdup', 'Squeeze', 'Trumpmgmt'],
    count: 7
  },
  {
    id: 'defense',
    name: 'Defense',
    subfolders: ['OLead', 'SecondHand', 'Signals', 'ThirdHand'],
    count: 4
  },
  {
    id: 'practice_deals',
    name: 'Practice Deals',
    subfolders: ['100Deals', '100NT'],
    count: 2
  },
  {
    id: 'partnership_bidding',
    name: 'Partnership Bidding',
    subfolders: ['Bidpractice/Set1', 'Bidpractice/Set2', 'Bidpractice/Set3',
                 'Bidpractice/Set4', 'Bidpractice/Set5', 'Bidpractice/Set6',
                 'Bidpractice/Set7', 'Bidpractice/Set8', 'Bidpractice/Set9',
                 'Bidpractice/Set10', 'Bidpractice/Set11', 'Bidpractice/Set12'],
    count: 12
  }
]

/**
 * Get lesson info from subfolder
 * @param {string} subfolder - The subfolder name
 * @returns {Object} Lesson info with name, category, description
 */
export function getLessonInfo(subfolder) {
  return LESSON_CATALOG[subfolder] || {
    name: subfolder,
    category: 'Unknown',
    description: ''
  }
}

/**
 * Get lesson name from subfolder
 * @param {string} subfolder - The subfolder name
 * @returns {string} Lesson name
 */
export function getLessonName(subfolder) {
  return getLessonInfo(subfolder).name
}

/**
 * Get lesson description from subfolder
 * @param {string} subfolder - The subfolder name
 * @returns {string} Lesson description
 */
export function getLessonDescription(subfolder) {
  return getLessonInfo(subfolder).description
}
