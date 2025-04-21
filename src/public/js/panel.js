/**
 * Admin Panel Controller
 * 
 * This class manages the admin panel interface, including:
 * - User authentication and session management
 * - Navigation and menu handling
 * - Operator management (create, edit, delete)
 * - Toast notifications
 * - UI state management (language, sound)
 */
class AdminPanel {
  constructor() {
    // Initialize panel settings from localStorage or defaults
    this.currentLanguage = localStorage.getItem('admin-panel-language') || 'en';
    this.soundEnabled = localStorage.getItem('sound-enabled') !== 'false';
    this.activeSection = null;
    
    // Check for valid session
    this.checkSession();
    
    // Initialize event delegation for dynamic elements
    this.setupGlobalEventListeners();
  }

  /**
   * Verify user session and initialize panel if valid
   */
  async checkSession() {
    try {
      // Try to get session from localStorage
      const sessionData = localStorage.getItem('admin-panel-user');
      
      // If no session data, redirect to login
      if (!sessionData) {
        console.log('No session data found');
        this.redirectToLogin();
        return;
      }
  
      // Parse the session data
      this.currentUser = JSON.parse(sessionData);
      console.log('Current user:', this.currentUser); // Debug log
  
      // Verify the session
      await this.verifySession();
      
      // Initialize UI if verification succeeds
      this.initUI();
    } catch (e) {
      console.error('Session check error:', e);
      this.redirectToLogin();
    }
  }

  /**
   * Initialize the UI after successful session verification
   */
  initUI() {
    this.setAdminName();
    this.updateSoundIcon();
    this.updateLanguageDisplay();
    this.loadInitialSection();
    
    // Make sure the panel is interactive
    document.body.style.pointerEvents = 'auto';
  }

  /**
   * Verify session with server
   */async verifySession() {
  try {
    console.log('Verifying session with token:', this.currentUser.token); // Debug log
    const response = await fetch('/api/auth/verify', {
      headers: {
        'Authorization': `Bearer ${this.currentUser.token}`
      }
    });
      
     
    if (!response.ok) {
      const error = await response.text();
      console.error('Session verification failed:', error);
      throw new Error('Invalid session');
    }
    
    const data = await response.json();
    console.log('Session data:', data); // Debug log
  } catch (error) {
    console.error('Session verification error:', error);
    this.redirectToLogin();
  }
}
  
  /**
   * Set up global event listeners using event delegation
   */
  setupGlobalEventListeners() {
    document.addEventListener('click', (e) => {
      // Handle nav items
      const navItem = e.target.closest('.nav-item');
      if (navItem) {
        this.handleNavItemClick(navItem, e);
        return;
      }
      
      // Handle submenu items
      const submenuItem = e.target.closest('.submenu li, .nested li');
      if (submenuItem) {
        this.handleSubmenuItemClick(submenuItem, e);
        return;
      }
      
      // Handle action buttons
      const actionItem = e.target.closest('[data-action]');
      if (actionItem) {
        this.handleAction(actionItem.dataset.action, e);
        return;
      }
      
      // Handle language selection
      const langOption = e.target.closest('.language-option');
      if (langOption) {
        this.changeLanguage(langOption.dataset.lang);
        return;
      }
    });
    
    // Handle form submissions
    document.addEventListener('submit', (e) => {
      if (e.target.matches('#createOperatorForm')) {
        e.preventDefault();
        this.handleCreateOperator();
      } else if (e.target.matches('#editOperatorForm')) {
        e.preventDefault();
        this.handleUpdateOperator();
      }
    });
  }

  /**
   * Handle navigation item clicks
   */
  handleNavItemClick(navItem, e) {
    if (navItem.classList.contains('has-submenu')) {
      if (e.target.closest('.submenu')) return;
      
      e.preventDefault();
      const wasActive = navItem.classList.contains('active');
      
      document.querySelectorAll('.nav-item').forEach(i => {
        if (i !== navItem) i.classList.remove('active');
      });
      
      navItem.classList.toggle('active', !wasActive);
      
      const section = navItem.dataset.section;
      if (section && !wasActive) {
        this.loadSection(section);
      }
    } else if (!navItem.classList.contains('sidebar-actions')) {
      e.preventDefault();
      const section = navItem.dataset.section;
      if (section) {
        document.querySelectorAll('.nav-item').forEach(i => {
          i.classList.remove('active');
        });
        navItem.classList.add('active');
        this.loadSection(section);
      }
    }
  }

  /**
   * Handle submenu item clicks
   */
  handleSubmenuItemClick(submenuItem, e) {
    e.stopPropagation();
    const action = submenuItem.dataset.action;
    if (action) {
      this.handleMenuAction(action);
      const parentNavItem = submenuItem.closest('.nav-item');
      if (parentNavItem) {
        document.querySelectorAll('.nav-item').forEach(i => {
          i.classList.remove('active');
        });
        parentNavItem.classList.add('active');
      }
    }
  }

  /**
   * Handle generic actions
   */
  handleAction(action, e) {
    e.preventDefault();
    e.stopPropagation();
    
    switch(action) {
      case 'toggle-sound':
        this.toggleSound();
        break;
      case 'logout':
        this.logout();
        break;
      case 'home':
        this.loadSection('dashboard');
        break;
      default:
        this.handleMenuAction(action);
    }
  }

  /**
   * Load the initial section based on URL or default
   */
  loadInitialSection() {
    const urlParams = new URLSearchParams(window.location.search);
    const section = urlParams.get('section') || 'dashboard';
    this.loadSection(section);
  }

  /**
   * Load a section of the admin panel
   */
  async loadSection(section) {
    this.activeSection = section;
    
    try {
      switch(section) {
        case 'dashboard':
          await this.loadDashboard();
          break;
        case 'operators':
          await this.loadOperatorsSection('all');
          break;
        default:
          this.showToast(`Section "${section}" will be implemented`, 'info');
          this.loadDefaultContent();
      }
    } catch (error) {
      console.error(`Error loading section ${section}:`, error);
      this.showToast('Failed to load section', 'error');
      this.loadDefaultContent();
    }
  }

  /**
   * Load dashboard content
   */
  async loadDashboard() {
    const contentArea = document.querySelector('.admin-content');
    if (!contentArea) return;

    contentArea.innerHTML = `
      <div class="dashboard-section">
        <h2>Dashboard Overview</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <h3>Total Players</h3>
            <p>Loading...</p>
          </div>
          <div class="stat-card">
            <h3>Total Balance</h3>
            <p>Loading...</p>
          </div>
          <div class="stat-card">
            <h3>Active Operators</h3>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    `;

    // Load stats data
    try {
      const [players, balance, operators] = await Promise.all([
        this.fetchData('/api/stats/players'),
        this.fetchData('/api/stats/balance'),
        this.fetchData('/api/stats/operators')
      ]);

      contentArea.querySelector('.stat-card:nth-child(1) p').textContent = players.count;
      contentArea.querySelector('.stat-card:nth-child(2) p').textContent = `$${balance.total.toLocaleString()}`;
      contentArea.querySelector('.stat-card:nth-child(3) p').textContent = operators.count;
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  }

  /**
   * Generic data fetcher
   */
  async fetchData(endpoint) {
    const response = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${this.currentUser.token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ${endpoint}`);
    }
    
    return await response.json();
  }

  /**
   * Load default content when section is not implemented
   */
  loadDefaultContent() {
    const contentArea = document.querySelector('.admin-content');
    if (contentArea) {
      contentArea.innerHTML = `
        <div class="content-placeholder">
          <h2 class="welcome-message">Welcome to Admin Panel</h2>
          <p class="welcome-subtext">Select a section from the left menu to begin</p>
        </div>
      `;
    }
  }

  /**
   * Handle menu actions
   */
  async handleMenuAction(action) {
    try {
      switch(action) {
        case 'all-operators':
          await this.loadOperatorsSection('all');
          break;
        case 'create-operators':
          await this.loadCreateOperatorsSection();
          break;
        case 'delete-operators':
          await this.loadOperatorsSection('edit');
          break;
        case 'edit-operators-class':
          this.showToast('Edit operators class functionality will be implemented', 'info');
          break;
        default:
          this.showToast(`Action "${action}" will be implemented`, 'info');
      }
    } catch (error) {
      console.error('Menu action error:', error);
      this.showToast('Failed to perform action', 'error');
    }
  }

  /**
   * Load operators section with specified type (all/edit)
   */
  async loadOperatorsSection(type) {
    try {
      const contentArea = document.querySelector('.admin-content');
      if (!contentArea) return;

      contentArea.innerHTML = '<div class="loading-spinner"></div>';

      const operators = await this.fetchData('/api/admin/operators');
      const canEdit = this.currentUser.permissions?.userManagement;

      if (type === 'edit') {
        contentArea.innerHTML = `
          <div class="operators-section">
            <div class="section-header">
              <h2>Manage Operators</h2>
              ${canEdit ? '<button class="create-btn" data-action="create-operator">+ Create Operator</button>' : ''}
            </div>
            <div class="table-container">
              <table class="operators-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>ADMIN NAME</th>
                    <th>E-MAIL</th>
                    <th>CLASS</th>
                    <th>STATUS</th>
                    <th>CREATE DATE</th>
                    ${canEdit ? '<th>ACTIONS</th>' : ''}
                  </tr>
                </thead>
                <tbody>
                  ${operators.map(operator => `
                    <tr>
                      <td>${operator._id}</td>
                      <td>${operator.adminName}</td>
                      <td>${operator.email}</td>
                      <td>${operator.adminClass}</td>
                      <td>
                        <span class="status-badge ${operator.isActive ? 'active' : 'inactive'}">
                          ${operator.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>${new Date(operator.createdAt).toLocaleDateString()}</td>
                      ${canEdit ? `
                        <td class="actions-cell">
                          <button class="edit-btn" data-id="${operator._id}">Edit</button>
                          ${operator._id !== this.currentUser.id ? 
                            `<button class="delete-btn" data-id="${operator._id}">Delete</button>` : 
                            '<button class="delete-btn" disabled>Delete</button>'
                          }
                        </td>
                      ` : ''}
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
      } else {
        contentArea.innerHTML = `
          <div class="operators-section">
            <h2>Operators List</h2>
            <div class="table-container">
              <table class="operators-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>ADMIN NAME</th>
                    <th>E-MAIL</th>
                    <th>CLASS</th>
                    <th>STATUS</th>
                    <th>CREATE DATE</th>
                  </tr>
                </thead>
                <tbody>
                  ${operators.map(operator => `
                    <tr>
                      <td>${operator._id}</td>
                      <td>${operator.adminName}</td>
                      <td>${operator.email}</td>
                      <td>${operator.adminClass}</td>
                      <td>
                        <span class="status-badge ${operator.isActive ? 'active' : 'inactive'}">
                          ${operator.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>${new Date(operator.createdAt).toLocaleDateString()}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
      }

      this.setupOperatorTableEvents();
    } catch (error) {
      console.error('Error loading operators:', error);
      this.showToast('Failed to load operators', 'error');
    }
  }

  setupOperatorTableEvents() {
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('edit-btn')) {
        this.handleEditOperatorClick(e);
      } else if (e.target.classList.contains('delete-btn')) {
        this.handleDeleteOperatorClick(e);
      } else if (e.target.dataset.action === 'create-operator') {
        this.loadCreateOperatorsSection();
      }
    });
  }

  async handleEditOperatorClick(e) {
    const operatorId = e.target.dataset.id;
    if (operatorId) {
      await this.loadEditOperatorForm(operatorId);
    }
  }

  async handleDeleteOperatorClick(e) {
    const operatorId = e.target.dataset.id;
    if (operatorId && confirm('Are you sure you want to delete this operator?')) {
      try {
        const response = await fetch(`/api/admin/operators/${operatorId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.currentUser.token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to delete operator');
        }

        this.showToast('Operator deleted successfully', 'success');
        this.loadOperatorsSection('edit');
      } catch (error) {
        console.error('Delete operator error:', error);
        this.showToast(error.message || 'Failed to delete operator', 'error');
      }
    }
  }

  /**
   * Load create operator form
   */
  async loadCreateOperatorsSection() {
    try {
      const contentArea = document.querySelector('.admin-content');
      if (!contentArea) return;

      const [adminClasses, countries] = await Promise.all([
        this.fetchData('/api/admin/operator-classes'),
        this.fetchData('/api/admin/countries')
      ]);

      contentArea.innerHTML = `
        <div class="create-operator-section">
          <h2>Create New Operator</h2>
          <form id="createOperatorForm" class="operator-form">
            <div class="form-group">
              <label for="adminName">ADMIN NAME:</label>
              <input type="text" id="adminName" required>
            </div>
            
            <div class="form-group">
              <label for="email">EMAIL:</label>
              <input type="email" id="email" required>
            </div>
            
            <div class="form-group">
              <label for="adminClass">SELECT CLASS:</label>
              <select id="adminClass" required>
                ${adminClasses.map(cls => `<option value="${cls}">${cls}</option>`).join('')}
              </select>
            </div>
            
            <div class="form-group">
              <label for="country">COUNTRY:</label>
              <select id="country" required>
                <option value="">Select Country</option>
                ${countries.map(country => `<option value="${country}">${country}</option>`).join('')}
              </select>
            </div>
            
            <div class="form-group">
              <label for="password">PASSWORD:</label>
              <input type="password" id="password" required minlength="10">
              <div class="password-strength-bar">
                <div class="password-strength"></div>
              </div>
              <small class="password-requirements">Minimum 10 characters with uppercase, number, and special character</small>
            </div>
            
            <div class="form-group">
              <label for="name">NAME:</label>
              <input type="text" id="name" required>
            </div>
            
            <div class="form-group">
              <label for="surname">SURNAME:</label>
              <input type="text" id="surname" required>
            </div>
            
            <div class="form-group">
              <label for="phone">PHONE NUMBER:</label>
              <input type="tel" id="phone" pattern="\\+[0-9]{1,3}[0-9]{4,14}" required>
              <small>Format: +CountryCodeNumber...</small>
            </div>
            
            <div class="form-actions">
              <button type="submit" class="submit-btn">Create Operator</button>
              <button type="reset" class="cancel-btn">Cancel</button>
            </div>
          </form>
        </div>
      `;

      // Setup password strength indicator
      document.getElementById('password').addEventListener('input', (e) => {
        this.updatePasswordStrength(e.target.value);
      });
    } catch (error) {
      console.error('Error loading create operator form:', error);
      this.showToast('Failed to load form', 'error');
    }
  }

  /**
   * Handle operator creation
   */
  async handleCreateOperator() {
    const formData = {
      adminName: document.getElementById('adminName').value.trim(),
      email: document.getElementById('email').value.trim(),
      adminClass: document.getElementById('adminClass').value,
      country: document.getElementById('country').value,
      password: document.getElementById('password').value,
      name: document.getElementById('name').value.trim(),
      surname: document.getElementById('surname').value.trim(),
      phone: document.getElementById('phone').value.trim()
    };

    if (!this.validateOperatorForm(formData)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/operators', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.currentUser.token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create operator');
      }

      this.showToast('Operator created successfully!', 'success');
      this.loadOperatorsSection('all');
    } catch (error) {
      console.error('Error creating operator:', error);
      this.showToast(error.message || 'Failed to create operator', 'error');
    }
  }

  /**
   * Validate operator form data
   */
  validateOperatorForm(formData) {
    if (!formData.adminName || !formData.email || !formData.password || !formData.country) {
      this.showToast('Please fill all required fields', 'error');
      return false;
    }

    if (formData.password.length < 10) {
      this.showToast('Password must be at least 10 characters', 'error');
      return false;
    }

    if (!formData.phone.startsWith('+')) {
      this.showToast('Phone number must start with country code (e.g., +90)', 'error');
      return false;
    }

    return true;
  }

  /**
   * Update password strength indicator
   */
  updatePasswordStrength(password) {
    const strengthBar = document.querySelector('.password-strength');
    if (!strengthBar) return;

    let strength = 0;
    const requirements = {
      length: password.length >= 10,
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[^A-Za-z0-9]/.test(password)
    };

    if (requirements.length) strength += 25;
    if (requirements.uppercase) strength += 25;
    if (requirements.number) strength += 25;
    if (requirements.special) strength += 25;

    strengthBar.style.width = `${strength}%`;
    
    if (strength < 50) {
      strengthBar.style.backgroundColor = '#e53e3e';
    } else if (strength < 75) {
      strengthBar.style.backgroundColor = '#ed8936';
    } else {
      strengthBar.style.backgroundColor = '#38a169';
    }
  }

  /**
   * Load edit operator form
   */
  async loadEditOperatorForm(operatorId) {
    try {
      const contentArea = document.querySelector('.admin-content');
      if (!contentArea) return;

      contentArea.innerHTML = '<div class="loading-spinner"></div>';

      const [operator, adminClasses, countries] = await Promise.all([
        this.fetchData(`/api/admin/operators/${operatorId}`),
        this.fetchData('/api/admin/operator-classes'),
        this.fetchData('/api/admin/countries')
      ]);

      contentArea.innerHTML = `
        <div class="edit-operator-section">
          <div class="edit-operator-header">
            <h2>Edit Operator</h2>
            <button class="close-edit-form">✕</button>
          </div>
          <form id="editOperatorForm" class="operator-form">
            <input type="hidden" id="operatorId" value="${operator._id}">
            
            <div class="form-group">
              <label for="adminName">ADMIN NAME:</label>
              <input type="text" id="adminName" value="${operator.adminName}" required>
            </div>
            
            <div class="form-group">
              <label for="email">EMAIL:</label>
              <input type="email" id="email" value="${operator.email}" required>
            </div>
            
            <div class="form-group">
              <label for="adminClass">SELECT CLASS:</label>
              <select id="adminClass" required>
                ${adminClasses.map(cls => `
                  <option value="${cls}" ${cls === operator.adminClass ? 'selected' : ''}>${cls}</option>
                `).join('')}
              </select>
            </div>
            
            <div class="form-group">
              <label for="country">COUNTRY:</label>
              <select id="country" required>
                <option value="">Select Country</option>
                ${countries.map(country => `
                  <option value="${country}" ${country === operator.country ? 'selected' : ''}>${country}</option>
                `).join('')}
              </select>
            </div>
            
            <div class="form-group">
              <label for="password">PASSWORD (leave blank to keep current):</label>
              <input type="password" id="password" minlength="10">
              <div class="password-strength-bar">
                <div class="password-strength"></div>
              </div>
              <small class="password-requirements">Minimum 10 characters with uppercase, number, and special character</small>
            </div>
            
            <div class="form-group">
              <label for="name">NAME:</label>
              <input type="text" id="name" value="${operator.name}" required>
            </div>
            
            <div class="form-group">
              <label for="surname">SURNAME:</label>
              <input type="text" id="surname" value="${operator.surname}" required>
            </div>
            
            <div class="form-group">
              <label for="phone">PHONE NUMBER:</label>
              <input type="tel" id="phone" pattern="\\+[0-9]{1,3}[0-9]{4,14}" value="${operator.phone}" required>
              <small>Format: +CountryCodeNumber...</small>
            </div>
            
            <div class="form-actions">
              <button type="submit" class="submit-btn">Update Operator</button>
              <button type="button" class="cancel-btn" id="cancelEdit">Cancel</button>
            </div>
          </form>
        </div>
      `;

      document.getElementById('password')?.addEventListener('input', (e) => {
        this.updatePasswordStrength(e.target.value);
      });

      document.querySelector('.close-edit-form').addEventListener('click', () => {
        this.loadOperatorsSection('edit');
      });

      document.getElementById('cancelEdit').addEventListener('click', () => {
        this.loadOperatorsSection('edit');
      });
    } catch (error) {
      console.error('Error loading edit form:', error);
      this.showToast('Failed to load operator data', 'error');
      this.loadOperatorsSection('edit');
    }
  }

  /**
   * Handle operator update
   */
  async handleUpdateOperator() {
    const formData = {
      id: document.getElementById('operatorId').value,
      adminName: document.getElementById('adminName').value.trim(),
      email: document.getElementById('email').value.trim(),
      adminClass: document.getElementById('adminClass').value,
      country: document.getElementById('country').value,
      password: document.getElementById('password').value,
      name: document.getElementById('name').value.trim(),
      surname: document.getElementById('surname').value.trim(),
      phone: document.getElementById('phone').value.trim()
    };

    if (!formData.adminName || !formData.email || !formData.country) {
      this.showToast('Please fill all required fields', 'error');
      return;
    }

    if (formData.password && formData.password.length < 10) {
      this.showToast('Password must be at least 10 characters', 'error');
      return;
    }

    if (!formData.phone.startsWith('+')) {
      this.showToast('Phone number must start with country code (e.g., +90)', 'error');
      return;
    }

    try {
      const response = await fetch(`/api/admin/operators/${formData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.currentUser.token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update operator');
      }

      this.showToast('Operator updated successfully!', 'success');
      this.loadOperatorsSection('edit');
    } catch (error) {
      console.error('Error updating operator:', error);
      this.showToast(error.message || 'Failed to update operator', 'error');
    }
  }

  /**
   * Delete an operator
   */
  async deleteOperator(operatorId) {
    if (!confirm('Are you sure you want to delete this operator?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/operators/${operatorId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.currentUser.token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete operator');
      }

      this.showToast('Operator deleted successfully', 'success');
      this.loadOperatorsSection('edit');
    } catch (error) {
      console.error('Error deleting operator:', error);
      this.showToast(error.message || 'Failed to delete operator', 'error');
    }
  }

  /**
   * Set admin name in header
   */
  setAdminName() {
    const adminName = document.querySelector('.admin-name');
    if (adminName && this.currentUser?.username) {
      adminName.textContent = `ODINSOFT / ${this.currentUser.username.toUpperCase()}`;
    }
  }

  /**
   * Toggle sound setting
   */
  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    localStorage.setItem('sound-enabled', this.soundEnabled);
    this.updateSoundIcon();
    this.showToast(`Sound ${this.soundEnabled ? 'enabled' : 'disabled'}`, 'info');
  }

  /**
   * Update sound icon based on current state
   */
  updateSoundIcon() {
    const soundToggle = document.querySelector('.sound-toggle');
    if (!soundToggle) return;

    if (this.soundEnabled) {
      soundToggle.classList.remove('sound-off');
      soundToggle.querySelector('.sound-icon').textContent = '🔊';
    } else {
      soundToggle.classList.add('sound-off');
      soundToggle.querySelector('.sound-icon').textContent = '🔇';
    }
  }

  changeLanguage(lang) {
    this.currentLanguage = lang;
    localStorage.setItem('admin-panel-language', lang);
    this.updateLanguageDisplay();
  }
  showToast(message, type = 'info') {
  const toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) return;

  // Remove existing toasts if there are too many
  if (toastContainer.children.length > 3) {
    toastContainer.removeChild(toastContainer.children[0]);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');
  toast.innerHTML = message;

  toastContainer.appendChild(toast);

  // Show the toast with animation
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  // Set timeout to automatically remove the toast
  const autoCloseTime = type === 'error' ? 8000 : 5000; // Errors stay longer
  const removeToast = () => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300); // Match this with the CSS transition time
  };

  const timeoutId = setTimeout(removeToast, autoCloseTime);

  // Allow manual closing by clicking
  toast.addEventListener('click', () => {
    clearTimeout(timeoutId);
    removeToast();
  });
  }

  /**
   * Redirect to login page
   */
  redirectToLogin() {
    window.location.href = '/login';
  }

  /**
   * Log out user
   */
  logout() {
    localStorage.removeItem('admin-panel-user');
    this.redirectToLogin();
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('/api/auth/verify', {
      credentials: 'include'
    });
    
    if (!response.ok) {
      window.location.href = '/';
    }
    
    // Load panel content
  } catch (err) {
    window.location.href = '/';
  }
});

document.addEventListener('DOMContentLoaded', () => {
  new AdminPanel();
});