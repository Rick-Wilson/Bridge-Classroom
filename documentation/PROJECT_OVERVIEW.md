# Bridge Classroom: Student Proficiency Tracking System

## Project Vision

A web-based bridge teaching platform that enables students to practice bidding with immediate feedback, tracks their progress over time, and provides teachers with insights into individual and class-wide skill development.

Inspired by visual field perimetry (eye testing), the system maps student competencies across the "field" of bridge skills, identifying strengths, weaknesses, and improvement trajectories.

## Core Principles

1. **Student Owns Their Data** - Encrypted with student-held keys; students can view their own progress
2. **Minimal Friction** - No accounts/passwords for students; just name and classroom
3. **Teacher Visibility** - Teacher can see all student data via separate encryption
4. **Privacy by Design** - Server stores encrypted blobs; can't read actual observations
5. **Offline Resilient** - Works offline; syncs when connection available

## System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                     STUDENT EXPERIENCE                          │
│                                                                 │
│  practice.harmonicsystems.com                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Vue.js Application (GitHub Pages)                       │   │
│  │  • User onboarding (name, classroom, consent)            │   │
│  │  • Bidding practice (Baker Bridge deals)                 │   │
│  │  • Progress visualization                                │   │
│  │  • Client-side encryption                                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API SERVER                                  │
│                                                                 │
│  api.harmonicsystems.com                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Rust/Axum Backend                                       │   │
│  │  • Receives encrypted observations                       │   │
│  │  • Stores in SQLite                                      │   │
│  │  • Serves public keys                                    │   │
│  │  • Query API for metadata                                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     TEACHER DASHBOARD                           │
│                                                                 │
│  dashboard.harmonicsystems.com (or same app, different route)   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  • Student detail views                                  │   │
│  │  • Classroom rollups                                     │   │
│  │  • Trend analysis                                        │   │
│  │  • Decryption with teacher private key                   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Content Source

- **Baker Bridge Deals**: 1,173 interactive practice deals
- **Categories**: 49 skill areas across bidding, conventions, declarer play, defense
- **Format**: PBN files with embedded commentary and expected bids

## Target Users

### Students
- Bridge learners (mostly seniors, not tech-savvy)
- Attend Rick's classes (face-to-face and Zoom)
- Use for homework practice between lessons
- Want to see their own improvement

### Teacher (Rick)
- Teaches 3-4 times per week
- Wants to understand individual student progress
- Wants to identify class-wide weak areas
- Wants to tailor lessons based on data

## Key Metrics

- **Participation**: Who is practicing, how often
- **Accuracy**: Correct bids by skill area
- **Trends**: Improvement or regression over time
- **Blind Spots**: Persistent weak areas per student/class
