// Theme Management Module
class ThemeManager {
    constructor() {
        this.themeIcon = document.getElementById('theme-icon');
        this.themeToggle = document.getElementById('theme-toggle');
        this.currentTheme = this.getStoredTheme() || this.getSystemTheme();
        
        this.init();
    }
    
    init() {
        this.applyTheme(this.currentTheme);
        this.updateThemeIcon();
        this.setupEventListeners();
    }
    
    getStoredTheme() {
        return localStorage.getItem('apkguard-theme');
    }
    
    setStoredTheme(theme) {
        localStorage.setItem('apkguard-theme', theme);
    }
    
    getSystemTheme() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.currentTheme = theme;
        this.setStoredTheme(theme);
        this.updateThemeIcon();
    }
    
    updateThemeIcon() {
        if (this.themeIcon) {
            this.themeIcon.textContent = this.currentTheme === 'dark' ? '☀️' : '🌙';
        }
    }
    
    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
        
        // Add a subtle animation effect
        document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
        setTimeout(() => {
            document.body.style.transition = '';
        }, 300);
    }
    
    setupEventListeners() {
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!this.getStoredTheme()) {
                // Only auto-switch if user hasn't manually set a preference
                this.applyTheme(e.matches ? 'dark' : 'light');
            }
        });
    }
}

// Global theme toggle function
function toggleTheme() {
    if (window.themeManager) {
        window.themeManager.toggleTheme();
    }
}

// Initialize theme manager when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.themeManager = new ThemeManager();
});

// Export for use in other modules
window.ThemeManager = ThemeManager;
