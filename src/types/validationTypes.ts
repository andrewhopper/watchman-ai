export interface ValidationCheck {
    name: string;
    check: () => boolean;
    remedy?: string; // Optional remedy message to display when check fails
}

export interface ValidationResult {
    name: string;
    passed: boolean;
}

// Define interfaces for different rule types
export interface BaseValidationRule {
    name: string;
    type: string;
    systemPrompt?: string; // Instructions for the AI to fix the issue
    userInstructions?: string; // Instructions for the user to fix the issue
    statusMessages?: {
        fullCompliance?: string; // Message when rule is fully complied with
        partialCompliance?: string; // Message when rule is partially complied with
        noCompliance?: string; // Message when rule is not complied with
        notApplicable?: string; // Message when rule is not applicable
    };
}

export interface FilePresenceRule extends BaseValidationRule {
    type: 'filePresence';
    files: string[];
}

export interface PlaceholderRule extends BaseValidationRule {
    type: 'placeholder';
    message: string;
}

export interface CustomCommandRule extends BaseValidationRule {
    type: 'customCommand';
    command: string;
}

// Union type for all rule types
export type ValidationRule = FilePresenceRule | PlaceholderRule | CustomCommandRule;
