export type ProjectId = 'p-devfleet' | 'p-menu' | 'p-zhiyuan';

export interface Project {
  readonly id: ProjectId;
  readonly name: string;
  readonly subtitle: string;
  readonly intro: string;
  readonly tags: readonly { readonly label: string; readonly className: string }[];
  readonly points: readonly string[];
  readonly buttonLabel: string;
  readonly url: string | null;
  readonly aside: {
    readonly kicker: string;
    readonly title: string;
    readonly flow: readonly string[];
    readonly description: string;
  };
}
