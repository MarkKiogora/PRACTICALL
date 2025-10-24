// app.js
const SID4 = '1234'; // replace with your last 4 digits
const store = createStore(`focustasks_${SID4}`);

const form = document.getElementById('add-form');
const input = document.getElementById('task-input');
const errorEl = document.getElementById('error');
const activeList = document.getElementById('active-list');
const doneList = document.getElementById('done-list');
const analyticsEl = document.getElementById('analytics');

/* ---------- UI helpers ---------- */
function showError(msg){
  if(!msg){ errorEl.hidden = true; errorEl.textContent = ''; return; }
  errorEl.hidden = false;
  errorEl.textContent = msg;
}
function clearInput(){ input.value = ''; }

/* Safe render function: uses textContent and element creation, not innerHTML */
function render(){
  const tasks = store.list();
  const [active, done] = [tasks.filter(t => !t.done), tasks.filter(t => t.done)];

  // Clear lists
  activeList.innerHTML = '';
  doneList.innerHTML = '';

  active.forEach(renderTaskRow);
  done.forEach(renderTaskRow);

  // update analytics
  analyticsEl.textContent = formatAnalytics(summarize(tasks));
}

function renderTaskRow(task){
  const li = document.createElement('li');
  li.className = 'task-row';
  li.dataset.id = task.id;

  const chk = document.createElement('input');
  chk.type = 'checkbox';
  chk.checked = task.done;
  chk.setAttribute('aria-label', task.title + (task.done ? ' (done)' : ''));

  const span = document.createElement('span');
  // set text safely
  span.textContent = task.title;

  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'delete';
  del.textContent = 'Delete';
  del.setAttribute('aria-label', `Delete ${task.title}`);

  li.appendChild(chk);
  li.appendChild(span);
  li.appendChild(del);

  if(task.done) doneList.appendChild(li);
  else activeList.appendChild(li);
}

/* ---------- Event handling via delegation (Task 3) ---------- */
form.addEventListener('submit', (ev) => {
  ev.preventDefault();
  showError('');
  const title = input.value.trim();
  if(!title){
    showError('Please enter a non-empty task title.');
    return;
  }
  const id = makeId();
  store.add({ id, title, done: false });
  clearInput();
  render();
});

[activeList.parentElement, doneList.parentElement].forEach(container => {
  // one delegated listener per area (here using the section container)
  container.addEventListener('click', (ev) => {
    const target = ev.target;
    // find closest li
    const li = target.closest('li.task-row');
    if(!li) return;
    const id = li.dataset.id;
    if(target.matches('input[type="checkbox"]')){
      store.toggle(id);
      render();
      return;
    }
    if(target.matches('button.delete')){
      store.remove(id);
      render();
      return;
    }
  });
});

/* ---------- Store closure implementation (Task 2) ---------- */
function createStore(storageKey){
  // initialize from localStorage or empty array
  let state = (function hydrate(){
    try{
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    }catch(e){
      console.warn('hydrate failed', e);
      return [];
    }
  })();

  function persist(){
    localStorage.setItem(storageKey, JSON.stringify(state));
  }

  function deepClone(arr){
    return JSON.parse(JSON.stringify(arr));
  }

  return {
    add(item){
      state = state.concat([item]); // immutable-ish update
      persist();
      return deepClone(state);
    },
    toggle(id){
      state = state.map(t => t.id === id ? Object.assign({}, t, { done: !t.done }) : t);
      persist();
      return deepClone(state);
    },
    remove(id){
      state = state.filter(t => t.id !== id);
      persist();
      return deepClone(state);
    },
    list(){
      return deepClone(state);
    }
  };
}

/* ---------- Utilities ---------- */
function makeId(){
  return `${Date.now()}_${Math.random().toString(36).slice(2,9)}`;
}

/* Analytics pure function (Task 3) */
function summarize(tasks){
  const active = tasks.filter(t => !t.done).length;
  const done = tasks.filter(t => t.done).length;
  const total = active + done;
  const pct = total === 0 ? 0 : Number(((done/total)*100).toFixed(1));
  return { active, done, pct };
}
function formatAnalytics({active,done,pct}){
  return `Active: ${active} · Done: ${done} · Done %: ${pct}%`;
}

/* ---------- Two required micro-explanations (Task 4) ---------- */
/* 
1) Closure store comment:
   The store's state variable is scoped inside createStore, so no global mutable 'tasks' exists.
   This reduces accidental mutations and makes the API pure (only accessible via store methods), which improves testability because tests can create independent stores.
*/

/*
2) Escaping explanation comment:
   Rendering uses textContent / createElement instead of innerHTML (see span.textContent = task.title).
   This is sufficient for client-only rendering because it prevents injection from user-supplied strings in the DOM.
   On server-rendered or multi-user apps you'd also need server-side escaping and a CSP to mitigate different attack surfaces.
*/

render(); // initial render from hydrated store
