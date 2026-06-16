export type PromptSpecResult = {
	task?: string;
	context?: string;
	constraints?: string[];
	outputFormat?: string;
};

/**
 * Formats the PromptSpec fields into a clean markdown template, ignoring empty fields.
 */
export function renderPrompt(spec: PromptSpecResult): string {
	const parts: string[] = [];

	if (spec.task && spec.task.trim()) {
		parts.push(`### Task\n${spec.task.trim()}`);
	}
	if (spec.context && spec.context.trim()) {
		parts.push(`### Context\n${spec.context.trim()}`);
	}
	if (spec.constraints && spec.constraints.length > 0) {
		const validConstraints = spec.constraints.map(c => c.trim()).filter(Boolean);
		if (validConstraints.length > 0) {
			const constraintList = validConstraints.map(c => `- ${c}`).join('\n');
			parts.push(`### Constraints\n${constraintList}`);
		}
	}
	if (spec.outputFormat && spec.outputFormat.trim()) {
		parts.push(`### Format\n${spec.outputFormat.trim()}`);
	}

	return parts.join('\n\n');
}
