export interface ValidationCheck {
    name: string;
    check: () => boolean;
}

export interface ValidationResult {
    name: string;
    passed: boolean;
}
