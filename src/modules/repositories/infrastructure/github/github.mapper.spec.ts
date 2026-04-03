import { GithubMapper } from './github.mapper';

describe('GithubMapper', () => {
  it('returns null for invalid date fields', () => {
    const mapper = new GithubMapper();

    const result = mapper.toRepository({
      id: 1,
      name: 'repo',
      full_name: 'org/repo',
      html_url: 'https://github.com/org/repo',
      language: 'TypeScript',
      stargazers_count: 10,
      forks_count: 5,
      created_at: 'invalid-date',
      updated_at: '2024-01-01T00:00:00.000Z',
      pushed_at: '2024-01-01T00:00:00.000Z'
    });

    expect(result).toBeNull();
  });
});
