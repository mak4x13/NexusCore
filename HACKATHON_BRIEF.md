# Band of Agents Hackathon Brief for NexusCore

Source: https://lablab.ai/ai-hackathons/band-of-agents-hackathon
Fetched: 2026-06-16

## Key Facts

- Event: Band of Agents Hackathon
- Theme: Build enterprise multi-agent systems with Band and Codeband.
- Dates: June 12-19, 2026.
- Submission deadline: June 19, 2026, according to the hackathon page.
- Format: fully online.
- Prize pool: $10,000+.
- Minimum technical requirement: at least 3 agents collaborating through Band.
- Band must be the coordination layer during the workflow, not just a notification wrapper or final output channel.

## What Judges Want

- Application of Technology: clear Band-mediated handoffs, shared context, role specialization, task state, and coordination.
- Presentation: explain the problem, each agent role, Band's role, context flow, handoffs, and user or enterprise value.
- Business Value: solve a real enterprise workflow, reduce manual coordination, improve decisions, speed execution, or make complex work easier to operate.
- Originality: go beyond a chatbot or linear automation; show discovery, delegation, review, escalation, cross-framework collaboration, or agent-to-agent coordination.

## NexusCore Positioning

NexusCore should be pitched as a runtime governance layer for enterprise AI agents. Instead of allowing coding agents to execute risky actions directly, NexusCore holds dangerous actions, routes the proposal through specialized agents in a Band room, and requires an ALLOW/BLOCK decision from the Master Agent before execution.

This maps cleanly to Track 2, Multi-Agent Software Development, and also overlaps Track 3, Regulated & High-Stakes Workflows.

## Agent Story for Demo

- Proposer Agent: receives the task and proposes one concrete risky action.
- Risk Agent: evaluates reversibility, production impact, and blast radius.
- Compliance Agent: checks whether the action matches the approved spec or policy.
- Master Agent: issues the final ALLOW/BLOCK decision.

Demo flow:

1. Engineer sends a request such as: "Clean up old users; we may need to DROP the users table."
2. Proposer posts a PROPOSAL in the Band room.
3. Risk posts HIGH/MEDIUM/LOW assessment.
4. Compliance posts PASS/FAIL against the expected spec.
5. Master posts DECISION: ALLOW or DECISION: BLOCK.
6. Dashboard mirrors the Band room as the audit trail and shows the held action.

## Submission Checklist

- Project title.
- Short description.
- Long description.
- Technology/category tags.
- Cover image.
- Video presentation.
- Slide presentation.
- Public GitHub repository.
- Demo application platform.
- Application URL.

## Partner Tools

- Band Pro promo code: BANDHACK26, 100% off for 1 month according to the hackathon page.
- AI/ML API credits: $10 per person, claimed through lablab.ai, up to 500 participants.
- Featherless AI promo code: BOA26, $25/credits access details through partner setup, first-come first-served.

## Pitch Angle

"Agents should not be trusted to make destructive production decisions alone. NexusCore gives them a shared governance room: proposal, risk review, compliance check, final decision, and an audit trail, all coordinated through Band."
