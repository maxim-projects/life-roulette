const app = document.getElementById('app');

if (!app) {
  throw new Error('#app not found');
}

const wrap = document.createElement('div');
wrap.style.cssText =
  'display:flex;align-items:center;justify-content:center;flex:1;text-align:center;';

const heading = document.createElement('h1');
heading.textContent = 'Рулетка Жизни';

wrap.appendChild(heading);
app.appendChild(wrap);
