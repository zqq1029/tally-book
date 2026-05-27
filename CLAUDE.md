# demo


## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec

## Superpowers routing

When starting any task, invoke /using-superpowers first. Key superpowers rules:
- Creative work, features, new functionality → invoke /brainstorming (BEFORE coding)
- Multi-step implementation plans → invoke /writing-plans
- Executing plans with checkpoints → invoke /executing-plans
- Feature/bugfix implementation → invoke /test-driven-development
- Any bug or test failure → invoke /systematic-debugging (BEFORE proposing fixes)
- Completing tasks, major features → invoke /requesting-code-review
- Receiving code review feedback → invoke /receiving-code-review
- Parallel independent tasks → invoke /subagent-driven-development or /dispatching-parallel-agents
- Isolated feature work → invoke /using-git-worktrees
- Claiming work is complete → invoke /verification-before-completion (BEFORE committing)
- Finishing a branch → invoke /finishing-a-development-branch
- Creating/editing skills → invoke /writing-skills
