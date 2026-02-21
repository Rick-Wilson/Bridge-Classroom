/**
 * Baker Bridge Master Taxonomy
 *
 * Complete catalog of all skill paths available in Baker Bridge lesson content.
 * Derived from SkillPath tags embedded in PBN files in Baker-Bridge/Package/.
 *
 * Each entry includes:
 *   - path:        The skill path (category/skill_name)
 *   - name:        Human-readable display name
 *   - category:    Display category name
 *   - pbn:         Source PBN filename
 *   - dealCount:   Number of practice deals available
 */

export const BAKER_BRIDGE_TAXONOMY = [
  // ═══════════════════════════════════════════════════════════════
  // BASIC BIDDING
  // ═══════════════════════════════════════════════════════════════
  { path: 'basic_bidding/major_suit_openings',  name: 'Major Suit Openings',  category: 'Basic Bidding', pbn: 'Major.pbn',    dealCount: 20 },
  { path: 'basic_bidding/minor_suit_openings',  name: 'Minor Suit Openings',  category: 'Basic Bidding', pbn: 'Minor.pbn',    dealCount: 20 },
  { path: 'basic_bidding/notrump_openings',     name: 'Notrump Openings',     category: 'Basic Bidding', pbn: 'Notrump.pbn',  dealCount: 25 },

  // ═══════════════════════════════════════════════════════════════
  // BIDDING CONVENTIONS
  // ═══════════════════════════════════════════════════════════════
  { path: 'bidding_conventions/blackwood',            name: 'Blackwood',             category: 'Bidding Conventions', pbn: 'Blackwood.pbn',  dealCount: 20 },
  { path: 'bidding_conventions/fourth_suit_forcing',  name: 'Fourth Suit Forcing',   category: 'Bidding Conventions', pbn: 'FSF.pbn',        dealCount: 14 },
  { path: 'bidding_conventions/help_suit_game_try',   name: 'Help Suit Game Try',    category: 'Bidding Conventions', pbn: 'Help.pbn',       dealCount: 10 },
  { path: 'bidding_conventions/jacoby_2nt_splinters', name: 'Jacoby 2NT & Splinters', category: 'Bidding Conventions', pbn: 'Jacoby.pbn',    dealCount: 25 },
  { path: 'bidding_conventions/jacoby_transfers',     name: 'Jacoby Transfers',      category: 'Bidding Conventions', pbn: 'Transfers.pbn',  dealCount: 25 },
  { path: 'bidding_conventions/new_minor_forcing',    name: 'New Minor Forcing',     category: 'Bidding Conventions', pbn: 'NMF.pbn',        dealCount: 14 },
  { path: 'bidding_conventions/ogust',                name: 'Ogust',                 category: 'Bidding Conventions', pbn: 'Ogust.pbn',      dealCount: 10 },
  { path: 'bidding_conventions/preemptive_bids',      name: 'Preemptive Bids',       category: 'Bidding Conventions', pbn: 'Preempt.pbn',    dealCount: 12 },
  { path: 'bidding_conventions/reverse_bids',         name: 'Reverse Bids',          category: 'Bidding Conventions', pbn: 'Reverse.pbn',    dealCount: 14 },
  { path: 'bidding_conventions/reverse_drury',        name: 'Reverse Drury',         category: 'Bidding Conventions', pbn: 'Drury.pbn',      dealCount: 8 },
  { path: 'bidding_conventions/roman_keycard',        name: 'Roman Keycard',         category: 'Bidding Conventions', pbn: 'Roman.pbn',      dealCount: 20 },
  { path: 'bidding_conventions/stayman',              name: 'Stayman',               category: 'Bidding Conventions', pbn: 'Stayman.pbn',    dealCount: 25 },
  { path: 'bidding_conventions/strong_2c',            name: 'Strong 2♣',            category: 'Bidding Conventions', pbn: '2Club.pbn',      dealCount: 20 },
  { path: 'bidding_conventions/two_over_one',         name: '2/1 Game Force',        category: 'Bidding Conventions', pbn: '2over1.pbn',     dealCount: 28 },
  { path: 'bidding_conventions/weak_2s',              name: 'Weak Twos',             category: 'Bidding Conventions', pbn: 'Weak2.pbn',      dealCount: 20 },

  // ═══════════════════════════════════════════════════════════════
  // COMPETITIVE BIDDING
  // ═══════════════════════════════════════════════════════════════
  { path: 'competitive_bidding/dont',              name: 'DONT',              category: 'Competitive Bidding', pbn: 'DONT.pbn',      dealCount: 20 },
  { path: 'competitive_bidding/lebensohl',         name: 'Lebensohl',         category: 'Competitive Bidding', pbn: 'Leben.pbn',     dealCount: 20 },
  { path: 'competitive_bidding/michaels_unusual',  name: 'Michaels & Unusual 2NT', category: 'Competitive Bidding', pbn: 'Michaels.pbn', dealCount: 20 },
  { path: 'competitive_bidding/negative_doubles',  name: 'Negative Doubles',  category: 'Competitive Bidding', pbn: 'Negative.pbn',  dealCount: 20 },
  { path: 'competitive_bidding/overcalls',         name: 'Overcalls',         category: 'Competitive Bidding', pbn: 'Overcalls.pbn', dealCount: 20 },
  { path: 'competitive_bidding/support_cuebids',   name: 'Support Cuebids',   category: 'Competitive Bidding', pbn: 'Cue-bid.pbn',   dealCount: 10 },
  { path: 'competitive_bidding/takeout_doubles',   name: 'Takeout Doubles',   category: 'Competitive Bidding', pbn: 'Takeout.pbn',   dealCount: 25 },

  // ═══════════════════════════════════════════════════════════════
  // DECLARER PLAY
  // ═══════════════════════════════════════════════════════════════
  { path: 'declarer_play/elimination_plays',   name: 'Elimination Plays',   category: 'Declarer Play', pbn: 'Eliminations.pbn',   dealCount: 25 },
  { path: 'declarer_play/entry_management',    name: 'Entry Management',    category: 'Declarer Play', pbn: 'Entries.pbn',         dealCount: 20 },
  { path: 'declarer_play/finessing',           name: 'Finessing',           category: 'Declarer Play', pbn: 'Finesse.pbn',         dealCount: 20 },
  { path: 'declarer_play/holdup_plays',        name: 'Holdup Plays',        category: 'Declarer Play', pbn: 'Holdup.pbn',          dealCount: 15 },
  { path: 'declarer_play/squeeze_plays',       name: 'Squeeze Plays',       category: 'Declarer Play', pbn: 'Squeeze.pbn',         dealCount: 20 },
  { path: 'declarer_play/suit_establishment',  name: 'Suit Establishment',  category: 'Declarer Play', pbn: 'Establishment.pbn',   dealCount: 20 },
  { path: 'declarer_play/trump_management',    name: 'Trump Management',    category: 'Declarer Play', pbn: 'Trumpmgmt.pbn',       dealCount: 20 },

  // ═══════════════════════════════════════════════════════════════
  // DEFENSE
  // ═══════════════════════════════════════════════════════════════
  { path: 'defense/defensive_signals',  name: 'Defensive Signals',  category: 'Defense', pbn: 'Signals.pbn',    dealCount: 20 },
  { path: 'defense/opening_leads',      name: 'Opening Leads',      category: 'Defense', pbn: 'OLead.pbn',      dealCount: 20 },
  { path: 'defense/second_hand_play',   name: 'Second Hand Play',   category: 'Defense', pbn: 'SecondHand.pbn', dealCount: 20 },
  { path: 'defense/third_hand_play',    name: 'Third Hand Play',    category: 'Defense', pbn: 'ThirdHand.pbn',  dealCount: 20 },

  // ═══════════════════════════════════════════════════════════════
  // PARTNERSHIP BIDDING (two-player cooperative lessons)
  // ═══════════════════════════════════════════════════════════════
  { path: 'partnership_bidding/advanced_forcing',    name: 'Advanced Forcing',       category: 'Partnership Bidding', pbn: 'Partnership-AdvancedForcing.pbn',    dealCount: 24 },
  { path: 'partnership_bidding/basic_bidding',       name: 'Basic Bidding',          category: 'Partnership Bidding', pbn: 'Partnership-BasicBidding.pbn',       dealCount: 24 },
  { path: 'partnership_bidding/basic_major',         name: 'Basic Major',            category: 'Partnership Bidding', pbn: 'Partnership-BasicMajor.pbn',         dealCount: 24 },
  { path: 'partnership_bidding/basic_notrump',       name: 'Basic Notrump',          category: 'Partnership Bidding', pbn: 'Partnership-BasicNotrump.pbn',       dealCount: 24 },
  { path: 'partnership_bidding/blackwood',           name: 'Blackwood',              category: 'Partnership Bidding', pbn: 'Partnership-Blackwood.pbn',          dealCount: 24 },
  { path: 'partnership_bidding/jacoby_2nt',          name: 'Jacoby 2NT',             category: 'Partnership Bidding', pbn: 'Partnership-Jacoby2NT.pbn',          dealCount: 24 },
  { path: 'partnership_bidding/negative_doubles',    name: 'Negative Doubles',       category: 'Partnership Bidding', pbn: 'Partnership-NegativeDoubles.pbn',    dealCount: 24 },
  { path: 'partnership_bidding/overcalls',           name: 'Overcalls',              category: 'Partnership Bidding', pbn: 'Partnership-Overcalls.pbn',          dealCount: 24 },
  { path: 'partnership_bidding/roman_key_card',      name: 'Roman Key Card',         category: 'Partnership Bidding', pbn: 'Partnership-RomanKeyCard.pbn',       dealCount: 24 },
  { path: 'partnership_bidding/stayman_transfers',   name: 'Stayman & Transfers',    category: 'Partnership Bidding', pbn: 'Partnership-StaymanTransfers.pbn',   dealCount: 24 },
  { path: 'partnership_bidding/two_club',            name: 'Two Club',               category: 'Partnership Bidding', pbn: 'Partnership-TwoClub.pbn',            dealCount: 24 },
  { path: 'partnership_bidding/weak_twos',           name: 'Weak Twos',              category: 'Partnership Bidding', pbn: 'Partnership-WeakTwos.pbn',           dealCount: 24 },

  // ═══════════════════════════════════════════════════════════════
  // PRACTICE DEALS (unguided practice sets)
  // ═══════════════════════════════════════════════════════════════
  { path: 'practice_deals/100_miscellaneous', name: '100 Miscellaneous Deals', category: 'Practice Deals', pbn: '100Deals.pbn', dealCount: 100 },
  { path: 'practice_deals/100_notrump',      name: '100 Notrump Deals',       category: 'Practice Deals', pbn: '100NT.pbn',    dealCount: 100 }
]

/** All unique category names in display order */
export const TAXONOMY_CATEGORIES = [
  'Basic Bidding',
  'Bidding Conventions',
  'Competitive Bidding',
  'Declarer Play',
  'Defense',
  'Partnership Bidding',
  'Practice Deals'
]

/** Lookup a taxonomy entry by skill path */
export function getTaxonomyEntry(skillPath) {
  return BAKER_BRIDGE_TAXONOMY.find(e => e.path === skillPath) || null
}

/** Get all entries for a category */
export function getTaxonomyByCategory(category) {
  return BAKER_BRIDGE_TAXONOMY.filter(e => e.category === category)
}

/** Total deal count across all lessons */
export const TOTAL_DEAL_COUNT = BAKER_BRIDGE_TAXONOMY.reduce((sum, e) => sum + e.dealCount, 0)
