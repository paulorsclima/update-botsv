// theme.js — Toggle de tema dark/light com persistência em localStorage

(function(){
  function applyTheme(theme){
    if(theme === 'light'){
      document.body.classList.add('light-theme');
      document.getElementById('themeBtn').textContent = '☀️';
    } else {
      document.body.classList.remove('light-theme');
      document.getElementById('themeBtn').textContent = '🌙';
    }
  }

  const saved = localStorage.getItem('botsv-theme') || 'dark';
  applyTheme(saved);

  document.getElementById('themeBtn').addEventListener('click', function(){
    const current = document.body.classList.contains('light-theme') ? 'light' : 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem('botsv-theme', next);
    applyTheme(next);
  });
})();
