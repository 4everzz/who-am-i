export type ContactCategory = 'cooperation' | 'suggestion';
export interface ContactDraft {
  category: ContactCategory | '';
  nickname: string;
  contact: string;
  content: string;
  website: string;
}
export interface ContactMessage extends ContactDraft {
  category: ContactCategory;
}
export type ContactField = 'category' | 'nickname' | 'contact' | 'content';
export type ContactErrors = Partial<Record<ContactField, string>>;
export type ContactStatus = '' | 'pending' | 'success' | 'error';
