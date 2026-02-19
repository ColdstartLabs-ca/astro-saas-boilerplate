import { expect, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Admin Page Object
 *
 * Encapsulates admin dashboard page interactions and selectors.
 * Tests admin routes: /dashboard/admin, /dashboard/admin/users, /dashboard/admin/blog
 */
export class AdminPage extends BasePage {
  // Admin main page selectors
  get pageTitle() {
    // Look for h1 that contains "Admin" text, or fallback to any h1
    return this.page
      .getByRole('heading', { level: 1 })
      .filter({ hasText: /admin/i })
      .first()
      .or(this.page.getByRole('heading', { level: 1 }).first());
  }

  get adminNavigation() {
    return this.page.locator(
      '[data-testid="admin-navigation"], nav[aria-label="Admin navigation"]'
    );
  }

  get adminNavigationLinks() {
    return this.adminNavigation.locator('a');
  }

  // Admin users page selectors
  get usersListContainer() {
    return this.page.locator('[data-testid="users-list"], .users-list').first();
  }

  get userTable() {
    return this.page.locator('table').filter({ hasText: /email|role|created/i });
  }

  get userTableRows() {
    return this.userTable.locator('tbody tr');
  }

  get searchUsersInput() {
    return this.page
      .getByPlaceholder(/search|filter/i)
      .or(this.page.locator('input[aria-label*="search" i], input[aria-label*="filter" i]'));
  }

  get viewUserButtons() {
    return this.page
      .getByRole('link', { name: /view|details/i })
      .or(this.page.locator('a').filter({ hasText: /view user|user details/i }));
  }

  get editUserButtons() {
    return this.page
      .getByRole('button', { name: /edit/i })
      .or(this.page.locator('button').filter({ hasText: /edit user/i }));
  }

  // Admin blog page selectors
  get blogListContainer() {
    return this.page.locator('[data-testid="blog-list"], .blog-list').first();
  }

  get blogPostsList() {
    return this.page.locator('[data-testid="blog-post"], .blog-post-item');
  }

  get newPostButton() {
    return this.page
      .getByRole('link', { name: /new post|create post|add post/i })
      .or(this.page.locator('a, button').filter({ hasText: /new post|create post/i }));
  }

  get editPostButtons() {
    return this.page
      .getByRole('link', { name: /edit/i })
      .or(this.page.locator('a, button').filter({ hasText: /edit post/i }));
  }

  get postTitles() {
    return this.blogPostsList.locator('h2, h3, .post-title');
  }

  get postStatuses() {
    return this.page.locator('[data-testid="post-status"], .post-status, .status-badge');
  }

  get deletePostButtons() {
    return this.page
      .getByRole('button', { name: /delete/i })
      .or(this.page.locator('button').filter({ hasText: /delete post/i }));
  }

  // Common admin page elements
  get adminSidebar() {
    return this.page.locator('[data-testid="admin-sidebar"], aside.admin-sidebar');
  }

  get sidebarAdminLink() {
    return this.page
      .getByRole('link', { name: /admin/i })
      .or(this.page.locator('a').filter({ hasText: /admin/i }));
  }

  get sidebarUsersLink() {
    return this.page
      .getByRole('link', { name: /users/i })
      .or(this.page.locator('a').filter({ hasText: /users/i }));
  }

  get sidebarBlogLink() {
    return this.page
      .getByRole('link', { name: /blog/i })
      .or(this.page.locator('a').filter({ hasText: /blog/i }));
  }

  get accessDeniedMessage() {
    return this.page.locator('text=/access denied|forbidden|not authorized/i');
  }

  get notFoundMessage() {
    return this.page.locator('text=/not found|page not found/i');
  }

  // Loading states
  get adminLoader() {
    return this.page.locator('[data-loading="admin"], .admin-loader');
  }

  /**
   * Navigate to admin dashboard main page
   */
  async goto(): Promise<void> {
    await super.goto('/dashboard/admin');
  }

  /**
   * Navigate to admin users page
   */
  async gotoUsers(): Promise<void> {
    await super.goto('/dashboard/admin/users');
  }

  /**
   * Navigate to admin blog page
   */
  async gotoBlog(): Promise<void> {
    await super.goto('/dashboard/admin/blog');
  }

  /**
   * Navigate to a specific user detail page
   */
  async gotoUserDetail(userId: string): Promise<void> {
    await super.goto(`/dashboard/admin/users/${userId}`);
  }

  /**
   * Navigate to blog post editor for new post
   */
  async gotoNewBlogPost(): Promise<void> {
    await super.goto('/dashboard/admin/blog/new');
  }

  /**
   * Navigate to blog post editor for existing post
   */
  async gotoEditBlogPost(postId: string): Promise<void> {
    await super.goto(`/dashboard/admin/blog/${postId}`);
  }

  /**
   * Navigate to a specific path
   */
  async gotoPath(path: string): Promise<void> {
    await super.goto(path);
  }

  /**
   * Wait for admin page to load completely
   */
  async waitForAdminLoad(): Promise<void> {
    await this.waitForLoadingComplete();
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    // Wait for admin-specific loader if present
    await this.adminLoader.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }

  /**
   * Check if access denied message is visible
   */
  async isAccessDenied(): Promise<boolean> {
    return this.accessDeniedMessage.isVisible().catch(() => false);
  }

  /**
   * Check if admin navigation is visible
   */
  async hasAdminNavigation(): Promise<boolean> {
    return this.adminNavigation.isVisible().catch(() => false);
  }

  /**
   * Get the count of users displayed in the list
   */
  async getUserCount(): Promise<number> {
    await this.waitForAdminLoad();
    return this.userTableRows.count();
  }

  /**
   * Get the count of blog posts displayed in the list
   */
  async getBlogPostCount(): Promise<number> {
    await this.waitForAdminLoad();
    return this.blogPostsList.count();
  }

  /**
   * Search for users by email or name
   */
  async searchUsers(query: string): Promise<void> {
    await this.searchUsersInput.fill(query);
    await this.waitForAdminLoad();
  }

  /**
   * Click on a user row to view details
   */
  async viewUser(index = 0): Promise<void> {
    const viewButtons = await this.viewUserButtons.all();
    if (viewButtons.length > index) {
      await viewButtons[index].click();
    } else {
      // Fallback: click on the row itself
      const rows = await this.userTableRows.all();
      if (rows.length > index) {
        await rows[index].click();
      }
    }
    await this.waitForAdminLoad();
  }

  /**
   * Click new post button to open blog editor
   */
  async clickNewPost(): Promise<void> {
    await this.newPostButton.click();
    await this.waitForAdminLoad();
  }

  /**
   * Click edit button on a blog post
   */
  async editPost(index = 0): Promise<void> {
    const editButtons = await this.editPostButtons.all();
    if (editButtons.length > index) {
      await editButtons[index].click();
    } else {
      // Fallback: click on the post itself
      const posts = await this.blogPostsList.all();
      if (posts.length > index) {
        await posts[index].click();
      }
    }
    await this.waitForAdminLoad();
  }

  /**
   * Get text content of blog post titles
   */
  async getBlogPostTitles(): Promise<string[]> {
    const titles = await this.postTitles.all();
    const titleTexts: string[] = [];
    for (const title of titles) {
      const text = await title.textContent();
      if (text) titleTexts.push(text.trim());
    }
    return titleTexts;
  }

  /**
   * Navigate using sidebar links
   */
  async navigateViaSidebar(linkText: 'admin' | 'users' | 'blog'): Promise<void> {
    switch (linkText) {
      case 'admin':
        await this.sidebarAdminLink.click();
        break;
      case 'users':
        await this.sidebarUsersLink.click();
        break;
      case 'blog':
        await this.sidebarBlogLink.click();
        break;
    }
    await this.waitForAdminLoad();
  }

  /**
   * Assert that the current page is an admin page
   */
  async assertOnAdminPage(): Promise<void> {
    // First check if we're seeing access denied
    const isDenied = await this.isAccessDenied();
    if (isDenied) {
      throw new Error('Access denied - user does not have admin role');
    }

    // Wait for admin content to be visible (h1 with "Admin" text or any h1)
    await expect(this.pageTitle).toBeVisible({ timeout: 10000 });
    const titleText = await this.pageTitle.textContent();
    expect(titleText?.toLowerCase()).toContain('admin');
  }
}
