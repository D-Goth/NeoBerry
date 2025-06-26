// system.js

// ─────────────────────────────────────────────────────────────
// 🔧 Gestion des actions système avec mot de passe (reboot/shutdown)
// ─────────────────────────────────────────────────────────────
export function handleSystemAction(pendingAction, password) {
  const url = `/api/${pendingAction}`;
  const progress = document.getElementById('progress-bar');
  const submitBtn = document.getElementById('auth-submit');
  const err = document.getElementById('auth-error');

  progress?.classList.remove('hidden');
  submitBtn.disabled = true;
  err.style.display = 'none';

  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  })
    .then(res => res.json())
    .finally(() => {
      progress?.classList.add('hidden');
      submitBtn.disabled = false;
    });
}

// ─────────────────────────────────────────────────────────────
// 🔁 Redémarrage direct de NeoBerry (pas d’authentification requise)
// ─────────────────────────────────────────────────────────────
export function restartNeoBerryDirect() {
  const progress = document.getElementById('progress-bar');
  progress?.classList.remove('hidden');

  fetch('/api/restart-neoberry', { method: 'POST' })
    .then(res => res.json())
    .then(json => {
      progress?.classList.add('hidden');
      if (!json.success) {
        alert("Erreur lors du redémarrage de NeoBerry.");
      }
    })
    .catch(err => {
      progress?.classList.add('hidden');
      console.error("Erreur réseau :", err);
    });
}

// ─────────────────────────────────────────────────────────────
// ⚙️ Initialisation des listeners des boutons système
// ─────────────────────────────────────────────────────────────
export function setupSystemActionListeners(pendingActionRef, openConfirmModal, openAuthModal, closeConfirmModal, closeAuthModal) {
  document.getElementById('reboot-button')?.addEventListener('click', () => {
    pendingActionRef.value = 'reboot';
    openConfirmModal('reboot');
  });

  document.getElementById('shutdown-button')?.addEventListener('click', () => {
    pendingActionRef.value = 'shutdown';
    openConfirmModal('shutdown');
  });

  document.getElementById('restart-neoberry-button')?.addEventListener('click', () => {
    pendingActionRef.value = 'restart-neoberry';
    openConfirmModal('restart-neoberry');
  });

  document.getElementById('update-button')?.addEventListener('click', () => {
    showUpdateSystemModal();
  });

  document.getElementById('auth-submit')?.addEventListener('click', async () => {
    const pwd = document.getElementById('auth-password').value;
    if (!pendingActionRef.value) {
      console.error('⛔ Aucune action en attente — fetch annulé');
      return;
    }

    const json = await handleSystemAction(pendingActionRef.value, pwd);
    const err = document.getElementById('auth-error');
    if (json.success) {
      closeAuthModal();
    } else {
      err.textContent = json.error || 'Erreur inconnue.';
      err.style.display = 'block';
    }
  });
}

// ─────────────────────────────────────────────────────────────
// 🟢 Modale dédiée à la mise à jour système (sans mot de passe)
// ─────────────────────────────────────────────────────────────
export function showUpdateSystemModal() {
  const modal = document.getElementById('update-modal');
  const status = document.getElementById('update-status');
  const progress = document.getElementById('progress-bar');

  modal.classList.remove('hidden');
  progress?.classList.remove('hidden');
  status.textContent = "🔄 Mise à jour du système en cours…";

  fetch('/api/update', { method: 'POST' })
    .then(res => res.json())
    .then(json => {
      if (json.success) {
        status.textContent = "✅ Mise à jour terminée avec succès.";
      } else {
        status.textContent = "❌ Échec : " + (json.error || "Erreur inconnue.");
      }
    })
    .catch(() => {
      status.textContent = "❌ Erreur réseau ou serveur.";
    })
    .finally(() => {
      progress?.classList.add('hidden');
      setTimeout(() => {
        modal.classList.add('hidden');
      }, 3000);
    });
}

