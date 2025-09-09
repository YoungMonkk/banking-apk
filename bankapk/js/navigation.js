// Page Navigation Module
function navigateTo(page) {
    // Update URL hash for simple routing/state retention
    const targetHash = '#' + page;
    if (window.location.hash !== targetHash) {
        window.location.hash = targetHash;
    }

    // Hide all pages
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
    });
    
    // Show selected page
    document.getElementById(page + '-page').classList.add('active');
    
    // Update active nav link
    document.querySelectorAll('nav a').forEach(link => {
        link.classList.remove('active');
    });
    document.getElementById('nav-' + page).classList.add('active');
    
    // Reset scan interface if navigating to scan page
    if (page === 'scan') {
        document.getElementById('upload-area').style.display = 'block';
        document.getElementById('scan-progress').style.display = 'none';
        document.getElementById('result-section').style.display = 'none';
    }
    
    // Scroll to top
    window.scrollTo(0, 0);
    
    // Add entrance animation to the new page
    const activePage = document.getElementById(page + '-page');
    activePage.style.animation = 'none';
    setTimeout(() => {
        activePage.style.animation = 'fadeIn 0.5s ease';
    }, 10);
}

// Initialize navigation
document.addEventListener('DOMContentLoaded', function() {
    // Navigate based on URL hash (fallback to home)
    const initialPage = (window.location.hash || '#home').substring(1);
    navigateTo(initialPage);
    
    // Add click handlers for logo
    document.querySelector('.logo').addEventListener('click', function() {
        navigateTo('home');
    });
    
    // Add smooth scrolling for anchor links
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
});

// Export for use in other modules
window.navigateTo = navigateTo;

// Handle back/forward navigation via hash
window.addEventListener('hashchange', () => {
    const page = (window.location.hash || '#home').substring(1);
    navigateTo(page);
});
