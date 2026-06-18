# NexusCore Demo Video Guide

Use fresh commands in the recording so old dashboard test entries do not look repeated.

## Screen Layout

- Left: NexusCore dashboard at `http://localhost:5173`
- Right: Band room with live agent messages
- Keep Band visible during workflow demos.
- Use the Governance tab for runtime emergency-brake demos.

## Start App

Backend:

```powershell
cd C:\Users\Hp\Desktop\NexusCore\NexusCore\backend
..\.venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000
```

Frontend:

```powershell
cd C:\Users\Hp\Desktop\NexusCore\NexusCore\frontend
npm.cmd run dev -- --host 0.0.0.0
```

## Case 1: Normal Feature Workflow

Where to start:

- Dashboard tab
- Band room side by side

Click `Launch Workflow` and enter:

```text
Build role-based access control for admin and support users with audit logging
```

Show:

- Band room agents posting messages
- Dashboard `Live Agent Collaboration`
- Dashboard `AI Agent Workflow`
- Dashboard `Feature Execution`

Then go to:

- `Features` tab

Show:

- new workflow in the list
- pipeline stages
- execution logs

Purpose:

- Proves normal multi-agent workflow through Band.

## Case 2: Dangerous Action Reviewed Through Band

Where to start:

- Dashboard tab
- Band room side by side

Click `Launch Workflow` and enter:

```text
An AI coding agent wants to run TRUNCATE TABLE payment_transactions in production before a migration. No backup is confirmed. Review and decide whether this action should execute.
```

Show:

- Band room agent discussion
- Risk/Security/Compliance style responses
- Master Agent final `DECISION: ALLOW` or `DECISION: BLOCK`
- Dashboard `Live Agent Collaboration`
- Dashboard `Governance Timeline`

Then go to:

- `Governance` tab
- show `Audit Ledger`

Purpose:

- Proves dangerous actions can be discussed by agents in Band before trusting a decision.

## Case 3: Runtime Emergency Brake, Critical

Where to start:

- `Governance` tab
- `Runtime action interceptor`

Enter:

```text
DROP TABLE payment_transactions
```

Click `Intercept`.

Expected:

- `CRITICAL`
- `HELD`
- `Human confirmation required`

Then click:

- `Block`

Show:

- right-side `Audit Ledger`
- entries for `Action Held (CRITICAL)` and `Action Blocked`

Purpose:

- Proves the emergency brake blocks a destructive action before execution.

## Case 4: Runtime Interceptor, Low And Medium

### Low Risk

In `Governance` -> `Runtime action interceptor`, enter:

```text
GET /api/orders/health
```

Click `Intercept`.

Expected:

- `LOW`
- `ALLOWED`

Show:

- `Audit Ledger` entry for allowed action

### Medium Risk

Enter:

```text
deploy staging notifications-service
```

Click `Intercept`.

Expected:

- `MEDIUM`
- `HELD`
- no human confirmation required

Then click:

- `Confirm & allow`

Show:

- `Audit Ledger`
- `Action Held (MEDIUM)`
- `Action Allowed`

Purpose:

- Proves the tier engine handles low, medium, and critical actions differently.

## Quick Tab Walkthrough

After the four cases, quickly show:

1. `Dashboard`
   - command center
   - live agent feed
   - feature execution

2. `Features`
   - feature list
   - selected workflow logs
   - status and stages

3. `Agents`
   - all specialized agents
   - roles, models, status

4. `Architecture`
   - conceptual agent routing graph
   - Master/Security/Compliance nodes

5. `Security`
   - click `Run security audit`
   - show scanner animation and findings

6. `Governance`
   - runtime interceptor
   - audit ledger

7. `Analytics`
   - throughput, latency, cost charts

8. `Settings`
   - show briefly only

## Final Shot

Best final shot:

- Left: `Governance` tab with `Action Blocked` visible in Audit Ledger
- Right: Band room with a visible Master `DECISION:` message

This final frame shows:

- Band = agent collaboration
- Dashboard = control plane and audit trail
- Emergency brake = dangerous actions held before execution

