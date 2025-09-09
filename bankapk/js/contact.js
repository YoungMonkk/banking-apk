// Contact Form Module
class ContactForm {
    constructor() {
        this.form = document.querySelector('.contact-form');
        this.nameInput = document.getElementById('name');
        this.emailInput = document.getElementById('email');
        this.subjectInput = document.getElementById('subject');
        this.messageInput = document.getElementById('message');
        this.submitBtn = this.form ? this.form.querySelector('button[onclick="simulateFormSubmit()"]') : null;
        this.statusDiv = document.getElementById('form-status');
        
        this.init();
    }
    
    init() {
        if (this.form) {
            this.setupEventListeners();
            this.setupFormValidation();
        }
    }
    
    setupEventListeners() {
        if (this.submitBtn) {
            this.submitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleSubmit();
            });
        }
        
        // Add real-time validation
        [this.nameInput, this.emailInput, this.subjectInput, this.messageInput].forEach(input => {
            if (input) {
                input.addEventListener('blur', () => {
                    this.validateField(input);
                });
                
                input.addEventListener('input', () => {
                    this.clearFieldError(input);
                });
            }
        });
    }
    
    setupFormValidation() {
        // Add validation attributes
        if (this.nameInput) this.nameInput.setAttribute('required', 'true');
        if (this.emailInput) this.emailInput.setAttribute('required', 'true');
        if (this.subjectInput) this.subjectInput.setAttribute('required', 'true');
        if (this.messageInput) this.messageInput.setAttribute('required', 'true');
    }
    
    validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';
        
        switch (field.id) {
            case 'name':
                if (value.length < 2) {
                    isValid = false;
                    errorMessage = 'Name must be at least 2 characters long';
                }
                break;
                
            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) {
                    isValid = false;
                    errorMessage = 'Please enter a valid email address';
                }
                break;
                
            case 'subject':
                if (value.length < 5) {
                    isValid = false;
                    errorMessage = 'Subject must be at least 5 characters long';
                }
                break;
                
            case 'message':
                if (value.length < 10) {
                    isValid = false;
                    errorMessage = 'Message must be at least 10 characters long';
                }
                break;
        }
        
        if (!isValid) {
            this.showFieldError(field, errorMessage);
        }
        
        return isValid;
    }
    
    showFieldError(field, message) {
        this.clearFieldError(field);
        
        field.style.borderColor = 'var(--warning)';
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.style.color = 'var(--warning)';
        errorDiv.style.fontSize = '0.875rem';
        errorDiv.style.marginTop = '0.25rem';
        errorDiv.textContent = message;
        
        field.parentNode.appendChild(errorDiv);
    }
    
    clearFieldError(field) {
        field.style.borderColor = '#ddd';
        
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
    }
    
    validateForm() {
        let isValid = true;
        
        [this.nameInput, this.emailInput, this.subjectInput, this.messageInput].forEach(field => {
            if (field && !this.validateField(field)) {
                isValid = false;
            }
        });
        
        return isValid;
    }
    
    async handleSubmit() {
        if (!this.validateForm()) {
            this.showStatus('Please correct the errors above.', 'error');
            return;
        }
        
        // Show loading state
        this.setSubmitButtonState(true);
        
        try {
            // Simulate API call
            await this.simulateApiCall();
            
            // Show success message
            this.showStatus('Thank you for your message! We will get back to you soon.', 'success');
            
            // Clear form
            this.clearForm();
            
        } catch (error) {
            this.showStatus('An error occurred. Please try again.', 'error');
        } finally {
            this.setSubmitButtonState(false);
        }
    }
    
    async simulateApiCall() {
        // Simulate network delay
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, 1500);
        });
    }
    
    setSubmitButtonState(isLoading) {
        if (this.submitBtn) {
            if (isLoading) {
                this.submitBtn.disabled = true;
                this.submitBtn.innerHTML = '<span class="loading-spinner"></span> Sending...';
            } else {
                this.submitBtn.disabled = false;
                this.submitBtn.textContent = 'Send Message';
            }
        }
    }
    
    showStatus(message, type) {
        if (this.statusDiv) {
            this.statusDiv.innerHTML = `<div style="color: var(--${type === 'success' ? 'success' : 'warning'}); padding: 1rem; border-radius: 4px; background-color: rgba(${type === 'success' ? '39, 174, 96' : '231, 76, 60'}, 0.1); border: 1px solid var(--${type === 'success' ? 'success' : 'warning'});">${message}</div>`;
            
            // Auto-hide success messages after 5 seconds
            if (type === 'success') {
                setTimeout(() => {
                    this.statusDiv.innerHTML = '';
                }, 5000);
            }
        }
    }
    
    clearForm() {
        [this.nameInput, this.emailInput, this.subjectInput, this.messageInput].forEach(input => {
            if (input) {
                input.value = '';
                this.clearFieldError(input);
            }
        });
    }
}

// Initialize contact form when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    new ContactForm();
});

// Global function for backward compatibility
function simulateFormSubmit() {
    const contactForm = new ContactForm();
    contactForm.handleSubmit();
}

// Export for use in other modules
window.simulateFormSubmit = simulateFormSubmit;
