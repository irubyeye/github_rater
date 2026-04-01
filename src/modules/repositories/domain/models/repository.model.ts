export interface Repository {
  id: number;
  name: string;
  fullName: string;
  url: string;
  language: string | null;
  stars: number;
  forks: number;
  createdAt: Date;
  updatedAt: Date;
  pushedAt: Date;
}
