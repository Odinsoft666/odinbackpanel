import io from 'socket.io-client';
import moment from 'moment';
import Chart from 'chart.js/auto';

const socket = io('/status');
const STATUS_MAP = {
  operational: { class: 'operational', text: 'Operational' },
  partial_outage: { class: 'partial_outage', text: 'Partial Outage' },
  major_outage: { class: 'major_outage', text: 'Major Outage' },
  maintenance: { class: 'maintenance', text: 'Under Maintenance' }
};

// DOM Elements
const lastUpdatedEl = document.getElementById('lastUpdated');
const servicesGrid = document.querySelector('.services-grid');
const timeline = document.querySelector('.timeline');

// Initialize
fetchInitialData();
setupRealtime();

// Functions
async function fetchInitialData() {
  const [statusRes, incidentsRes] = await Promise.all([
    fetch('/api/status/status'),
    fetch('/api/status/incidents')
  ]);
  
  const [status, incidents] = await Promise.all([
    statusRes.json(),
    incidentsRes.json()
  ]);
  
  renderServices(status.services);
  renderIncidents(incidents);
  updateSummary(status.status);
}

function setupRealtime() {
  const eventSource = new EventSource('/api/status/updates');
  
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    lastUpdatedEl.textContent = `Last updated: ${moment().format('MMM D, h:mm:ss a')}`;
    
    if (data.type === 'status_change') {
      updateServiceStatus(data.service, data.status);
      updateSummary(data.overallStatus);
    } else if (data.type === 'new_incident') {
      addNewIncident(data.incident);
    } else if (data.type === 'incident_update') {
      updateIncident(data.incident);
    }
  };
}

function renderServices(services) {
  servicesGrid.innerHTML = Object.entries(services).map(([key, service]) => `
    <div class="service-card" data-service="${key}">
      <h3>${service.name}</h3>
      <span class="status-badge ${service.status}">
        ${STATUS_MAP[service.status].text}
      </span>
      <div class="uptime-chart">
        <canvas id="${key}-chart"></canvas>
      </div>
    </div>
  `).join('');

  // Initialize charts
  Object.keys(services).forEach(service => {
    initUptimeChart(service);
  });
}

function initUptimeChart(service) {
  const ctx = document.getElementById(`${service}-chart`);
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: Array(30).fill().map((_, i) => i + 1),
      datasets: [{
        label: 'Uptime %',
        data: Array(30).fill().map(() => Math.floor(Math.random() * 20) + 80),
        borderColor: '#2ecc71',
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { min: 80, max: 100 } }
    }
  });
}

function renderIncidents(incidents) {
  timeline.innerHTML = incidents.map(incident => `
    <div class="incident-item incident-${incident.severity.toLowerCase()}" data-id="${incident._id}">
      <h3>
        <span class="incident-status">${incident.status.toUpperCase()}</span>
        ${incident.title}
      </h3>
      <p class="incident-meta">
        ${moment(incident.startTime).format('MMM D, YYYY h:mm A')} • 
        ${incident.components.join(', ')}
      </p>
      ${incident.updates.map(update => `
        <div class="incident-update">
          <p class="update-time">${moment(update.timestamp).fromNow()}</p>
          <p>${update.message}</p>
        </div>
      `).join('')}
      <button class="view-details" data-id="${incident._id}">View Details</button>
    </div>
  `).join('');

  // Add event listeners
  document.querySelectorAll('.view-details').forEach(btn => {
    btn.addEventListener('click', () => showIncidentDetails(btn.dataset.id));
  });
}

// Helper functions
function updateServiceStatus(service, status) {
  const badge = document.querySelector(`[data-service="${service}"] .status-badge`);
  badge.className = `status-badge ${status}`;
  badge.textContent = STATUS_MAP[status].text;
}

function updateSummary(status) {
  const headerBadge = document.querySelector('.status-header .status-badge');
  headerBadge.className = `status-badge ${status}`;
  headerBadge.textContent = status === 'operational' 
    ? 'All Systems Operational' 
    : `${STATUS_MAP[status].text} - Some systems are experiencing issues`;
}

function addNewIncident(incident) {
  timeline.insertAdjacentHTML('afterbegin', `
    <div class="incident-item incident-${incident.severity.toLowerCase()}" data-id="${incident._id}">
      <!-- Same structure as renderIncidents -->
    </div>
  `);
}

function showIncidentDetails(id) {
  // Implement modal display for incident details
  console.log('Showing details for incident:', id);
}