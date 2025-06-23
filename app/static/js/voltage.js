export async function updateVoltage() {
  try {
    const res = await fetch("/api/voltage");
    const data = await res.json();
    const el = document.getElementById("voltage-status");
    if (!el) return;

    el.textContent = data.label;
    el.className = "voltage " + data.status;
  } catch (err) {
    console.error("Erreur voltage:", err);
  }
}

