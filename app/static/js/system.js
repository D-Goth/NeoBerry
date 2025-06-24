// system.js

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

  document.getElementById('confirm-yes')?.addEventListener('click', () => {
    if (!pendingActionRef.value) {
      console.error("⛔ pendingAction est null — aucune action définie");
      closeConfirmModal();
      return;
    }

    if (pendingActionRef.value === 'restart-neoberry') {
      closeConfirmModal();
      restartNeoBerryDirect();
    } else {
      closeConfirmModal();
      openAuthModal();
    }
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


