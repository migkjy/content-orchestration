const projectDefs = [
  {
    id: 'apppro' as const,
    name: 'AppPro.kr',
    dbUrl: process.env.CONTENT_OS_DB_URL,
    dbToken: process.env.CONTENT_OS_DB_TOKEN,
  },
  {
    id: 'richbukae' as const,
    name: 'Richbukae',
    dbUrl: process.env.RICHBUKAE_DB_URL,
    dbToken: process.env.RICHBUKAE_DB_TOKEN,
  },
  {
    id: 'ai-architect' as const,
    name: 'AI Architect Global',
    dbUrl: process.env.AI_ARCHITECT_DB_URL,
    dbToken: process.env.AI_ARCHITECT_DB_TOKEN,
  },
];

export const projects = projectDefs.map((p) => ({
  ...p,
  available: !!(p.dbUrl && p.dbToken),
}));

export type ProjectId = (typeof projectDefs)[number]['id'];

export function getProject(id: string) {
  return projects.find((p) => p.id === id);
}
