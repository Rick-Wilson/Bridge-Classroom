/**
 * Baker Bridge Taxonomy
 *
 * ARCHITECTURE NOTE (Feb 2026):
 * Skill paths are now embedded directly in PBN files via [SkillPath "..."] tags.
 * This provides several benefits:
 * - Self-documenting lesson files
 * - Support for lesson collections from other sources
 * - Single source of truth in the content
 *
 * This file is retained for:
 * 1. Backward compatibility with older PBN files lacking embedded skill paths
 * 2. Utility functions for working with skill paths (getSkillFromPath, etc.)
 *
 * For lesson navigation/browsing, use lessonIndex.js instead.
 *
 * Based on the 49 categories from Baker Bridge (1,173 deals total).
 */

/**
 * Complete mapping of Baker Bridge subfolders to skill information
 * @deprecated Prefer using [SkillPath] tag embedded in PBN files.
 * This mapping is maintained for backward compatibility.
 */
export const BAKER_BRIDGE_TAXONOMY = {
  // ═══════════════════════════════════════════════════════════════
  // BASIC BIDDING
  // ═══════════════════════════════════════════════════════════════
  'Major': {
    path: 'basic_bidding/major_suit_openings',
    name: 'Major Suit Openings',
    category: 'Basic Bidding',
    description: 'Opening 1♥ and 1♠, responses and rebids'
  },
  'Minor': {
    path: 'basic_bidding/minor_suit_openings',
    name: 'Minor Suit Openings',
    category: 'Basic Bidding',
    description: 'Opening 1♣ and 1♦, responses and rebids'
  },
  'Notrump': {
    path: 'basic_bidding/notrump_openings',
    name: 'Notrump Openings',
    category: 'Basic Bidding',
    description: 'Opening 1NT, 2NT, responses'
  },

  // ═══════════════════════════════════════════════════════════════
  // BIDDING CONVENTIONS
  // ═══════════════════════════════════════════════════════════════
  '2over1': {
    path: 'bidding_conventions/two_over_one',
    name: '2-Over-1 Game Force',
    category: 'Bidding Conventions',
    description: '2/1 game forcing responses'
  },
  '2Club': {
    path: 'bidding_conventions/strong_2c',
    name: 'Strong 2♣ Bids',
    category: 'Bidding Conventions',
    description: 'Strong artificial 2♣ opening and responses'
  },
  'Blackwood': {
    path: 'bidding_conventions/blackwood',
    name: 'Blackwood',
    category: 'Bidding Conventions',
    description: '4NT ace-asking convention'
  },
  'Drury': {
    path: 'bidding_conventions/reverse_drury',
    name: 'Reverse Drury',
    category: 'Bidding Conventions',
    description: '2♣ response to third/fourth seat major opening'
  },
  'FSF': {
    path: 'bidding_conventions/fourth_suit_forcing',
    name: 'Fourth Suit Forcing',
    category: 'Bidding Conventions',
    description: 'Bidding the fourth suit to create a force'
  },
  'Help': {
    path: 'bidding_conventions/help_suit_game_try',
    name: 'Help Suit Game Try',
    category: 'Bidding Conventions',
    description: 'Game tries after major suit agreement'
  },
  'Jacoby': {
    path: 'bidding_conventions/jacoby_2nt_splinters',
    name: 'Jacoby 2NT / Splinters',
    category: 'Bidding Conventions',
    description: 'Forcing major raises and splinter bids'
  },
  'NMF': {
    path: 'bidding_conventions/new_minor_forcing',
    name: 'New Minor Forcing',
    category: 'Bidding Conventions',
    description: 'Checkback after 1NT rebid'
  },
  'Ogust': {
    path: 'bidding_conventions/ogust',
    name: 'Ogust',
    category: 'Bidding Conventions',
    description: '2NT inquiry after weak two opening'
  },
  'Preempt': {
    path: 'bidding_conventions/preemptive_bids',
    name: 'Preemptive Bids',
    category: 'Bidding Conventions',
    description: 'Three-level and four-level preempts'
  },
  'Reverse': {
    path: 'bidding_conventions/reverse_bids',
    name: 'Reverse Bids',
    category: 'Bidding Conventions',
    description: 'Opener\'s reverse showing extra values'
  },
  'Roman': {
    path: 'bidding_conventions/roman_keycard',
    name: 'Roman Key Card Blackwood',
    category: 'Bidding Conventions',
    description: 'RKCB 1430 or 0314'
  },
  'Stayman': {
    path: 'bidding_conventions/stayman',
    name: 'Stayman',
    category: 'Bidding Conventions',
    description: '2♣ asking for majors over 1NT'
  },
  'Transfers': {
    path: 'bidding_conventions/jacoby_transfers',
    name: 'Jacoby Transfers',
    category: 'Bidding Conventions',
    description: 'Transfer bids over 1NT/2NT'
  },
  'Weak2': {
    path: 'bidding_conventions/weak_2s',
    name: 'Weak 2-Bids',
    category: 'Bidding Conventions',
    description: 'Weak two openings and responses'
  },

  // ═══════════════════════════════════════════════════════════════
  // COMPETITIVE BIDDING
  // ═══════════════════════════════════════════════════════════════
  'Cue-bid': {
    path: 'competitive_bidding/support_cuebids',
    name: 'Support Cue-bids',
    category: 'Competitive Bidding',
    description: 'Cue-bidding opponent\'s suit to show support'
  },
  'DONT': {
    path: 'competitive_bidding/dont',
    name: 'DONT',
    category: 'Competitive Bidding',
    description: 'Disturbing Opponent\'s Notrump'
  },
  'Leben': {
    path: 'competitive_bidding/lebensohl',
    name: 'Lebensohl',
    category: 'Competitive Bidding',
    description: 'Lebensohl convention after interference'
  },
  'Michaels': {
    path: 'competitive_bidding/michaels_unusual',
    name: 'Michaels / Unusual NT',
    category: 'Competitive Bidding',
    description: 'Two-suited overcalls'
  },
  'Negative': {
    path: 'competitive_bidding/negative_doubles',
    name: 'Negative Doubles',
    category: 'Competitive Bidding',
    description: 'Doubles after opponent overcalls'
  },
  'Overcalls': {
    path: 'competitive_bidding/overcalls',
    name: 'Overcalls',
    category: 'Competitive Bidding',
    description: 'Simple and jump overcalls'
  },
  'Takeout': {
    path: 'competitive_bidding/takeout_doubles',
    name: 'Takeout Doubles',
    category: 'Competitive Bidding',
    description: 'Takeout doubles and responses'
  },

  // ═══════════════════════════════════════════════════════════════
  // DECLARER PLAY
  // ═══════════════════════════════════════════════════════════════
  'Eliminations': {
    path: 'declarer_play/elimination_plays',
    name: 'Elimination Plays',
    category: 'Declarer Play',
    description: 'Strip and endplay techniques'
  },
  'Entries': {
    path: 'declarer_play/entry_management',
    name: 'Entry Management',
    category: 'Declarer Play',
    description: 'Preserving and creating entries'
  },
  'Establishment': {
    path: 'declarer_play/suit_establishment',
    name: 'Suit Establishment',
    category: 'Declarer Play',
    description: 'Setting up long suits'
  },
  'Finesse': {
    path: 'declarer_play/finessing',
    name: 'Finessing',
    category: 'Declarer Play',
    description: 'Finesse techniques and combinations'
  },
  'Holdup': {
    path: 'declarer_play/holdup_plays',
    name: 'Holdup Plays',
    category: 'Declarer Play',
    description: 'Holding up winners to break communication'
  },
  'Squeeze': {
    path: 'declarer_play/squeeze_plays',
    name: 'Squeeze Plays',
    category: 'Declarer Play',
    description: 'Simple and compound squeezes'
  },
  'Trumpmgmt': {
    path: 'declarer_play/trump_management',
    name: 'Trump Management',
    category: 'Declarer Play',
    description: 'Drawing trumps, ruffs, and trump control'
  },

  // ═══════════════════════════════════════════════════════════════
  // DEFENSE
  // ═══════════════════════════════════════════════════════════════
  'OLead': {
    path: 'defense/opening_leads',
    name: 'Opening Leads',
    category: 'Defense',
    description: 'Choosing and making opening leads'
  },
  'SecondHand': {
    path: 'defense/second_hand_play',
    name: 'Second Hand Play',
    category: 'Defense',
    description: 'Second hand low and exceptions'
  },
  'Signals': {
    path: 'defense/defensive_signals',
    name: 'Defensive Signals',
    category: 'Defense',
    description: 'Attitude, count, and suit preference'
  },
  'ThirdHand': {
    path: 'defense/third_hand_play',
    name: 'Third Hand Play',
    category: 'Defense',
    description: 'Third hand high and exceptions'
  },

  // ═══════════════════════════════════════════════════════════════
  // PRACTICE DEALS
  // ═══════════════════════════════════════════════════════════════
  '100Deals': {
    path: 'practice_deals/100_miscellaneous',
    name: '100 Miscellaneous Deals',
    category: 'Practice Deals',
    description: 'Mixed practice deals covering various topics'
  },
  '100NT': {
    path: 'practice_deals/100_notrump',
    name: '100 Notrump Deals',
    category: 'Practice Deals',
    description: 'Notrump bidding and play practice'
  },

  // ═══════════════════════════════════════════════════════════════
  // PARTNERSHIP BIDDING
  // ═══════════════════════════════════════════════════════════════
  'Bidpractice/Set1': {
    path: 'partnership_bidding/set_01',
    name: 'Partnership Bidding Set 1',
    category: 'Partnership Bidding',
    description: 'Partnership bidding practice set 1'
  },
  'Bidpractice/Set2': {
    path: 'partnership_bidding/set_02',
    name: 'Partnership Bidding Set 2',
    category: 'Partnership Bidding',
    description: 'Partnership bidding practice set 2'
  },
  'Bidpractice/Set3': {
    path: 'partnership_bidding/set_03',
    name: 'Partnership Bidding Set 3',
    category: 'Partnership Bidding',
    description: 'Partnership bidding practice set 3'
  },
  'Bidpractice/Set4': {
    path: 'partnership_bidding/set_04',
    name: 'Partnership Bidding Set 4',
    category: 'Partnership Bidding',
    description: 'Partnership bidding practice set 4'
  },
  'Bidpractice/Set5': {
    path: 'partnership_bidding/set_05',
    name: 'Partnership Bidding Set 5',
    category: 'Partnership Bidding',
    description: 'Partnership bidding practice set 5'
  },
  'Bidpractice/Set6': {
    path: 'partnership_bidding/set_06',
    name: 'Partnership Bidding Set 6',
    category: 'Partnership Bidding',
    description: 'Partnership bidding practice set 6'
  },
  'Bidpractice/Set7': {
    path: 'partnership_bidding/set_07',
    name: 'Partnership Bidding Set 7',
    category: 'Partnership Bidding',
    description: 'Partnership bidding practice set 7'
  },
  'Bidpractice/Set8': {
    path: 'partnership_bidding/set_08',
    name: 'Partnership Bidding Set 8',
    category: 'Partnership Bidding',
    description: 'Partnership bidding practice set 8'
  },
  'Bidpractice/Set9': {
    path: 'partnership_bidding/set_09',
    name: 'Partnership Bidding Set 9',
    category: 'Partnership Bidding',
    description: 'Partnership bidding practice set 9'
  },
  'Bidpractice/Set10': {
    path: 'partnership_bidding/set_10',
    name: 'Partnership Bidding Set 10',
    category: 'Partnership Bidding',
    description: 'Partnership bidding practice set 10'
  },
  'Bidpractice/Set11': {
    path: 'partnership_bidding/set_11',
    name: 'Partnership Bidding Set 11',
    category: 'Partnership Bidding',
    description: 'Partnership bidding practice set 11'
  },
  'Bidpractice/Set12': {
    path: 'partnership_bidding/set_12',
    name: 'Partnership Bidding Set 12',
    category: 'Partnership Bidding',
    description: 'Partnership bidding practice set 12'
  }
}

/**
 * Category summary information
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
 * Get skill info from Baker Bridge subfolder
 * @param {string} subfolder - The Baker Bridge subfolder name
 * @returns {Object} Skill information with path, name, category, description
 */
export function getSkillFromSubfolder(subfolder) {
  // Direct lookup
  if (BAKER_BRIDGE_TAXONOMY[subfolder]) {
    return BAKER_BRIDGE_TAXONOMY[subfolder]
  }

  // Try case-insensitive lookup
  const lowerSubfolder = subfolder.toLowerCase()
  for (const [key, value] of Object.entries(BAKER_BRIDGE_TAXONOMY)) {
    if (key.toLowerCase() === lowerSubfolder) {
      return value
    }
  }

  // Return unknown category for unrecognized subfolders
  return {
    path: `unknown/${subfolder.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
    name: subfolder,
    category: 'Unknown',
    description: ''
  }
}

/**
 * Get skill path from subfolder (convenience function)
 * @param {string} subfolder - The Baker Bridge subfolder name
 * @returns {string} The skill path
 */
export function getSkillPath(subfolder) {
  return getSkillFromSubfolder(subfolder).path
}

/**
 * Get all skills in a category
 * @param {string} categoryId - Category ID (e.g., 'basic_bidding')
 * @returns {Array} Array of skill objects with subfolder included
 */
export function getSkillsByCategory(categoryId) {
  const normalizedCategoryId = categoryId.toLowerCase().replace(/ /g, '_')

  return Object.entries(BAKER_BRIDGE_TAXONOMY)
    .filter(([_, skill]) => {
      const skillCategoryId = skill.category.toLowerCase().replace(/ /g, '_')
      return skillCategoryId === normalizedCategoryId
    })
    .map(([subfolder, skill]) => ({ subfolder, ...skill }))
}

/**
 * Get skill info from skill path (reverse lookup)
 * @param {string} skillPath - The skill path (e.g., 'bidding_conventions/stayman')
 * @returns {Object} Skill information with name, category, description
 */
export function getSkillFromPath(skillPath) {
  for (const [subfolder, skill] of Object.entries(BAKER_BRIDGE_TAXONOMY)) {
    if (skill.path === skillPath) {
      return { subfolder, ...skill }
    }
  }

  // Return generic info for unknown paths
  const parts = skillPath.split('/')
  const name = parts[parts.length - 1]
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  return {
    subfolder: null,
    path: skillPath,
    name: name,
    category: parts[0] ? parts[0].split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Unknown',
    description: ''
  }
}

/**
 * Get category from skill path
 * @param {string} skillPath - The skill path (e.g., 'bidding_conventions/stayman')
 * @returns {string} The category ID
 */
export function getCategoryFromPath(skillPath) {
  const [category] = skillPath.split('/')
  return category
}

/**
 * Get category info by ID
 * @param {string} categoryId - Category ID
 * @returns {Object|null} Category info or null if not found
 */
export function getCategoryById(categoryId) {
  return CATEGORIES.find(cat => cat.id === categoryId) || null
}

/**
 * Get category info from skill path
 * @param {string} skillPath - The skill path
 * @returns {Object|null} Category info or null if not found
 */
export function getCategoryFromSkillPath(skillPath) {
  const categoryId = getCategoryFromPath(skillPath)
  return getCategoryById(categoryId)
}

/**
 * Group observations by category
 * @param {Array} observations - Array of observation objects
 * @returns {Object} Object with category IDs as keys and observation arrays as values
 */
export function groupObservationsByCategory(observations) {
  const groups = {}

  for (const obs of observations) {
    const category = getCategoryFromPath(obs.skill_path)
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category].push(obs)
  }

  return groups
}

/**
 * Group observations by skill
 * @param {Array} observations - Array of observation objects
 * @returns {Object} Object with skill paths as keys and observation arrays as values
 */
export function groupObservationsBySkill(observations) {
  const groups = {}

  for (const obs of observations) {
    if (!groups[obs.skill_path]) {
      groups[obs.skill_path] = []
    }
    groups[obs.skill_path].push(obs)
  }

  return groups
}

/**
 * Check if a subfolder is valid (exists in taxonomy)
 * @param {string} subfolder - The subfolder to check
 * @returns {boolean} True if valid
 */
export function isValidSubfolder(subfolder) {
  if (BAKER_BRIDGE_TAXONOMY[subfolder]) {
    return true
  }

  // Case-insensitive check
  const lowerSubfolder = subfolder.toLowerCase()
  return Object.keys(BAKER_BRIDGE_TAXONOMY).some(
    key => key.toLowerCase() === lowerSubfolder
  )
}

/**
 * Get all subfolders as a flat array
 * @returns {string[]} Array of all subfolder names
 */
export function getAllSubfolders() {
  return Object.keys(BAKER_BRIDGE_TAXONOMY)
}

/**
 * Get all skill paths as a flat array
 * @returns {string[]} Array of all skill paths
 */
export function getAllSkillPaths() {
  return Object.values(BAKER_BRIDGE_TAXONOMY).map(skill => skill.path)
}
