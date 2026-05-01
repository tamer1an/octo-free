# Privacy Policy for Github File Tree (Octofree)

**Effective Date:** May 1, 2026

This Privacy Policy describes how the "Github File Tree (Octofree)" Chrome Extension ("the Extension") handles your data. We are committed to protecting your privacy and ensuring transparency in how the Extension operates.

## 1. Information Collection and Use
Github File Tree (Octofree) is designed to respect your privacy. **The Extension does not collect, store, or transmit any personal data, analytics, or browsing history to any third-party servers or developers.**

All operations, including rendering the repository file tree, occur locally within your browser.

## 2. GitHub Personal Access Token (PAT)
To bypass GitHub's unauthenticated API rate limits, the Extension allows users to optionally provide a GitHub Personal Access Token. 
- **Local Storage Only:** This token is stored securely and exclusively in your local browser using `chrome.storage.sync` (which syncs securely across your own signed-in Chrome instances). 
- **Direct API Communication:** The token is strictly used to authenticate direct HTTPS requests between your browser and the official GitHub API (`https://api.github.com`). 
- **No Third-Party Transmission:** Your token is **never** transmitted to the developer of this extension, nor to any intermediate third-party servers.

## 3. Data Processing
The Extension reads repository structures directly from GitHub via the GitHub API to display them in a visual tree format. This data is temporarily processed in your browser's memory and is not persisted or shared.

## 4. Third-Party Services
The Extension relies solely on the official GitHub API to function. We do not use external analytics (like Google Analytics), tracking scripts, or advertisement networks.

## 5. Changes to this Privacy Policy
If we make changes to this Privacy Policy, we will update the "Effective Date" at the top of this page. Because we do not collect your personal information, we cannot contact you directly regarding changes.

## 6. Contact Us
If you have any questions or concerns regarding this Privacy Policy, please open an issue on the official Github File Tree (Octofree) GitHub repository at https://github.com/tamer1an/octo-free.
