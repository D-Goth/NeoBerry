export function updateMiniClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');

  const clock = document.getElementById("mini-clock");
  if (clock) {
    clock.innerHTML = `
      ${h}<span class="colon">:</span>${m}<span class="colon">:</span>${s}
    `;
  }

  const day = now.getDay();
  document.querySelectorAll(".clock-days-horizontal span").forEach(span => {
    span.classList.toggle("active", span.dataset.day == day);
  });
}

// Lancement automatique
setInterval(updateMiniClock, 1000);
updateMiniClock();

