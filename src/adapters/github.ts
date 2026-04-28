import { GitHubTreeResponse, TreeNode } from './types';

export const fetchRepoTree = async (owner: string, repo: string, branch: string = 'main', token?: string): Promise<TreeNode[]> => {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json'
  };
  
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, { headers });
  
  if (!response.ok) {
    throw new Error(`GitHub API Error: ${response.statusText}`);
  }

  const data: GitHubTreeResponse = await response.json();
  return buildTree(data.tree);
};

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
  
  return root.children;
}
