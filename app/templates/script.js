document.addEventListener("DOMContentLoaded", function () {
    fetchSystemStats();
    setInterval(fetchSystemStats, 5000); // Rafraîchir stats toutes les 5 secondes
});

function fetchSystemStats() {
    fetch('/system_stats')
        .then(response => response.json())
        .then(data => updateCharts(data));
}

function updateCharts(data) {
    updateChart("cpuChart", data.cpu);
    updateChart("ramChart", data.ram);
    updateChart("diskChart", data.disk);
}

function updateChart(chartId, value) {
    new Chart(document.getElementById(chartId), {
        type: 'doughnut',
        data: {
            labels: [chartId.replace("Chart", "")],
            datasets: [{
                data: [value, 100 - value],
                backgroundColor: ['#00BFFF', '#1a1a1a']
            }]
        },
        options: {
            responsive: true
        }
    });
}

function toggleGPIO(pin) {
    fetch('/toggle_gpio', {
        method: 'POST',
        body: JSON.stringify({ pin: pin }),
        headers: { 'Content-Type': 'application/json' }
    }).then(response => response.json())
    .then(data => {
        document.getElementById(`led${pin}`).style.backgroundColor = data.new_state ? "green" : "red";
    });
}

function confirmAction(action) {
    if (confirm(`Es-tu sûr de vouloir ${action} le Raspberry Pi ?`)) {
        fetch(`/action/${action}`).then(() => alert(`${action} en cours...`));
    }
}

