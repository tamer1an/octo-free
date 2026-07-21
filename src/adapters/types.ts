export interface GitHubTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

export interface GitHubTreeResponse {
  sha: string;
  url: string;
  tree: GitHubTreeItem[];
  truncated: boolean;
}

export interface TreeNode {
  name: string;
  path: string;
  type: 'blob' | 'tree';
  children: TreeNode[];
}

export interface GitHubBranch {
  name: string;
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  state: string;
  head: { ref: string; sha: string };
  html_url: string;
}
