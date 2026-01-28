import { describe, it, expect } from 'vitest'
import {
  BAKER_BRIDGE_TAXONOMY,
  CATEGORIES,
  getSkillFromSubfolder,
  getSkillPath,
  getSkillsByCategory,
  getCategoryFromPath,
  getCategoryById,
  getCategoryFromSkillPath,
  groupObservationsByCategory,
  groupObservationsBySkill,
  isValidSubfolder,
  getAllSubfolders,
  getAllSkillPaths
} from '../bakerBridgeTaxonomy.js'

describe('bakerBridgeTaxonomy', () => {
  describe('BAKER_BRIDGE_TAXONOMY', () => {
    it('should have 50 categories', () => {
      const count = Object.keys(BAKER_BRIDGE_TAXONOMY).length
      expect(count).toBe(50)
    })

    it('should have required fields for each entry', () => {
      for (const [subfolder, skill] of Object.entries(BAKER_BRIDGE_TAXONOMY)) {
        expect(skill).toHaveProperty('path')
        expect(skill).toHaveProperty('name')
        expect(skill).toHaveProperty('category')
        expect(skill).toHaveProperty('description')
        expect(skill.path).toBeTruthy()
        expect(skill.name).toBeTruthy()
        expect(skill.category).toBeTruthy()
      }
    })

    it('should have Stayman in bidding conventions', () => {
      const stayman = BAKER_BRIDGE_TAXONOMY['Stayman']
      expect(stayman).toBeDefined()
      expect(stayman.path).toBe('bidding_conventions/stayman')
      expect(stayman.category).toBe('Bidding Conventions')
    })
  })

  describe('CATEGORIES', () => {
    it('should have 7 categories', () => {
      expect(CATEGORIES).toHaveLength(7)
    })

    it('should have correct total subfolder count', () => {
      const totalCount = CATEGORIES.reduce((sum, cat) => sum + cat.count, 0)
      expect(totalCount).toBe(50)
    })

    it('should include all expected categories', () => {
      const categoryIds = CATEGORIES.map(c => c.id)
      expect(categoryIds).toContain('basic_bidding')
      expect(categoryIds).toContain('bidding_conventions')
      expect(categoryIds).toContain('competitive_bidding')
      expect(categoryIds).toContain('declarer_play')
      expect(categoryIds).toContain('defense')
      expect(categoryIds).toContain('practice_deals')
      expect(categoryIds).toContain('partnership_bidding')
    })
  })

  describe('getSkillFromSubfolder', () => {
    it('should return skill info for valid subfolder', () => {
      const skill = getSkillFromSubfolder('Stayman')
      expect(skill.path).toBe('bidding_conventions/stayman')
      expect(skill.name).toBe('Stayman')
      expect(skill.category).toBe('Bidding Conventions')
    })

    it('should handle case-insensitive lookup', () => {
      const skill = getSkillFromSubfolder('stayman')
      expect(skill.path).toBe('bidding_conventions/stayman')
    })

    it('should return unknown for invalid subfolder', () => {
      const skill = getSkillFromSubfolder('NonExistent')
      expect(skill.path).toBe('unknown/nonexistent')
      expect(skill.category).toBe('Unknown')
    })

    it('should handle partnership bidding sets', () => {
      const skill = getSkillFromSubfolder('Bidpractice/Set5')
      expect(skill.path).toBe('partnership_bidding/set_05')
      expect(skill.category).toBe('Partnership Bidding')
    })
  })

  describe('getSkillPath', () => {
    it('should return skill path for valid subfolder', () => {
      expect(getSkillPath('Transfers')).toBe('bidding_conventions/jacoby_transfers')
      expect(getSkillPath('Finesse')).toBe('declarer_play/finessing')
      expect(getSkillPath('OLead')).toBe('defense/opening_leads')
    })

    it('should return unknown path for invalid subfolder', () => {
      const path = getSkillPath('Invalid')
      expect(path).toContain('unknown/')
    })
  })

  describe('getSkillsByCategory', () => {
    it('should return all skills in basic_bidding', () => {
      const skills = getSkillsByCategory('basic_bidding')
      expect(skills).toHaveLength(3)
      expect(skills.map(s => s.subfolder)).toContain('Major')
      expect(skills.map(s => s.subfolder)).toContain('Minor')
      expect(skills.map(s => s.subfolder)).toContain('Notrump')
    })

    it('should return all skills in defense', () => {
      const skills = getSkillsByCategory('defense')
      expect(skills).toHaveLength(4)
    })

    it('should handle category name with spaces', () => {
      const skills = getSkillsByCategory('Bidding Conventions')
      expect(skills.length).toBeGreaterThan(0)
    })

    it('should return empty array for invalid category', () => {
      const skills = getSkillsByCategory('nonexistent')
      expect(skills).toHaveLength(0)
    })
  })

  describe('getCategoryFromPath', () => {
    it('should extract category from skill path', () => {
      expect(getCategoryFromPath('bidding_conventions/stayman')).toBe('bidding_conventions')
      expect(getCategoryFromPath('declarer_play/finessing')).toBe('declarer_play')
      expect(getCategoryFromPath('defense/opening_leads')).toBe('defense')
    })
  })

  describe('getCategoryById', () => {
    it('should return category info for valid id', () => {
      const cat = getCategoryById('bidding_conventions')
      expect(cat).toBeDefined()
      expect(cat.name).toBe('Bidding Conventions')
      expect(cat.count).toBe(15)
    })

    it('should return null for invalid id', () => {
      const cat = getCategoryById('nonexistent')
      expect(cat).toBeNull()
    })
  })

  describe('getCategoryFromSkillPath', () => {
    it('should return category info from skill path', () => {
      const cat = getCategoryFromSkillPath('defense/opening_leads')
      expect(cat).toBeDefined()
      expect(cat.id).toBe('defense')
      expect(cat.name).toBe('Defense')
    })

    it('should return null for invalid path', () => {
      const cat = getCategoryFromSkillPath('nonexistent/path')
      expect(cat).toBeNull()
    })
  })

  describe('groupObservationsByCategory', () => {
    it('should group observations by category', () => {
      const observations = [
        { skill_path: 'bidding_conventions/stayman' },
        { skill_path: 'bidding_conventions/transfers' },
        { skill_path: 'defense/opening_leads' },
        { skill_path: 'defense/signals' }
      ]

      const groups = groupObservationsByCategory(observations)

      expect(Object.keys(groups)).toHaveLength(2)
      expect(groups['bidding_conventions']).toHaveLength(2)
      expect(groups['defense']).toHaveLength(2)
    })

    it('should handle empty array', () => {
      const groups = groupObservationsByCategory([])
      expect(Object.keys(groups)).toHaveLength(0)
    })
  })

  describe('groupObservationsBySkill', () => {
    it('should group observations by skill path', () => {
      const observations = [
        { skill_path: 'bidding_conventions/stayman' },
        { skill_path: 'bidding_conventions/stayman' },
        { skill_path: 'defense/opening_leads' }
      ]

      const groups = groupObservationsBySkill(observations)

      expect(Object.keys(groups)).toHaveLength(2)
      expect(groups['bidding_conventions/stayman']).toHaveLength(2)
      expect(groups['defense/opening_leads']).toHaveLength(1)
    })
  })

  describe('isValidSubfolder', () => {
    it('should return true for valid subfolders', () => {
      expect(isValidSubfolder('Stayman')).toBe(true)
      expect(isValidSubfolder('Transfers')).toBe(true)
      expect(isValidSubfolder('Bidpractice/Set1')).toBe(true)
    })

    it('should handle case-insensitive check', () => {
      expect(isValidSubfolder('stayman')).toBe(true)
      expect(isValidSubfolder('STAYMAN')).toBe(true)
    })

    it('should return false for invalid subfolders', () => {
      expect(isValidSubfolder('NonExistent')).toBe(false)
      expect(isValidSubfolder('')).toBe(false)
    })
  })

  describe('getAllSubfolders', () => {
    it('should return all 50 subfolders', () => {
      const subfolders = getAllSubfolders()
      expect(subfolders).toHaveLength(50)
      expect(subfolders).toContain('Stayman')
      expect(subfolders).toContain('Transfers')
      expect(subfolders).toContain('Finesse')
    })
  })

  describe('getAllSkillPaths', () => {
    it('should return all 50 skill paths', () => {
      const paths = getAllSkillPaths()
      expect(paths).toHaveLength(50)
      expect(paths).toContain('bidding_conventions/stayman')
      expect(paths).toContain('declarer_play/finessing')
    })

    it('should have unique paths', () => {
      const paths = getAllSkillPaths()
      const uniquePaths = new Set(paths)
      expect(uniquePaths.size).toBe(paths.length)
    })
  })
})
