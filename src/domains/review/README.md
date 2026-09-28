# Review Domain Documentation

## Overview
The Review domain generates module completion statistics, badge unlock sequences, and the shareable MBTI-like reasoning personality summary card.

## Performance Metrics & Badges
1. **Concepts Identified**: Number of concepts mapped in the Conceptualise stage.
2. **Assumptions Challenged**: Highlights and notes recorded during evidence gathering.
3. **Questions Asked**: Socratic inquiry dialogue turns with the AI agent.
4. **Misinformation Evaluations**: Critiques made on Devil's Advocate counter-arguments.
5. **Critical Thinking Score**: Weighted score evaluating inquiry depth.
6. **Synthesis Score**: Weighted score evaluating cross-checked synthesis quality.

## Key Files
- [`reviewService.ts`](file:///c:/Users/sshal/OneDrive/Documents/uq/5th%20year/thesis/critic%20app/src/domains/review/reviewService.ts): Calculates stats, badges, and MBTI card text.

## API Contracts
- `GET /api/modules/:moduleId/review`: Retrieve saved review stats and MBTI card.
- `POST /api/modules/:moduleId/review/generate`: Generate review metrics and MBTI summary on completion.
