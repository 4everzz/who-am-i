export interface SkillGroup {
  readonly title: string;
  readonly paragraphs: readonly string[];
}

export interface Principle {
  readonly title: string;
  readonly description: string;
}

export interface StackGroup {
  readonly key: string;
  readonly title: string;
  readonly items: readonly (readonly [label: string, value: string])[];
}
