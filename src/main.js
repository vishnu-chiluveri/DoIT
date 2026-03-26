import './style.css';
import { signInWithGoogle, signOutUser, onAuthChange } from './auth.js';
import {
  createGroup,
  joinGroup,
  getGroup,
  getUserGroups,
  listenToGroup,
  addTasks,
  startRotation,
  getWhatsAppShareLink
} from './group.js';
import { calculateCurrentAssignments, getCurrentWeekNumber } from './rotation.js';

// ── State ──────────────────────────────────────────────
let currentUser = null;
let currentGroupId = null;
let groupUnsubscribe = null; // firestore listener cleanup

// Task color palette
const TASK_COLORS = [
  { gradient: 'from-orange-500 to-amber-500', shadow: 'shadow-orange-200', bg: 'bg-orange-50', text: 'text-orange-600' },
  { gradient: 'from-cyan-500 to-blue-500', shadow: 'shadow-blue-200', bg: 'bg-cyan-50', text: 'text-cyan-600' },
  { gradient: 'from-fuchsia-500 to-pink-500', shadow: 'shadow-pink-200', bg: 'bg-fuchsia-50', text: 'text-fuchsia-600' },
  { gradient: 'from-emerald-500 to-teal-500', shadow: 'shadow-teal-200', bg: 'bg-emerald-50', text: 'text-emerald-600' },
  { gradient: 'from-violet-500 to-purple-500', shadow: 'shadow-purple-200', bg: 'bg-violet-50', text: 'text-violet-600' },
  { gradient: 'from-rose-500 to-red-500', shadow: 'shadow-rose-200', bg: 'bg-rose-50', text: 'text-rose-600' }
];

const DEFAULT_ICONS = ['🍳', '🛁', '🌪️', '🧹', '🧽', '🗑️'];

// ── Screen Management ──────────────────────────────────
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(el => {
    el.classList.add('hidden');
    el.classList.remove('flex');
  });
  const screen = document.getElementById(`screen-${screenId}`);
  if (screen) {
    screen.classList.remove('hidden');
    screen.classList.add('flex');
  }
}

// ── Init ───────────────────────────────────────────────
function init() {
  // Auth state listener
  onAuthChange(async (user) => {
    currentUser = user;
    if (user) {
      // Check for join link in URL
      const params = new URLSearchParams(window.location.search);
      const joinId = params.get('join');
      if (joinId) {
        // Clear the URL parameter
        window.history.replaceState({}, '', window.location.pathname);
        await handleJoinGroup(joinId);
      } else {
        showHomeScreen();
      }
    } else {
      showScreen('login');
    }
  });

  // Bind all event listeners
  bindEventListeners();
}

function bindEventListeners() {
  // Login
  document.getElementById('btn-google-signin').addEventListener('click', handleGoogleSignIn);

  // Home
  document.getElementById('btn-signout').addEventListener('click', handleSignOut);
  document.getElementById('btn-create-group').addEventListener('click', () => showScreen('create-group'));

  // Create Group
  document.getElementById('btn-back-create').addEventListener('click', () => showHomeScreen());
  const nameInput = document.getElementById('input-group-name');
  const submitBtn = document.getElementById('btn-submit-create');
  nameInput.addEventListener('input', () => {
    submitBtn.disabled = nameInput.value.trim().length === 0;
  });
  submitBtn.addEventListener('click', handleCreateGroup);

  // Group Dashboard
  document.getElementById('btn-back-group').addEventListener('click', () => {
    if (groupUnsubscribe) {
      groupUnsubscribe();
      groupUnsubscribe = null;
    }
    currentGroupId = null;
    showHomeScreen();
  });
  document.getElementById('btn-share-group').addEventListener('click', handleShareGroup);
  document.getElementById('btn-add-task-row').addEventListener('click', addTaskInputRow);
  document.getElementById('btn-save-tasks').addEventListener('click', handleSaveTasks);

  // PWA Install
  setupPWAInstall();
}

// ── Auth Handlers ──────────────────────────────────────
async function handleGoogleSignIn() {
  const btn = document.getElementById('btn-google-signin');
  const errorEl = document.getElementById('login-error');
  try {
    btn.disabled = true;
    btn.textContent = 'Signing in...';
    errorEl.classList.add('hidden');
    await signInWithGoogle();
    // onAuthChange will handle navigation
  } catch (error) {
    errorEl.textContent = 'Sign-in failed. Please try again.';
    errorEl.classList.remove('hidden');
    btn.disabled = false;
    btn.innerHTML = `<svg class="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg> Sign in with Google`;
  }
}

async function handleSignOut() {
  if (groupUnsubscribe) {
    groupUnsubscribe();
    groupUnsubscribe = null;
  }
  currentGroupId = null;
  await signOutUser();
}

// ── Home Screen ────────────────────────────────────────
async function showHomeScreen() {
  showScreen('home');
  document.getElementById('home-user-name').textContent = `Hey, ${currentUser.displayName?.split(' ')[0] || 'there'}! 👋`;

  const listEl = document.getElementById('groups-list');
  const noGroupsEl = document.getElementById('no-groups');
  listEl.innerHTML = '<div class="text-center py-6 text-slate-400 text-sm">Loading groups...</div>';
  noGroupsEl.classList.add('hidden');

  try {
    const groups = await getUserGroups(currentUser.uid);
    listEl.innerHTML = '';

    if (groups.length === 0) {
      noGroupsEl.classList.remove('hidden');
      return;
    }

    groups.forEach(group => {
      const card = document.createElement('button');
      card.className = 'w-full text-left p-4 rounded-2xl bg-white shadow-sm border border-slate-100 hover:border-indigo-200 hover:shadow-md transition-all active:scale-[0.98] flex items-center gap-4';
      
      const memberCount = group.members?.length || 1;
      const hasTasks = group.tasks && group.tasks.length > 0;
      
      card.innerHTML = `
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-indigo-200">
          ${group.name.charAt(0).toUpperCase()}
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-slate-800 truncate">${group.name}</p>
          <p class="text-xs text-slate-500">${memberCount} member${memberCount !== 1 ? 's' : ''} · ${hasTasks ? group.tasks.length + ' tasks' : 'No tasks yet'}</p>
        </div>
        <svg class="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
      `;

      card.addEventListener('click', () => openGroupDashboard(group.id));
      listEl.appendChild(card);
    });
  } catch (error) {
    console.error('Error loading groups:', error);
    listEl.innerHTML = '<div class="text-center py-6 text-red-500 text-sm">Failed to load groups</div>';
  }
}

// ── Create Group ───────────────────────────────────────
async function handleCreateGroup() {
  const nameInput = document.getElementById('input-group-name');
  const submitBtn = document.getElementById('btn-submit-create');
  const name = nameInput.value.trim();
  if (!name) return;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating...';

  try {
    const groupId = await createGroup(name, currentUser);
    nameInput.value = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Create Group';
    openGroupDashboard(groupId);
  } catch (error) {
    console.error('Error creating group:', error);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Group';
    alert('Failed to create group. Please try again.');
  }
}

// ── Join Group ─────────────────────────────────────────
async function handleJoinGroup(groupId) {
  showScreen('loading');
  try {
    await joinGroup(groupId, currentUser);
    openGroupDashboard(groupId);
  } catch (error) {
    console.error('Error joining group:', error);
    alert('Failed to join group. The link may be invalid.');
    showHomeScreen();
  }
}

// ── Group Dashboard ────────────────────────────────────
function openGroupDashboard(groupId) {
  currentGroupId = groupId;

  // Clean up previous listener
  if (groupUnsubscribe) {
    groupUnsubscribe();
  }

  showScreen('group');

  // Start real-time listener
  groupUnsubscribe = listenToGroup(groupId, (group) => {
    renderGroupDashboard(group);
  });
}

function renderGroupDashboard(group) {
  // Header
  document.getElementById('group-name-header').textContent = group.name;
  document.getElementById('group-member-count').textContent = `${group.members.length} member${group.members.length !== 1 ? 's' : ''}`;

  // Date
  const now = new Date();
  const options = { weekday: 'long', month: 'short', day: 'numeric' };
  document.getElementById('group-date').textContent = now.toLocaleDateString('en-US', options);

  // Week number
  const weekNum = group.rotationStartDate ? getCurrentWeekNumber(group.rotationStartDate) : 0;
  document.getElementById('group-week-label').textContent = weekNum > 0 ? `Week ${weekNum}` : 'Not started';

  // Members avatars
  renderMemberAvatars(group);

  // Task assignments
  const assignments = calculateCurrentAssignments(group);
  const myTaskSection = document.getElementById('my-task-section');
  const allTasksSection = document.getElementById('all-tasks-section');
  const adminSection = document.getElementById('admin-section');

  const isAdmin = group.createdBy === currentUser.uid;
  const hasTasks = group.tasks && group.tasks.length > 0;
  const hasRotation = group.rotationStartDate && group.initialOrder && group.initialOrder.length > 0;

  if (hasTasks && hasRotation && assignments) {
    // Show assignments
    myTaskSection.classList.remove('hidden');
    allTasksSection.classList.remove('hidden');
    adminSection.classList.add('hidden');

    // My task
    const myAssignment = assignments[currentUser.uid];
    if (myAssignment) {
      document.getElementById('my-task-name').textContent = myAssignment.taskName;
      document.getElementById('my-task-icon').textContent = myAssignment.taskIcon;

      const color = TASK_COLORS[myAssignment.taskIndex % TASK_COLORS.length];
      const card = document.getElementById('my-task-card');
      card.className = `bg-gradient-to-br ${color.gradient} rounded-3xl p-[2px] shadow-2xl ${color.shadow} group transition-transform duration-300 hover:-translate-y-1 relative z-10`;
    }

    // All tasks (including mine)
    const allTasksList = document.getElementById('all-tasks-list');
    allTasksList.innerHTML = '';

    group.tasks.forEach((taskName, idx) => {
      // Find who has this task
      let assignedUid = null;
      for (const [uid, assignment] of Object.entries(assignments)) {
        if (assignment.taskIndex === idx) {
          assignedUid = uid;
          break;
        }
      }

      const memberName = assignedUid ? (group.memberNames[assignedUid] || 'Unknown') : 'Unassigned';
      const icon = group.taskIcons[idx] || '📋';
      const color = TASK_COLORS[idx % TASK_COLORS.length];
      const isMe = assignedUid === currentUser.uid;

      const item = document.createElement('div');
      item.className = `flex items-center justify-between p-3.5 rounded-2xl ${isMe ? 'bg-indigo-50 border-2 border-indigo-200' : 'bg-white border border-slate-100'} shadow-sm transition-all`;
      item.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl ${color.bg} flex items-center justify-center text-lg">
            ${icon}
          </div>
          <div>
            <p class="font-semibold text-slate-800 text-sm">${taskName}</p>
            <p class="text-xs ${isMe ? 'text-indigo-500 font-medium' : 'text-slate-500'}">${isMe ? '⭐ You' : memberName}</p>
          </div>
        </div>
      `;
      allTasksList.appendChild(item);
    });
  } else if (isAdmin && (!hasTasks || !hasRotation)) {
    // Admin needs to add tasks
    myTaskSection.classList.add('hidden');
    allTasksSection.classList.add('hidden');
    adminSection.classList.remove('hidden');

    if (group.members.length < 2) {
      document.getElementById('btn-save-tasks').textContent = 'Need at least 2 members to start';
      document.getElementById('btn-save-tasks').disabled = true;
    }

    // Initialize task input rows if empty
    const taskInputs = document.getElementById('task-inputs');
    if (taskInputs.children.length === 0) {
      for (let i = 0; i < Math.max(group.members.length, 2); i++) {
        addTaskInputRow();
      }
    }
    validateTaskInputs();
  } else {
    // Non-admin waiting for admin to add tasks
    myTaskSection.classList.add('hidden');
    allTasksSection.classList.add('hidden');
    adminSection.classList.add('hidden');

    // Show waiting message
    const allTasksList = document.getElementById('all-tasks-list');
    allTasksSection.classList.remove('hidden');
    allTasksList.innerHTML = `
      <div class="text-center py-8 space-y-3">
        <div class="w-12 h-12 mx-auto bg-amber-50 rounded-2xl flex items-center justify-center">
          <span class="text-2xl animate-bounce">⏳</span>
        </div>
        <p class="text-slate-500 text-sm">Waiting for the admin to add tasks and start the rotation...</p>
      </div>
    `;
  }

  // Messages
  renderMessages(group);
}

function renderMemberAvatars(group) {
  const container = document.getElementById('members-avatars');
  container.innerHTML = '';

  group.members.forEach((uid) => {
    const name = group.memberNames[uid] || 'Unknown';
    const photo = group.memberPhotos?.[uid];
    const initial = name.charAt(0).toUpperCase();

    const avatar = document.createElement('div');
    avatar.className = 'w-9 h-9 rounded-full border-2 border-white shadow-sm -ml-2 first:ml-0 flex items-center justify-center text-xs font-bold overflow-hidden';
    avatar.title = name;

    if (photo) {
      avatar.innerHTML = `<img src="${photo}" alt="${name}" class="w-full h-full object-cover" referrerpolicy="no-referrer" />`;
    } else {
      avatar.className += ' bg-gradient-to-br from-indigo-400 to-purple-500 text-white';
      avatar.textContent = initial;
    }
    container.appendChild(avatar);
  });

  // Member count label
  const label = document.createElement('span');
  label.className = 'text-xs text-slate-500 ml-2';
  label.textContent = group.members.map(uid => (group.memberNames[uid] || 'Unknown').split(' ')[0]).join(', ');
  container.appendChild(label);
}

function renderMessages(group) {
  const container = document.getElementById('group-messages');
  container.innerHTML = '';

  if (!group.messages || group.messages.length === 0) return;

  // Show last 20 messages, newest first
  const messages = [...group.messages].reverse().slice(0, 20);

  messages.forEach(msg => {
    const el = document.createElement('div');
    el.className = 'flex items-start gap-2 text-sm';

    const icon = msg.type === 'join' ? '🎉' : msg.type === 'system' ? '✨' : '💬';
    const time = msg.timestamp ? new Date(msg.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

    el.innerHTML = `
      <span class="text-base mt-0.5">${icon}</span>
      <div class="flex-1">
        <p class="text-slate-700">${msg.text}</p>
        <p class="text-xs text-slate-400 mt-0.5">${time}</p>
      </div>
    `;
    container.appendChild(el);
  });
}

// ── Admin: Task Input Management ───────────────────────
function addTaskInputRow() {
  const container = document.getElementById('task-inputs');
  const index = container.children.length;

  const row = document.createElement('div');
  row.className = 'flex items-center gap-2 task-row';

  const iconSelect = document.createElement('select');
  iconSelect.className = 'w-12 h-10 rounded-xl bg-white border border-amber-200 text-center text-lg cursor-pointer focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none';
  const icons = ['🍳', '🛁', '🌪️', '🧹', '🧽', '🗑️', '🛏️', '🧺', '🪣', '🧴', '🪴', '🍽️'];
  icons.forEach((emoji, i) => {
    const opt = document.createElement('option');
    opt.value = emoji;
    opt.textContent = emoji;
    if (i === (index % icons.length)) opt.selected = true;
    iconSelect.appendChild(opt);
  });

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = `Task ${index + 1} name...`;
  nameInput.className = 'flex-1 py-2 px-3 rounded-xl bg-white border border-amber-200 text-sm text-slate-800 placeholder-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none';
  nameInput.addEventListener('input', validateTaskInputs);

  const removeBtn = document.createElement('button');
  removeBtn.className = 'w-8 h-8 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors text-sm flex items-center justify-center';
  removeBtn.textContent = '✕';
  removeBtn.addEventListener('click', () => {
    row.remove();
    validateTaskInputs();
  });

  row.appendChild(iconSelect);
  row.appendChild(nameInput);
  row.appendChild(removeBtn);
  container.appendChild(row);
}

function validateTaskInputs() {
  const rows = document.querySelectorAll('.task-row');
  const saveBtn = document.getElementById('btn-save-tasks');
  let valid = rows.length >= 2;

  rows.forEach(row => {
    const input = row.querySelector('input');
    if (!input.value.trim()) valid = false;
  });

  saveBtn.disabled = !valid;
  if (valid) {
    saveBtn.textContent = 'Save & Start Rotation 🎲';
  }
}

async function handleSaveTasks() {
  const rows = document.querySelectorAll('.task-row');
  const saveBtn = document.getElementById('btn-save-tasks');

  const tasks = [];
  rows.forEach(row => {
    const icon = row.querySelector('select').value;
    const name = row.querySelector('input').value.trim();
    if (name) {
      tasks.push({ name, icon });
    }
  });

  if (tasks.length < 2) return;

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    // Get the current group to know member count
    const group = await getGroup(currentGroupId);
    await addTasks(currentGroupId, tasks);
    await startRotation(currentGroupId, group.members.length);
    // Real-time listener will auto-update the UI
  } catch (error) {
    console.error('Error saving tasks:', error);
    alert('Failed to save tasks. Please try again.');
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save & Start Rotation 🎲';
  }
}

// ── Share via WhatsApp ─────────────────────────────────
function handleShareGroup() {
  if (!currentGroupId) return;

  const groupName = document.getElementById('group-name-header').textContent;
  const baseUrl = window.location.origin + window.location.pathname;
  const shareUrl = getWhatsAppShareLink(currentGroupId, groupName, baseUrl);

  window.open(shareUrl, '_blank');
}

// ── PWA Install ────────────────────────────────────────
function setupPWAInstall() {
  let deferredPrompt;
  const installBtn = document.getElementById('btn-install-home');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.classList.remove('hidden');
  });

  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      installBtn.classList.add('hidden');
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`Install prompt outcome: ${outcome}`);
        deferredPrompt = null;
      }
    });
  }

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    if (installBtn) installBtn.classList.add('hidden');
  });
}

// ── Start the App ──────────────────────────────────────
init();
