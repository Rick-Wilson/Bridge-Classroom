/**
 * Convention Card to Baker Bridge Taxonomy Mapping
 *
 * Maps convention card JSON paths to Baker Bridge skill paths.
 * Each entry defines a card_path (dotted path into the convention card JSON),
 * a condition for when the mapping applies, and the resulting skill_paths.
 *
 * See docs/CARD_TAXONOMY_MAPPING.md for the full reference.
 */

export const CARD_TO_TAXONOMY_MAPPING = [
  // Core skills — always included regardless of convention card
  {
    card_path: null,
    condition: { type: 'always' },
    skill_paths: [
      'basic_bidding/major_suit_openings',
      'basic_bidding/minor_suit_openings',
      'basic_bidding/notrump_openings',
      'competitive_bidding/overcalls',
      'competitive_bidding/takeout_doubles',
      'declarer_play/finessing',
      'declarer_play/entry_management',
      'declarer_play/holdup_plays',
      'declarer_play/suit_establishment',
      'declarer_play/trump_management',
      'declarer_play/elimination_plays',
      'declarer_play/squeeze_plays',
      'defense/opening_leads',
      'defense/defensive_signals',
      'defense/second_hand_play',
      'defense/third_hand_play',
      'bidding_conventions/reverse_bids'
    ],
    description: 'Core skills always relevant'
  },

  // Notrump conventions
  {
    card_path: 'notrump.stayman.forcing',
    condition: { type: 'equals', value: true },
    skill_paths: ['bidding_conventions/stayman'],
    description: 'Stayman convention'
  },
  {
    card_path: 'notrump.stayman.puppet',
    condition: { type: 'equals', value: true },
    skill_paths: ['bidding_conventions/stayman'],
    description: 'Puppet Stayman'
  },
  {
    card_path: 'notrump.transfers.jacoby',
    condition: { type: 'equals', value: true },
    skill_paths: ['bidding_conventions/jacoby_transfers'],
    description: 'Jacoby Transfers'
  },
  {
    card_path: 'notrump.transfers.texas',
    condition: { type: 'equals', value: true },
    skill_paths: ['bidding_conventions/jacoby_transfers'],
    description: 'Texas Transfers (part of transfer system)'
  },
  {
    card_path: 'notrump.lebensohl.over_interference',
    condition: { type: 'equals', value: true },
    skill_paths: ['competitive_bidding/lebensohl'],
    description: 'Lebensohl over interference'
  },
  {
    card_path: 'notrump.lebensohl.over_weak_twos',
    condition: { type: 'equals', value: true },
    skill_paths: ['competitive_bidding/lebensohl'],
    description: 'Lebensohl over weak twos'
  },

  // Major opening conventions
  {
    card_path: 'major_openings.two_over_one.game_force',
    condition: { type: 'equals', value: true },
    skill_paths: ['bidding_conventions/two_over_one'],
    description: '2/1 Game Force'
  },
  {
    card_path: 'major_openings.jacoby_2nt.play',
    condition: { type: 'equals', value: true },
    skill_paths: ['bidding_conventions/jacoby_2nt_splinters'],
    description: 'Jacoby 2NT'
  },
  {
    card_path: 'major_openings.splinters.play',
    condition: { type: 'equals', value: true },
    skill_paths: ['bidding_conventions/jacoby_2nt_splinters'],
    description: 'Splinter bids'
  },
  {
    card_path: 'major_openings.drury.play',
    condition: { type: 'equals', value: true },
    skill_paths: ['bidding_conventions/reverse_drury'],
    description: 'Drury convention'
  },
  {
    card_path: 'other_conventions.help_suit_game_tries.play',
    condition: { type: 'equals', value: true },
    skill_paths: ['bidding_conventions/help_suit_game_try'],
    description: 'Help Suit Game Tries'
  },

  // Two-level openings
  {
    card_path: 'two_level.two_clubs.meaning',
    condition: { type: 'equals', value: 'strong' },
    skill_paths: ['bidding_conventions/strong_2c'],
    description: 'Strong 2C opening'
  },
  {
    card_path: 'two_level.two_diamonds.meaning',
    condition: { type: 'equals', value: 'weak' },
    skill_paths: ['bidding_conventions/weak_2s'],
    description: 'Weak 2D'
  },
  {
    card_path: 'two_level.two_hearts.meaning',
    condition: { type: 'equals', value: 'weak' },
    skill_paths: ['bidding_conventions/weak_2s'],
    description: 'Weak 2H'
  },
  {
    card_path: 'two_level.two_spades.meaning',
    condition: { type: 'equals', value: 'weak' },
    skill_paths: ['bidding_conventions/weak_2s'],
    description: 'Weak 2S'
  },
  {
    card_path: 'two_level.ogust.play',
    condition: { type: 'equals', value: true },
    skill_paths: ['bidding_conventions/ogust'],
    description: 'Ogust responses to weak twos'
  },

  // Slam bidding
  {
    card_path: 'other_conventions.blackwood.standard',
    condition: { type: 'equals', value: true },
    skill_paths: ['bidding_conventions/blackwood'],
    description: 'Standard Blackwood'
  },
  {
    card_path: 'other_conventions.blackwood.rkcb_1430',
    condition: { type: 'equals', value: true },
    skill_paths: ['bidding_conventions/roman_keycard'],
    description: 'RKCB 1430'
  },
  {
    card_path: 'other_conventions.blackwood.rkcb_0314',
    condition: { type: 'equals', value: true },
    skill_paths: ['bidding_conventions/roman_keycard'],
    description: 'RKCB 0314'
  },
  {
    card_path: 'other_conventions.gerber.play',
    condition: { type: 'equals', value: true },
    skill_paths: ['bidding_conventions/blackwood'],
    description: 'Gerber (grouped with Blackwood)'
  },

  // Other conventions
  {
    card_path: 'other_conventions.new_minor_forcing.play',
    condition: { type: 'equals', value: true },
    skill_paths: ['bidding_conventions/new_minor_forcing'],
    description: 'New Minor Forcing'
  },
  {
    card_path: 'other_conventions.fourth_suit_forcing.play',
    condition: { type: 'equals', value: true },
    skill_paths: ['bidding_conventions/fourth_suit_forcing'],
    description: 'Fourth Suit Forcing'
  },

  // Competitive bidding
  {
    card_path: 'competitive.negative_doubles.through',
    condition: { type: 'exists' },
    skill_paths: ['competitive_bidding/negative_doubles'],
    description: 'Negative Doubles'
  },
  {
    card_path: 'competitive.michaels.play',
    condition: { type: 'equals', value: true },
    skill_paths: ['competitive_bidding/michaels_unusual'],
    description: 'Michaels Cue Bid'
  },
  {
    card_path: 'competitive.unusual_2nt.play',
    condition: { type: 'equals', value: true },
    skill_paths: ['competitive_bidding/michaels_unusual'],
    description: 'Unusual 2NT'
  },
  {
    card_path: 'competitive.dont.play',
    condition: { type: 'equals', value: true },
    skill_paths: ['competitive_bidding/dont'],
    description: 'DONT convention'
  },
  {
    card_path: 'competitive.support_doubles.play',
    condition: { type: 'equals', value: true },
    skill_paths: ['competitive_bidding/support_cuebids'],
    description: 'Support Doubles'
  },

  // Preempts
  {
    card_path: 'two_level.two_diamonds.meaning',
    condition: { type: 'in', values: ['weak', 'preemptive'] },
    skill_paths: ['bidding_conventions/preemptive_bids'],
    description: 'Preemptive bidding'
  }
]
