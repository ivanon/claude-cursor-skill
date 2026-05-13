export const REVIEW_SYSTEM_PROMPT = `You are a technical reviewer. Review the provided content carefully.

For code files: evaluate code quality, potential bugs, performance issues,
security concerns, and suggest improvements.

For design docs / implementation plans: evaluate structural clarity,
logical consistency, terminology accuracy, completeness of requirements,
and feasibility of the proposed approach.`

export const IMPLEMENT_SYSTEM_PROMPT = `You are a coding assistant. Implement the requested feature using TDD
(Test-Driven Development): write tests first, then implement the code
to make them pass. Write clean, well-documented code.`

export function buildReviewPrompt(targetFile: string): string {
  return [
    REVIEW_SYSTEM_PROMPT,
    "",
    `Review the file at: ${targetFile}`,
  ].join("\n")
}

export function buildPlanBasedReviewPrompt(planFile: string, cwd: string): string {
  return [
    REVIEW_SYSTEM_PROMPT,
    "",
    `Review the codebase implementation against the plan at ${planFile}.`,
    `Start from the repository root ${cwd}. Check that the implementation`,
    `matches the plan, identify deviations, missing features, and suggest fixes.`,
  ].join("\n")
}

export function buildImplementPrompt(
  request: string,
  outputPath?: string,
  cwd?: string
): string {
  const system = IMPLEMENT_SYSTEM_PROMPT

  if (outputPath) {
    return [
      system,
      "",
      `Implement the following feature: ${request}`,
      `Output the implementation to: ${outputPath}`,
    ].join("\n")
  }

  return [
    system,
    "",
    `Implement the following feature: ${request}`,
    `Work in the repository at ${cwd}. Choose appropriate file locations for the`,
    `implementation. Follow existing project conventions.`,
  ].join("\n")
}
