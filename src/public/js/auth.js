document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.fromEntries(formData)),
  });

  if (response.ok) {
    const { token } = await response.json();
    localStorage.setItem('token', token);
    window.location.href = '/panel';
  } else {
    alert('Login failed');
  }
});