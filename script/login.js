// script/login.js - Admin Login Handler

const API_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('form');
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        
        // Disable button during login
        submitBtn.disabled = true;
        submitBtn.textContent = 'Logging in...';
        
        try {
            console.log('🔄 Attempting login...');
            
            const response = await fetch(`${API_URL}/admin/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            console.log('📡 Response status:', response.status);
            
            const data = await response.json();
            console.log('📦 Response data:', data);
            
            if (data.success) {
                // Store token in sessionStorage
                sessionStorage.setItem('adminToken', data.token);
                sessionStorage.setItem('adminUsername', username);
                
                // Show success message
                console.log('✅ Login successful!');
                console.log('🔄 Redirecting to dashboard...');
                
                // Redirect to dashboard (adjust path based on your folder structure)
                window.location.href = 'dashboard.html';
            } else {
                // Show error message
                console.error('❌ Login failed:', data.message);
                alert(data.message || 'Login failed');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Login';
            }
        } catch (error) {
            console.error('❌ Login error:', error);
            alert('An error occurred. Please try again.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Login';
        }
    });
});