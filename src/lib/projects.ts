export const projects = [
  {
    id: 'apppro',
    name: 'AppPro.kr',
    dbUrl: process.env.CONTENT_OS_DB_URL,
    dbToken: process.env.CONTENT_OS_DB_TOKEN,
    available: true,
  },
  {
    id: 'richbukae',
    name: 'Richbukae',
    dbUrl: process.env.RICHBUKAE_DB_URL,
    dbToken: process.env.RICHBUKAE_DB_TOKEN,
    available: true,
  },
  {
    id: 'ai-architect',
    name: 'AI Architect Global',
    dbUrl: process.env.AI_ARCHITECT_DB_URL,
    dbToken: process.env.AI_ARCHITECT_DB_TOKEN,
    available: true,
  },
] as const;

export type ProjectId = (typeof projects)[number]['id'];

export function getProject(id: string) {
  return projects.find((p) => p.id === id);
}
