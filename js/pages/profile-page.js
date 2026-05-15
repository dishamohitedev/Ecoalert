// ── EcoAlert Profile Page JS ──
import { initAuth, signOutUser, getCurrentUser } from '../auth.js';
import { openAuthModal } from '../authmodal.js';
import { getUserReports, upvoteReport } from '../reports.js';
import { db, doc, getDoc } from '../firebase-config.js';
import { initDarkMode, toggleDarkMode, ISSUE_TYPES, SEVERITY_LEVELS, STATUS_TYPES,
  timeAgo, formatDate, showToast } from '../utils.js';

initDarkMode();
document.getElementById('loginBtn')?.addEventListener('click', () => openAuthModal('login'));
document.getElementById('logoutBtn')?.addEventListener('click', signOutUser);
document.getElementById('hamburger')?.addEventListener('click', () => {
  document.getElementById('navLinks')?.classList.toggle('open');
});
document.getElementById('darkToggle')?.addEventListener('click', toggleDarkMode);

document.getElementById('profileSignInBtn')?.addEventListener('click', async () => {
  openAuthModal('login');
});

initAuth(async (user) => {
  if (!user) {
    document.getElementById('profileAuthGate').style.display = 'block';
    document.getElementById('profileContent').style.display = 'none';
    return;
  }
  document.getElementById('profileAuthGate').style.display = 'none';
  document.getElementById('profileContent').style.display = 'block';
  loadProfile(user);
});

async function loadProfile(user) {
  // Basic info
  document.getElementById('profilePhoto').src = user.photoURL || '';
  document.getElementById('profileName').textContent = user.displayName || 'User';
  document.getElementById('profileEmail').textContent = `Username: @${user.displayName || 'user'}`;

  // Get Firestore user doc
  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const data = userDoc.data() || {};
    const joined = data.joinedAt?.toDate?.() || new Date();
    document.getElementById('profileJoined').textContent = `Member since ${joined.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}`;
    document.getElementById('profileRoleBadge').textContent = data.role === 'admin' ? '🛡️ Admin' : '🌿 Eco Warrior';
  } catch {}

  // Load reports
  const reports = await getUserReports(user.uid);
  const resolved = reports.filter(r => r.status === 'resolved').length;
  const upvotes = reports.reduce((sum, r) => sum + (r.upvotes || 0), 0);

  document.getElementById('profReports').textContent = reports.length;
  document.getElementById('profResolved').textContent = resolved;
  document.getElementById('profUpvotes').textContent = upvotes;

  // Eco rank
  const rank = getEcoRank(reports.length, upvotes);
  document.getElementById('profRank').textContent = rank.title;
  document.getElementById('profileBadge').textContent = rank.emoji;

  // Badges
  renderBadges(reports, upvotes);

  // Report list
  renderMyReports(reports);
}

function getEcoRank(reportCount, upvotes) {
  if (reportCount >= 50 || upvotes >= 200) return { title: 'Legend', emoji: '🏆' };
  if (reportCount >= 20 || upvotes >= 100) return { title: 'Champion', emoji: '🌟' };
  if (reportCount >= 10 || upvotes >= 50) return { title: 'Guardian', emoji: '🛡️' };
  if (reportCount >= 5 || upvotes >= 20) return { title: 'Activist', emoji: '🌳' };
  if (reportCount >= 1) return { title: 'Reporter', emoji: '🌱' };
  return { title: 'Newcomer', emoji: '🌿' };
}

function renderBadges(reports, upvotes) {
  const grid = document.getElementById('badgesGrid');
  if (!grid) return;

  const BADGES = [
    { emoji: '🌱', name: 'First Report', desc: 'Filed your first report', unlocked: reports.length >= 1 },
    { emoji: '📢', name: '5 Reports', desc: 'Filed 5 reports', unlocked: reports.length >= 5 },
    { emoji: '🌳', name: '10 Reports', desc: 'Filed 10 reports', unlocked: reports.length >= 10 },
    { emoji: '👍', name: 'Community Fav', desc: 'Got 10 upvotes', unlocked: upvotes >= 10 },
    { emoji: '🔥', name: 'Trending', desc: 'Got 50 upvotes', unlocked: upvotes >= 50 },
    { emoji: '🚨', name: 'Critical Alert', desc: 'Reported critical issue', unlocked: reports.some(r => r.severity === 'critical') },
    { emoji: '✅', name: 'Resolver', desc: 'Had a report resolved', unlocked: reports.some(r => r.status === 'resolved') },
    { emoji: '🗺️', name: 'Map Maker', desc: 'Reports on the map', unlocked: reports.length >= 3 },
  ];

  grid.innerHTML = BADGES.map(b => `
    <div class="badge-item ${b.unlocked ? '' : 'locked'}">
      <span class="badge-emoji">${b.emoji}</span>
      <div class="badge-name">${b.name}</div>
      <div class="badge-desc">${b.desc}</div>
    </div>`).join('');
}

function renderMyReports(reports) {
  const container = document.getElementById('myReportsList');
  if (!container) return;
  if (!reports.length) {
    container.innerHTML = `<div class="empty-state" style="padding:40px">
      <div class="empty-icon">📋</div>
      <div class="empty-title">No reports yet</div>
      <div class="empty-text">Start by reporting an issue in your area.</div>
      <a href="report.html" class="btn btn-primary btn-sm mt-2">Report an Issue</a>
    </div>`;
    return;
  }
  container.innerHTML = reports.map(r => {
    const cfg = ISSUE_TYPES[r.type] || {};
    const sta = STATUS_TYPES[r.status] || {};
    const sev = SEVERITY_LEVELS[r.severity] || {};
    return `<div class="my-report-item" onclick="window.location.href='map.html?reportId=${r.id}'">
      <div class="mri-thumb">
        ${r.imageURL
          ? `<img src="${r.imageURL}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:var(--radius-sm)">`
          : cfg.icon || '📌'}
      </div>
      <div class="mri-info">
        <div class="mri-type">${cfg.icon} ${cfg.label}</div>
        <div class="mri-desc">${r.description}</div>
        <div class="mri-meta">
          <span class="badge badge-status-${r.status}">${sta.icon} ${sta.label}</span>
          <span class="badge badge-severity-${r.severity}">${sev.label}</span>
          <span>👍 ${r.upvotes || 0}</span>
          <span>${timeAgo(r.createdAt)}</span>
        </div>
      </div>
    </div>`;
  }).join('');
}
