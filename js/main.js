// Main Application Module
class APKGuardApp {
    constructor() {
        this.currentPage = 'home';
        this.init();
    }
    
    init() {
        this.setupGlobalEventListeners();
        this.initializeAnimations();
        this.setupIntersectionObserver();
        this.addSecurityIcons();
    }
    
    setupGlobalEventListeners() {
        // Add keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModals();
            }
        });
        
        // Add scroll effects
        window.addEventListener('scroll', () => {
            this.handleScrollEffects();
        });
        
        // Add resize handler
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }
    
    initializeAnimations() {
        // Add entrance animations to elements
        const animatedElements = document.querySelectorAll('.feature-box, .stat-item, .card');
        
        animatedElements.forEach((element, index) => {
            element.classList.add('animate-fade-up');
            element.style.animationDelay = `${index * 0.1}s`;
        });
    }
    
    setupIntersectionObserver() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-fade-up');
                }
            });
        }, observerOptions);
        
        // Observe elements for animation
        const elementsToObserve = document.querySelectorAll('.feature-box, .stat-item, .card, .threat-type');
        elementsToObserve.forEach(element => {
            observer.observe(element);
        });
    }
    
    addSecurityIcons() {
        // Add floating security icons to hero section
        const hero = document.querySelector('.hero');
        if (hero) {
            const icons = ['🛡️', '🔒', '🔐', '⚡'];
            icons.forEach((icon, index) => {
                const iconElement = document.createElement('div');
                iconElement.className = 'security-icon';
                iconElement.textContent = icon;
                iconElement.style.animationDelay = `${index * 0.5}s`;
                hero.appendChild(iconElement);
            });
        }
    }
    
    handleScrollEffects() {
        const scrolled = window.pageYOffset;
        const parallaxElements = document.querySelectorAll('.hero');
        
        parallaxElements.forEach(element => {
            const speed = 0.5;
            element.style.transform = `translateY(${scrolled * speed}px)`;
        });
        
        // Add scroll-triggered animations
        const scrollElements = document.querySelectorAll('.feature-box, .stat-item');
        scrollElements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            const elementVisible = 150;
            
            if (elementTop < window.innerHeight - elementVisible) {
                element.classList.add('animate-fade-up');
            }
        });
    }
    
    handleResize() {
        // Handle responsive behavior
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
            document.body.classList.add('mobile-view');
        } else {
            document.body.classList.remove('mobile-view');
        }
    }
    
    closeModals() {
        // Close any open modals or overlays
        const openModals = document.querySelectorAll('.modal.active, .overlay.active');
        openModals.forEach(modal => {
            modal.classList.remove('active');
        });
    }
    
    // Utility functions
    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 4px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
        `;
        
        // Set background color based on type
        const colors = {
            info: 'var(--info)',
            success: 'var(--success)',
            warning: 'var(--warning)',
            error: 'var(--warning)'
        };
        
        notification.style.backgroundColor = colors[type] || colors.info;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Auto remove
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    }
    
    // Performance monitoring
    measurePerformance() {
        if ('performance' in window) {
            const perfData = performance.getEntriesByType('navigation')[0];
            console.log('Page Load Time:', perfData.loadEventEnd - perfData.loadEventStart, 'ms');
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize main app
    const app = new APKGuardApp();
    
    // Make app globally available
    window.APKGuardApp = app;
    
    // Performance monitoring
    app.measurePerformance();
    
    // Add loading animation
    const loader = document.querySelector('.loading-spinner');
    if (loader) {
        setTimeout(() => {
            loader.style.display = 'none';
        }, 1000);
    }
    
    // Add some interactive features
    addInteractiveFeatures();
});

// Additional interactive features
function addInteractiveFeatures() {
    // Add hover effects to feature boxes
    const featureBoxes = document.querySelectorAll('.feature-box');
    featureBoxes.forEach(box => {
        box.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.02)';
        });
        
        box.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
    
    // Add click effects to buttons
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 150);
        });
    });
    
    // Add smooth scrolling for internal links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Export for use in other modules
window.addInteractiveFeatures = addInteractiveFeatures;
