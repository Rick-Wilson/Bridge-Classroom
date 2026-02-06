# Convention Card to Taxonomy Mapping

## Overview

This document defines the mapping between convention card elements and the Baker Bridge skill taxonomy. This mapping enables:

1. **Filtered Proficiency View** — Show students only skills relevant to their card
2. **Gap Analysis** — Identify weak areas in conventions they actually play
3. **Lesson Planning** — Teachers see which conventions students use and need help with
4. **Practice Recommendations** — Suggest deals based on card conventions

## Mapping Structure

Each convention card element maps to one or more taxonomy skill paths:

```javascript
{
  "card_path": "notrump.stayman.forcing",       // Path in convention card JSON
  "condition": true,                             // Value that enables this mapping
  "skill_paths": [                               // Baker Bridge taxonomy paths
    "bidding_conventions/stayman"
  ],
  "bidirectional": true                          // Can infer card from skills?
}
```

## Complete Mapping Table

### Notrump Conventions

| Card Path | Condition | Skill Path(s) | Notes |
|-----------|-----------|---------------|-------|
| `notrump.one_nt` | any | `basic_bidding/notrump_openings` | Always relevant if playing NT |
| `notrump.stayman.forcing` | `true` | `bidding_conventions/stayman` | |
| `notrump.stayman.puppet` | `true` | `bidding_conventions/stayman` | Puppet variant |
| `notrump.transfers.jacoby` | `true` | `bidding_conventions/jacoby_transfers` | |
| `notrump.transfers.texas` | `true` | `bidding_conventions/jacoby_transfers` | Included in transfers |
| `notrump.transfers.minor_suit` | `true` | `bidding_conventions/jacoby_transfers` | Advanced transfers |
| `notrump.lebensohl.over_interference` | `true` | `competitive_bidding/lebensohl` | |
| `notrump.lebensohl.over_weak_twos` | `true` | `competitive_bidding/lebensohl` | |

### Major Opening Conventions

| Card Path | Condition | Skill Path(s) | Notes |
|-----------|-----------|---------------|-------|
| `major_openings` | any | `basic_bidding/major_suit_openings` | Always relevant |
| `major_openings.two_over_one.game_force` | `true` | `bidding_conventions/two_over_one` | |
| `major_openings.jacoby_2nt.play` | `true` | `bidding_conventions/jacoby_2nt_splinters` | |
| `major_openings.splinters.play` | `true` | `bidding_conventions/jacoby_2nt_splinters` | Combined topic |
| `major_openings.drury.play` | `true` | `bidding_conventions/reverse_drury` | |
| `major_openings.drury.reverse` | `true` | `bidding_conventions/reverse_drury` | Reverse variant |
| `other_conventions.help_suit_game_tries.play` | `true` | `bidding_conventions/help_suit_game_try` | |

### Minor Opening Conventions

| Card Path | Condition | Skill Path(s) | Notes |
|-----------|-----------|---------------|-------|
| `minor_openings` | any | `basic_bidding/minor_suit_openings` | Always relevant |
| `minor_openings.responses.inverted_minors.play` | `true` | `basic_bidding/minor_suit_openings` | Part of minor raises |

### Two-Level Openings

| Card Path | Condition | Skill Path(s) | Notes |
|-----------|-----------|---------------|-------|
| `two_level.two_clubs.meaning` | `"strong"` | `bidding_conventions/strong_2c` | |
| `two_level.two_diamonds.meaning` | `"weak"` | `bidding_conventions/weak_2s` | |
| `two_level.two_hearts.meaning` | `"weak"` | `bidding_conventions/weak_2s` | |
| `two_level.two_spades.meaning` | `"weak"` | `bidding_conventions/weak_2s` | |
| `two_level.ogust.play` | `true` | `bidding_conventions/ogust` | |
| `two_level.two_clubs.meaning` | `"precision"` | — | No Baker Bridge content yet |
| `two_level.two_diamonds.meaning` | `"flannery"` | — | No Baker Bridge content yet |
| `two_level.two_diamonds.meaning` | `"multi"` | — | No Baker Bridge content yet |

### Other Bidding Conventions

| Card Path | Condition | Skill Path(s) | Notes |
|-----------|-----------|---------------|-------|
| `other_conventions.blackwood.standard` | `true` | `bidding_conventions/blackwood` | |
| `other_conventions.blackwood.rkcb_1430` | `true` | `bidding_conventions/roman_keycard` | |
| `other_conventions.blackwood.rkcb_0314` | `true` | `bidding_conventions/roman_keycard` | |
| `other_conventions.gerber.play` | `true` | `bidding_conventions/blackwood` | Grouped with Blackwood |
| `other_conventions.new_minor_forcing.play` | `true` | `bidding_conventions/new_minor_forcing` | |
| `other_conventions.fourth_suit_forcing.play` | `true` | `bidding_conventions/fourth_suit_forcing` | |
| `competitive.preempts` | any | `bidding_conventions/preemptive_bids` | |

### Competitive Bidding

| Card Path | Condition | Skill Path(s) | Notes |
|-----------|-----------|---------------|-------|
| `competitive.overcalls` | any | `competitive_bidding/overcalls` | Always relevant |
| `competitive.takeout_doubles` | any | `competitive_bidding/takeout_doubles` | Always relevant |
| `competitive.negative_doubles.through` | any | `competitive_bidding/negative_doubles` | |
| `competitive.michaels.play` | `true` | `competitive_bidding/michaels_unusual` | |
| `competitive.unusual_2nt.play` | `true` | `competitive_bidding/michaels_unusual` | Combined topic |
| `competitive.dont.play` | `true` | `competitive_bidding/dont` | |
| `competitive.cappelletti.play` | `true` | — | No Baker Bridge content yet |
| `competitive.support_doubles.play` | `true` | `competitive_bidding/support_cuebids` | Related topic |

### Defensive

| Card Path | Condition | Skill Path(s) | Notes |
|-----------|-----------|---------------|-------|
| `defensive.opening_leads` | any | `defense/opening_leads` | Always relevant |
| `defensive.signals` | any | `defense/defensive_signals` | Always relevant |
| `defensive.signals.attitude` | any | `defense/defensive_signals` | |
| `defensive.signals.count` | any | `defense/defensive_signals` | |
| `defensive.signals.suit_preference` | any | `defense/defensive_signals` | |

### Declarer Play

Declarer play skills are always relevant regardless of convention card:

| Skill Path | Always Include | Notes |
|------------|----------------|-------|
| `declarer_play/finessing` | ✓ | Universal skill |
| `declarer_play/entry_management` | ✓ | Universal skill |
| `declarer_play/holdup_plays` | ✓ | Universal skill |
| `declarer_play/suit_establishment` | ✓ | Universal skill |
| `declarer_play/trump_management` | ✓ | Universal skill |
| `declarer_play/elimination_plays` | ✓ | Universal skill |
| `declarer_play/squeeze_plays` | ✓ | Universal skill |

### Defense (Card Play)

Defense card play skills are always relevant:

| Skill Path | Always Include | Notes |
|------------|----------------|-------|
| `defense/second_hand_play` | ✓ | Universal skill |
| `defense/third_hand_play` | ✓ | Universal skill |

---

## Mapping Implementation

### JavaScript Mapping Definition

```javascript
// utils/cardToTaxonomyMapping.js

export const CARD_TO_TAXONOMY_MAPPING = [
  // ═══════════════════════════════════════════════════════════════
  // ALWAYS INCLUDED (Core Skills)
  // ═══════════════════════════════════════════════════════════════
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
      'defense/third_hand_play'
    ],
    description: 'Core skills always relevant'
  },

  // ═══════════════════════════════════════════════════════════════
  // NOTRUMP CONVENTIONS
  // ═══════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════
  // MAJOR OPENING CONVENTIONS
  // ═══════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════
  // TWO-LEVEL OPENINGS
  // ═══════════════════════════════════════════════════════════════
  {
    card_path: 'two_level.two_clubs.meaning',
    condition: { type: 'equals', value: 'strong' },
    skill_paths: ['bidding_conventions/strong_2c'],
    description: 'Strong 2♣ opening'
  },
  {
    card_path: 'two_level.two_diamonds.meaning',
    condition: { type: 'equals', value: 'weak' },
    skill_paths: ['bidding_conventions/weak_2s'],
    description: 'Weak 2♦'
  },
  {
    card_path: 'two_level.two_hearts.meaning',
    condition: { type: 'equals', value: 'weak' },
    skill_paths: ['bidding_conventions/weak_2s'],
    description: 'Weak 2♥'
  },
  {
    card_path: 'two_level.two_spades.meaning',
    condition: { type: 'equals', value: 'weak' },
    skill_paths: ['bidding_conventions/weak_2s'],
    description: 'Weak 2♠'
  },
  {
    card_path: 'two_level.ogust.play',
    condition: { type: 'equals', value: true },
    skill_paths: ['bidding_conventions/ogust'],
    description: 'Ogust responses to weak twos'
  },

  // ═══════════════════════════════════════════════════════════════
  // SLAM BIDDING
  // ═══════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════
  // OTHER CONVENTIONS
  // ═══════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════
  // COMPETITIVE BIDDING
  // ═══════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════
  // PREEMPTS
  // ═══════════════════════════════════════════════════════════════
  {
    card_path: 'two_level.two_diamonds.meaning',
    condition: { type: 'in', values: ['weak', 'preemptive'] },
    skill_paths: ['bidding_conventions/preemptive_bids'],
    description: 'Preemptive bidding'
  },

  // ═══════════════════════════════════════════════════════════════
  // REVERSE BIDS
  // ═══════════════════════════════════════════════════════════════
  {
    card_path: null,
    condition: { type: 'always' },
    skill_paths: ['bidding_conventions/reverse_bids'],
    description: 'Reverse bids are universal'
  }
];
```

### Condition Evaluator

```javascript
// utils/conditionEvaluator.js

export function evaluateCondition(card, mapping) {
  const { card_path, condition } = mapping;
  
  // Always included
  if (condition.type === 'always') {
    return true;
  }
  
  // Get value from card
  const value = card_path ? getNestedValue(card, card_path) : null;
  
  switch (condition.type) {
    case 'equals':
      return value === condition.value;
    
    case 'not_equals':
      return value !== condition.value;
    
    case 'exists':
      return value !== undefined && value !== null && value !== '';
    
    case 'truthy':
      return Boolean(value);
    
    case 'in':
      return condition.values.includes(value);
    
    case 'not_in':
      return !condition.values.includes(value);
    
    case 'greater_than':
      return value > condition.value;
    
    case 'any_true':
      // Check if any of multiple paths are true
      return condition.paths.some(path => getNestedValue(card, path) === true);
    
    default:
      console.warn(`Unknown condition type: ${condition.type}`);
      return false;
  }
}

function getNestedValue(obj, path) {
  if (!path) return undefined;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return current;
}
```

### Get Skills from Convention Card

```javascript
// utils/cardSkills.js

import { CARD_TO_TAXONOMY_MAPPING } from './cardToTaxonomyMapping';
import { evaluateCondition } from './conditionEvaluator';
import { BAKER_BRIDGE_TAXONOMY } from './bakerBridgeTaxonomy';

/**
 * Extract all relevant skill paths from a convention card
 */
export function getSkillsFromCard(card) {
  const skills = new Set();
  
  for (const mapping of CARD_TO_TAXONOMY_MAPPING) {
    if (evaluateCondition(card, mapping)) {
      mapping.skill_paths.forEach(skill => skills.add(skill));
    }
  }
  
  return Array.from(skills).sort();
}

/**
 * Get skills with metadata for display
 */
export function getSkillsWithMetadata(card) {
  const skills = getSkillsFromCard(card);
  
  return skills.map(skillPath => {
    // Find taxonomy entry
    const taxonomyEntry = Object.entries(BAKER_BRIDGE_TAXONOMY)
      .find(([_, info]) => info.path === skillPath);
    
    if (taxonomyEntry) {
      const [subfolder, info] = taxonomyEntry;
      return {
        skill_path: skillPath,
        subfolder: subfolder,
        name: info.name,
        category: info.category,
        description: info.description
      };
    }
    
    return {
      skill_path: skillPath,
      subfolder: null,
      name: skillPath.split('/').pop().replace(/_/g, ' '),
      category: 'Unknown',
      description: ''
    };
  });
}

/**
 * Check if a specific skill is relevant for a card
 */
export function isSkillRelevantForCard(card, skillPath) {
  const relevantSkills = getSkillsFromCard(card);
  return relevantSkills.includes(skillPath);
}

/**
 * Get skills NOT on the card (for "other conventions" section)
 */
export function getSkillsNotOnCard(card) {
  const cardSkills = new Set(getSkillsFromCard(card));
  const allSkills = Object.values(BAKER_BRIDGE_TAXONOMY).map(t => t.path);
  
  return allSkills.filter(skill => !cardSkills.has(skill));
}

/**
 * Group skills by category for display
 */
export function groupSkillsByCategory(skills) {
  const groups = {};
  
  for (const skill of skills) {
    const category = skill.category || 'Other';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(skill);
  }
  
  // Sort categories
  const orderedCategories = [
    'Basic Bidding',
    'Bidding Conventions',
    'Competitive Bidding',
    'Declarer Play',
    'Defense',
    'Practice Deals',
    'Partnership Bidding',
    'Other'
  ];
  
  const sorted = {};
  for (const cat of orderedCategories) {
    if (groups[cat]) {
      sorted[cat] = groups[cat];
    }
  }
  
  return sorted;
}
```

---

## Filtered Proficiency Calculation

### Filter Observations by Card

```javascript
// composables/useFilteredProficiency.js

import { computed } from 'vue';
import { getSkillsFromCard } from '../utils/cardSkills';

export function useFilteredProficiency(observations, conventionCard) {
  
  const relevantSkills = computed(() => {
    if (!conventionCard.value) return null;
    return new Set(getSkillsFromCard(conventionCard.value));
  });
  
  const filteredObservations = computed(() => {
    if (!relevantSkills.value) return observations.value;
    
    return observations.value.filter(obs => 
      relevantSkills.value.has(obs.skill_path)
    );
  });
  
  const proficiencyBySkill = computed(() => {
    const bySkill = {};
    
    for (const obs of filteredObservations.value) {
      if (!bySkill[obs.skill_path]) {
        bySkill[obs.skill_path] = { correct: 0, total: 0 };
      }
      bySkill[obs.skill_path].total++;
      if (obs.correct) {
        bySkill[obs.skill_path].correct++;
      }
    }
    
    // Calculate percentages
    const result = {};
    for (const [skill, counts] of Object.entries(bySkill)) {
      result[skill] = {
        ...counts,
        percentage: counts.total > 0 
          ? Math.round((counts.correct / counts.total) * 100) 
          : null
      };
    }
    
    return result;
  });
  
  const overallProficiency = computed(() => {
    const totals = { correct: 0, total: 0 };
    
    for (const counts of Object.values(proficiencyBySkill.value)) {
      totals.correct += counts.correct;
      totals.total += counts.total;
    }
    
    return totals.total > 0
      ? Math.round((totals.correct / totals.total) * 100)
      : null;
  });
  
  const skillGaps = computed(() => {
    // Skills on card with low proficiency (< 70%) or no practice
    const gaps = [];
    
    for (const skill of relevantSkills.value || []) {
      const prof = proficiencyBySkill.value[skill];
      
      if (!prof) {
        gaps.push({ skill, reason: 'not_practiced', percentage: null });
      } else if (prof.percentage < 70) {
        gaps.push({ skill, reason: 'low_proficiency', percentage: prof.percentage });
      }
    }
    
    // Sort by percentage (null = not practiced first, then lowest)
    return gaps.sort((a, b) => {
      if (a.percentage === null) return -1;
      if (b.percentage === null) return 1;
      return a.percentage - b.percentage;
    });
  });
  
  return {
    relevantSkills,
    filteredObservations,
    proficiencyBySkill,
    overallProficiency,
    skillGaps
  };
}
```

---

## API Endpoints

### Get Skills for Card

```
GET /api/cards/:card_id/skills
  Get all skills relevant to this convention card
  → {
      skills: [
        {
          skill_path: "bidding_conventions/stayman",
          subfolder: "Stayman",
          name: "Stayman",
          category: "Bidding Conventions"
        },
        ...
      ],
      total_count: 25
    }
```

### Get Filtered Proficiency

```
GET /api/users/:user_id/proficiency?card_id=<card_id>
  Get proficiency filtered by convention card skills
  → {
      card_id: "uuid",
      card_name: "2/1 with Robert",
      overall_percentage: 72,
      by_skill: {
        "bidding_conventions/stayman": {
          correct: 45,
          total: 52,
          percentage: 87
        },
        ...
      },
      gaps: [
        { skill: "bidding_conventions/jacoby_2nt", percentage: 43 },
        { skill: "bidding_conventions/roman_keycard", percentage: null }
      ]
    }
```

### Get Proficiency Comparison (Card vs All)

```
GET /api/users/:user_id/proficiency/compare?card_id=<card_id>
  Compare proficiency on card skills vs all skills
  → {
      card_skills: {
        overall: 72,
        skill_count: 25,
        practiced_count: 22
      },
      all_skills: {
        overall: 68,
        skill_count: 49,
        practiced_count: 35
      },
      card_only_skills: [...],    // Skills on card not in "all"
      non_card_skills: [...]      // Skills practiced but not on card
    }
```

---

## UI Components

### Skill Filter Toggle

```vue
<template>
  <div class="skill-filter">
    <label class="filter-toggle">
      <input 
        type="checkbox" 
        v-model="filterByCard"
        :disabled="!hasLinkedCard"
      />
      <span>Show only conventions I play</span>
    </label>
    
    <select 
      v-if="filterByCard && linkedCards.length > 1"
      v-model="selectedCardId"
    >
      <option 
        v-for="card in linkedCards" 
        :key="card.id" 
        :value="card.id"
      >
        {{ card.name }}
      </option>
    </select>
    
    <div v-if="filterByCard" class="filter-info">
      Showing {{ relevantSkillCount }} of {{ totalSkillCount }} skills
    </div>
  </div>
</template>
```

### Proficiency Display with Card Context

```vue
<template>
  <div class="proficiency-view">
    <div class="header">
      <h2>My Progress</h2>
      <SkillFilterToggle v-model:filter="filterByCard" v-model:card="selectedCard" />
    </div>
    
    <div class="overall-score">
      <CircularProgress :percentage="overallProficiency" />
      <div class="label">
        Overall: {{ overallProficiency }}%
        <span v-if="filterByCard" class="context">
          ({{ selectedCard.name }})
        </span>
      </div>
    </div>
    
    <div class="skill-breakdown">
      <div 
        v-for="(skills, category) in groupedSkills" 
        :key="category"
        class="category"
      >
        <h3>{{ category }}</h3>
        
        <div 
          v-for="skill in skills" 
          :key="skill.skill_path"
          class="skill-row"
          :class="{ 'is-gap': skill.percentage < 70 }"
        >
          <span class="skill-name">{{ skill.name }}</span>
          <ProgressBar :percentage="skill.percentage" />
          <span class="percentage">
            {{ skill.percentage !== null ? `${skill.percentage}%` : 'Not practiced' }}
          </span>
        </div>
      </div>
    </div>
    
    <div v-if="skillGaps.length > 0" class="gaps-section">
      <h3>🎯 Suggested Focus Areas</h3>
      <p>These conventions on your card need more practice:</p>
      <ul>
        <li v-for="gap in skillGaps.slice(0, 5)" :key="gap.skill">
          <strong>{{ getSkillName(gap.skill) }}</strong>
          <span v-if="gap.percentage !== null">— {{ gap.percentage }}%</span>
          <span v-else>— Not yet practiced</span>
        </li>
      </ul>
    </div>
  </div>
</template>
```

---

## Teacher Dashboard Integration

### Class View by Convention Card

```javascript
// Get class proficiency grouped by what conventions students play

async function getClassProficiencyByCard(classroomId) {
  const students = await getStudentsInClassroom(classroomId);
  const results = [];
  
  for (const student of students) {
    const cards = await getUserConventionCards(student.id);
    const primaryCard = cards.find(c => c.is_primary) || cards[0];
    
    if (primaryCard) {
      const proficiency = await getFilteredProficiency(student.id, primaryCard.id);
      results.push({
        student,
        card: primaryCard,
        overall: proficiency.overall_percentage,
        gaps: proficiency.gaps
      });
    } else {
      results.push({
        student,
        card: null,
        overall: null,
        gaps: []
      });
    }
  }
  
  return results;
}
```

### Common Gaps Across Class

```javascript
// Find conventions that multiple students struggle with

function findCommonGaps(classProficiency) {
  const gapCounts = {};
  
  for (const { gaps } of classProficiency) {
    for (const gap of gaps) {
      if (!gapCounts[gap.skill]) {
        gapCounts[gap.skill] = { count: 0, percentages: [] };
      }
      gapCounts[gap.skill].count++;
      if (gap.percentage !== null) {
        gapCounts[gap.skill].percentages.push(gap.percentage);
      }
    }
  }
  
  // Calculate average and sort by count
  const commonGaps = Object.entries(gapCounts)
    .map(([skill, data]) => ({
      skill,
      student_count: data.count,
      avg_percentage: data.percentages.length > 0
        ? Math.round(data.percentages.reduce((a, b) => a + b, 0) / data.percentages.length)
        : null
    }))
    .filter(g => g.student_count >= 2)  // At least 2 students
    .sort((a, b) => b.student_count - a.student_count);
  
  return commonGaps;
}
```

---

## Conventions Without Baker Bridge Content

Some conventions on cards may not have corresponding Baker Bridge practice material. Track these for future content development:

```javascript
const CONVENTIONS_WITHOUT_CONTENT = [
  { card_path: 'two_level.two_clubs.meaning', value: 'precision', name: 'Precision 2♣' },
  { card_path: 'two_level.two_diamonds.meaning', value: 'flannery', name: 'Flannery 2♦' },
  { card_path: 'two_level.two_diamonds.meaning', value: 'multi', name: 'Multi 2♦' },
  { card_path: 'competitive.cappelletti.play', value: true, name: 'Cappelletti' },
  { card_path: 'competitive.landy.play', value: true, name: 'Landy' },
  { card_path: 'other_conventions.control_bids.style', value: 'italian', name: 'Italian Cue Bids' },
  // ... more
];

function getConventionsWithoutContent(card) {
  return CONVENTIONS_WITHOUT_CONTENT.filter(conv => {
    const value = getNestedValue(card, conv.card_path);
    return value === conv.value;
  });
}
```

Display to user:

```
⚠️ Your card includes conventions we don't have practice content for yet:
• Precision 2♣
• Cappelletti

We're working on adding more content. In the meantime, these won't appear 
in your proficiency tracking.
```

---

## Summary

This mapping enables:

1. ✅ **Filter proficiency by convention card** — Students see only relevant skills
2. ✅ **Identify gaps on their card** — Focus practice on conventions they actually play  
3. ✅ **Teacher insights** — See class performance relative to what students play
4. ✅ **Practice recommendations** — Suggest deals based on card + weak areas
5. ✅ **Handle missing content** — Gracefully indicate conventions without practice material
