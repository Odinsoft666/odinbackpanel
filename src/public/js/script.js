document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    const forgotPassword = document.getElementById('forgotPassword');
    const backToLogin = document.getElementById('backToLogin');
    const languageBtns = document.querySelectorAll('.language-btn');

    const translations = {
      en: {
        username: "Username",
        password: "Password",
        login: "Login",
        forgotPassword: "Forgot password?",
        yourEmail: "Your email",
        sendResetLink: "Send Reset Link",
        backToLogin: "Back to login"
      },
      tr: {
        username: "Kullanıcı Adı",
        password: "Şifre",
        login: "Giriş Yap",
        forgotPassword: "Şifremi unuttum?",
        yourEmail: "E-posta adresiniz",
        sendResetLink: "Sıfırlama Bağlantısı Gönder",
        backToLogin: "Girişe dön"
      },
      fr: {
        username: "Nom d'utilisateur",
        password: "Mot de passe",
        login: "Connexion",
        forgotPassword: "Mot de passe oublié?",
        yourEmail: "Votre email",
        sendResetLink: "Envoyer le lien de réinitialisation",
        backToLogin: "Retour à la connexion"
      }
    };
    
    // Toggle between login and reset forms
    forgotPassword.addEventListener('click', function(e) {
      e.preventDefault();
      loginForm.style.display = 'none';
      resetPasswordForm.style.display = 'block';
    });
    
    backToLogin.addEventListener('click', function(e) {
      e.preventDefault();
      resetPasswordForm.style.display = 'none';
      loginForm.style.display = 'block';
    });
    
    // Language selection
    languageBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        const lang = this.dataset.lang;
        languageBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        localStorage.setItem('preferredLanguage', lang);
        updateTexts(lang);
      });
    });
    
    // Set initial language
    const preferredLanguage = localStorage.getItem('preferredLanguage') || 'en';
    document.querySelector(`.language-btn[data-lang="${preferredLanguage}"]`).classList.add('active');
    updateTexts(preferredLanguage);

  
    
    // Login form submission
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content
          },
          body: JSON.stringify({ username, password })
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.tfaRequired) {
            // Handle 2FA flow
            window.location.href = '/verify-2fa';
          } else {
            window.location.href = '/panel';
          }
        } else {
          const error = await response.json();
          showToast(error.error || 'Login failed', 'error');
        }
      } catch (err) {
        showToast('Network error', 'error');
      }
    });
    
    // Reset password form submission
    resetPasswordForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const email = document.getElementById('resetEmail').value;
      
      try {
        const response = await fetch('/api/auth/request-reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        
        if (response.ok) {
          showToast('Reset link sent to your email');
          resetPasswordForm.style.display = 'none';
          loginForm.style.display = 'block';
        } else {
          const error = await response.json();
          showToast(error.error || 'Failed to send reset link', 'error');
        }
      } catch (err) {
        showToast('Network error', 'error');
      }
    });

    function updateTexts(lang) {
      const texts = translations[lang];
      document.getElementById('username').placeholder = texts.username;
      document.getElementById('password').placeholder = texts.password;
      document.querySelector('.login-btn').textContent = texts.login;
      document.getElementById('forgotPassword').textContent = texts.forgotPassword;
      document.getElementById('resetEmail').placeholder = texts.yourEmail;
      document.querySelector('#resetPasswordForm .login-btn').textContent = texts.sendResetLink;
      document.getElementById('backToLogin').textContent = texts.backToLogin;
    }
    
    function showToast(message, type = 'success') {
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      toast.textContent = message;
      document.getElementById('toastContainer').appendChild(toast);
      
      setTimeout(() => {
        toast.classList.add('show');
        setTimeout(() => {
          toast.classList.remove('show');
          setTimeout(() => toast.remove(), 300);
        }, 3000);
      }, 10);
    }
  });