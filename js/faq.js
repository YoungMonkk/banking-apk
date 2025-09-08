// FAQ Module
class FAQManager {
    constructor() {
        this.faqItems = document.querySelectorAll('.faq-item');
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.addStaggerAnimation();
    }
    
    setupEventListeners() {
        this.faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            if (question) {
                question.addEventListener('click', () => {
                    this.toggleFaq(item);
                });
            }
        });
    }
    
    toggleFaq(faqItem) {
        const answer = faqItem.querySelector('.faq-answer');
        const toggleIcon = faqItem.querySelector('.faq-question span:last-child');
        
        if (answer.classList.contains('active')) {
            // Close FAQ
            answer.classList.remove('active');
            toggleIcon.textContent = '+';
            answer.style.maxHeight = '0px';
        } else {
            // Close all other FAQs first
            this.closeAllFaqs();
            
            // Open this FAQ
            answer.classList.add('active');
            toggleIcon.textContent = '-';
            answer.style.maxHeight = answer.scrollHeight + 'px';
        }
    }
    
    closeAllFaqs() {
        this.faqItems.forEach(item => {
            const answer = item.querySelector('.faq-answer');
            const toggleIcon = item.querySelector('.faq-question span:last-child');
            
            answer.classList.remove('active');
            toggleIcon.textContent = '+';
            answer.style.maxHeight = '0px';
        });
    }
    
    addStaggerAnimation() {
        // Add stagger animation class to FAQ items
        this.faqItems.forEach((item, index) => {
            item.classList.add('stagger-item');
            item.style.animationDelay = `${index * 0.1}s`;
        });
    }
}

// Initialize FAQ manager when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    new FAQManager();
});

// Global function for backward compatibility
function toggleFaq(element) {
    const faqItem = element.closest('.faq-item');
    if (faqItem) {
        const faqManager = new FAQManager();
        faqManager.toggleFaq(faqItem);
    }
}

// Export for use in other modules
window.toggleFaq = toggleFaq;
