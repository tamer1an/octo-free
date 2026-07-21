import { GitHubTreeResponse, TreeNode, GitHubBranch, GitHubPullRequest, GitHubPullRequestFile } from './types';

function buildHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = { 'Accept': 'application/vnd.github.v3+json' };
  if (token) headers['Authorization'] = `token ${token}`;
  return headers;
}

function apiError(response: Response): Error {
  if (response.status === 404) {
    const err = new Error('Repository not found. If this is a private repo, add your GitHub token in the extension options.');
    (err as any).isPrivateRepoHint = true;
    return err;
  }
  if (response.status === 401) {
    const err = new Error('Invalid GitHub token. Please update your token in the extension options.');
    (err as any).isAuthError = true;
    return err;
  }
  return new Error(`GitHub API error ${response.status}: ${response.statusText}`);
}

export const fetchBranches = async (owner: string, repo: string, token?: string): Promise<GitHubBranch[]> => {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches`, { headers: buildHeaders(token) });
  if (!response.ok) throw apiError(response);
  return response.json();
};

export const fetchPullRequests = async (owner: string, repo: string, token?: string): Promise<GitHubPullRequest[]> => {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls?state=open&per_page=100`,
    { headers: buildHeaders(token) }
  );
  if (!response.ok) throw apiError(response);
  return response.json();
};

const MAX_PR_FILE_PAGES = 10; // caps at 1000 changed files — avoids unbounded fetching on huge PRs

export const fetchPullRequestFiles = async (owner: string, repo: string, pullNumber: number, token?: string): Promise<GitHubPullRequestFile[]> => {
  const files: GitHubPullRequestFile[] = [];
  for (let page = 1; page <= MAX_PR_FILE_PAGES; page++) {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/files?per_page=100&page=${page}`,
      { headers: buildHeaders(token) }
    );
    if (!response.ok) throw apiError(response);
    const data: GitHubPullRequestFile[] = await response.json();
    files.push(...data);
    if (data.length < 100) break;
  }
  return files;
};

export const fetchRepoTree = async (owner: string, repo: string, branch: string = 'main', token?: string): Promise<TreeNode[]> => {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, { headers: buildHeaders(token) });
  if (!response.ok) throw apiError(response);
  const data: GitHubTreeResponse = await response.json();
  return buildTree(data.tree);
};

export const fetchFileContent = async (owner: string, repo: string, path: string, branch: string, token?: string): Promise<Blob> => {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
    { headers: buildHeaders(token) }
  );
  if (!response.ok) throw apiError(response);
  const data = await response.json();
  const binary = atob(data.content.replace(/\n/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: 'application/octet-stream' });
};

export const validateToken = async (token: string): Promise<{ valid: boolean; login?: string; scopes?: string }> => {
  const response = await fetch('https://api.github.com/user', { headers: buildHeaders(token) });
  if (!response.ok) return { valid: false };
  const data = await response.json();
  const scopes = response.headers.get('x-oauth-scopes') ?? '';
  return { valid: true, login: data.login, scopes };
};

// Recursively sort: folders first, then files, alphabetically
function sortTree(nodes: TreeNode[]) {
  nodes.sort((a, b) => {
    if (a.type === b.type) {
      return a.name.localeCompare(b.name);
    }
    return a.type === 'tree' ? -1 : 1;
  });
  nodes.forEach(node => {
    if (node.children && node.children.length > 0) {
      sortTree(node.children);
    }
  });
}

// Helper function to convert flat paths into a nested tree structure
function buildTree(items: import('./types').GitHubTreeItem[]): TreeNode[] {
  const root: TreeNode = { name: 'root', path: '', type: 'tree', children: [] };

  items.forEach(item => {
    const parts = item.path.split('/');
    let currentNode = root;

    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1;
      let childNode = currentNode.children.find(c => c.name === part);

      if (!childNode) {
        childNode = {
          name: part,
          path: parts.slice(0, index + 1).join('/'),
          type: isLast ? item.type : 'tree',
          children: []
        };
        currentNode.children.push(childNode);
      }

      currentNode = childNode;
    });
  });

  sortTree(root.children);
  return root.children;
}

// Builds a tree containing only the files a PR touched, annotated with additions/deletions
export function buildPrTree(files: GitHubPullRequestFile[]): TreeNode[] {
  const root: TreeNode = { name: 'root', path: '', type: 'tree', children: [] };

  files.forEach(file => {
    const parts = file.filename.split('/');
    let currentNode = root;

    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1;
      let childNode = currentNode.children.find(c => c.name === part);

      if (!childNode) {
        childNode = {
          name: part,
          path: parts.slice(0, index + 1).join('/'),
          type: isLast ? 'blob' : 'tree',
          children: [],
          ...(isLast ? { additions: file.additions, deletions: file.deletions } : {}),
        };
        currentNode.children.push(childNode);
      }

      currentNode = childNode;
    });
  });

  sortTree(root.children);
  return root.children;
}
