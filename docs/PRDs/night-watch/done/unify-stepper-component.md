# PRD: Unify Stepper Component — New Project CTA + Onboarding

**Complexity: 2 → LOW mode**

---

## 1. Context

**Problem:** The "New Project" CTA (`ProjectOnboarding.tsx`) uses `StepperProgressCompact` — a minimal progress bar that only shows "Step X of Y" with a percentage bar. Meanwhile, the Onboarding wizard uses `OnboardingStepperProgress` — a polished horizontal stepper with numbered circles, checkmarks, connector lines, step labels, and mobile-responsive layout. This creates a visual inconsistency and makes the project creation flow feel lower quality.

**Files Analyzed:**

- `client/components/projects/ProjectOnboarding.tsx` — New project CTA modal (uses `StepperProgressCompact`)
- `client/components/stepper/StepperProgress.tsx` — Generic stepper with `StepperProgress` and `StepperProgressCompact` variants
- `client/components/onboarding/OnboardingStepperProgress.tsx` — Onboarding-specific stepper (the good one)
- `client/components/onboarding/OnboardingWizard.tsx` — How the onboarding stepper is integrated
- `client/hooks/useStepper.ts` — Generic stepper hook (used by `useProjectOnboarding`)
- `client/hooks/useProjectOnboarding.ts` — Project onboarding hook (3 steps: Basic Info, Platform, Preferences)

**Current Behavior:**

- `ProjectOnboarding.tsx` renders `StepperProgressCompact` — a thin progress bar with "Step 1 of 3 / 33%"
- The Onboarding wizard renders `OnboardingStepperProgress` — circles with numbers/checkmarks, connector lines, labels, mobile layout
- The `OnboardingStepperProgress` is hardcoded to 5 onboarding-specific steps (not reusable)
- The generic `StepperProgress` component exists but lacks the polish of the onboarding version (no skipped state, no optional labels)

---

## 2. Solution

**Approach:**

- Extract the onboarding stepper's visual design into a generic, reusable `StepperProgress` component that replaces the current one
- The new generic stepper accepts configurable step labels, supports completed/active/upcoming states, and retains the mobile-responsive layout
- `OnboardingStepperProgress` becomes a thin wrapper that passes onboarding-specific config (5 steps, skipped states, optional labels) to the generic component
- `ProjectOnboarding` switches from `StepperProgressCompact` to the new generic `StepperProgress` with its 3 step labels
- Delete the old `StepperProgress` / `StepperProgressCompact` implementations (replaced entirely)

**Key Decisions:**

- Reuse the visual design from `OnboardingStepperProgress` (circles, connectors, checkmarks, mobile layout)
- The generic component does NOT need "skipped" state support — that's onboarding-specific and stays in the wrapper
- The generic component supports: `currentStep` (0-based index), `steps` (array of `{ label: string }`), `completedSteps` (Set), and optional `className`
- Keep `StepperProgressCompact` as-is (it may be useful elsewhere) but stop using it in `ProjectOnboarding`

---

## 3. Execution Phases

### Phase 1: Refactor StepperProgress to match Onboarding quality — Use the same stepper everywhere

**Files (4):**

- `client/components/stepper/StepperProgress.tsx` — Rewrite the `StepperProgress` component to use the circle+connector+label design from `OnboardingStepperProgress`. Props: `currentStep: number` (0-based), `steps: { label: string }[]`, `completedSteps?: Set<number>` (0-based indices), `className?: string`. Mobile-responsive (smaller circles on sm, labels hidden on xs with current step shown below).
- `client/components/onboarding/OnboardingStepperProgress.tsx` — Refactor to be a thin wrapper around the new generic `StepperProgress`, adding onboarding-specific concerns: 5 hardcoded steps, skipped-step styling (amber), optional "(opt)" labels. Maps 1-based `currentStep` to 0-based for the generic component.
- `client/components/projects/ProjectOnboarding.tsx` — Replace `StepperProgressCompact` with the new `StepperProgress`, passing 3 steps: `[{ label: 'Basic Info' }, { label: 'Platform' }, { label: 'Preferences' }]`. Remove the text-based "Step X of Y" from the header (the stepper now shows this visually). Move stepper into the modal header area for consistency with onboarding.
- `client/components/stepper/index.ts` — Update exports

**Implementation:**

- [ ] Rewrite `StepperProgress` with the circle-connector-label pattern from `OnboardingStepperProgress`
- [ ] Support completed steps (green circle + checkmark), active step (accent-colored circle + ring), upcoming steps (muted circle)
- [ ] Add mobile-responsive layout: smaller circles, hidden labels on xs with current step label shown below
- [ ] Refactor `OnboardingStepperProgress` to wrap generic `StepperProgress` and add skipped-step coloring
- [ ] Update `ProjectOnboarding` to use new `StepperProgress` with 3 labeled steps
- [ ] Verify that `useStepper` hook's `currentStep` (0-based) aligns with the new component's expectations

**Tests Required:**

| Test File                                                                  | Test Name                                              | Assertion                          |
| -------------------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------- |
| `client/components/stepper/__tests__/StepperProgress.test.tsx`             | `should render all step circles with labels`           | All step labels rendered           |
| `client/components/stepper/__tests__/StepperProgress.test.tsx`             | `should highlight current step`                        | Active step has accent styling     |
| `client/components/stepper/__tests__/StepperProgress.test.tsx`             | `should show checkmark for completed steps`            | Completed steps show check icon    |
| `client/components/stepper/__tests__/StepperProgress.test.tsx`             | `should render connector lines between steps`          | N-1 connectors rendered            |
| `tests/unit/components/onboarding/OnboardingStepperProgress.unit.spec.tsx` | Existing tests still pass                              | No regressions                     |
| `client/components/projects/ProjectOnboarding.test.tsx`                    | Update to expect circle stepper instead of compact bar | Step circles rendered, no "%" text |

**User Verification:**

- Action: Open the "Create New Project" modal from the dashboard
- Expected: See a horizontal stepper with 3 labeled circles (Basic Info, Platform, Preferences) connected by lines, matching the visual style of the onboarding wizard stepper. Completing a step shows a green checkmark. Active step is accent-colored.

---

## 4. Acceptance Criteria

- [ ] `ProjectOnboarding` shows the circle-connector stepper instead of the compact progress bar
- [ ] Visual style matches the onboarding wizard stepper (circles, connectors, checkmarks, labels)
- [ ] `OnboardingStepperProgress` still works correctly with skipped/optional step states
- [ ] Mobile-responsive: works on small screens
- [ ] All existing tests pass (updated where needed)
- [ ] `yarn verify` passes
