export default {
  async fetch(request, env) {
    const url = new URL(request.url);

   // Live D1 dashboard
if (url.pathname === "/" && request.method === "GET") {
  return new Response(LIVE_DASHBOARD_HTML, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=UTF-8",
      "cache-control": "no-store"
    }
  });
}

    // Daily report entry form
    if (url.pathname === "/entry" && request.method === "GET") {
      return new Response(ENTRY_HTML, {
        headers: {
          "content-type": "text/html; charset=UTF-8",
          "cache-control": "no-store"
        }
      });
    }

    // Save daily report
    if (url.pathname === "/api/report" && request.method === "POST") {
      try {
        const data = await request.json();

        const {
          report_date,
          report_type,
          office_name,
          bags_received,
          articles_received,
          articles_issue,
          missent,
          rts,
          deposit,
          delivered,
          remarks
        } = data;

        if (!report_date || !office_name) {
          return Response.json(
            { success: false, error: "Date and office are required." },
            { status: 400 }
          );
        }

        await env.DB.prepare(`
          INSERT INTO delivery_reports (
            report_date,
            report_type,
            office_name,
            bags_received,
            articles_received,
            articles_issue,
            missent,
            rts,
            deposit,
            delivered,
            remarks
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)

ON CONFLICT(report_date, office_name, report_type)
          DO UPDATE SET
            bags_received = excluded.bags_received,
            articles_received = excluded.articles_received,
            articles_issue = excluded.articles_issue,
            missent = excluded.missent,
            rts = excluded.rts,
            deposit = excluded.deposit,
            delivered = excluded.delivered,
            remarks = excluded.remarks
        `)
          .bind(
            report_date,
            report_type,
            office_name,
            Number(bags_received || 0),
            Number(articles_received || 0),
            Number(articles_issue || 0),
            Number(missent || 0),
            Number(rts || 0),
            Number(deposit || 0),
            Number(delivered || 0),
            remarks || ""
          )
          .run();

        return Response.json({
          success: true,
          message: "Delivery report saved successfully."
        });

      } catch (error) {
        return Response.json(
          {
            success: false,
            error: error.message
          },
          { status: 500 }
        );
      }
    }
// Delete a delivery report
if (url.pathname === "/api/report" && request.method === "DELETE") {
  try {
    const data = await request.json();

    const report_date = data.report_date;
    const office_name = data.office_name;
    const report_type = data.report_type;

if (!report_date || !office_name || !report_type) {
      return Response.json(
        { success: false, error: "Date, office and report type are required." },
        { status: 400 }
      );
    }

    const result = await env.DB.prepare(`
      DELETE FROM delivery_reports
WHERE report_date = ? AND office_name = ? AND report_type = ?
    `)
.bind(report_date, office_name, report_type)
      .run();

    return Response.json({
      success: true,
      message: "Delivery report deleted successfully."
    });

  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}
    // Read reports
    if (url.pathname === "/api/reports" && request.method === "GET") {
      try {
        const date = url.searchParams.get("date");

        let result;

        if (date) {
          result = await env.DB.prepare(`
            SELECT *
            FROM delivery_reports
            WHERE report_date = ?
            ORDER BY office_name
          `)
            .bind(date)
            .all();
        } else {
          result = await env.DB.prepare(`
            SELECT *
            FROM delivery_reports
            ORDER BY report_date DESC, office_name
          `).all();
        }

        return Response.json(result.results);

      } catch (error) {
        return Response.json(
          {
            success: false,
            error: error.message
          },
          { status: 500 }
        );
      }
    }

    return new Response("Not Found", { status: 404 });
  }
};

const LIVE_DASHBOARD_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>1st SD Delivery Dashboard</title>

<style>
* { box-sizing: border-box; }

body {
  margin: 0;
  background: #f3f6fa;
  color: #1f2937;
  font-family: Arial, sans-serif;
}

.wrap {
  max-width: 1400px;
  margin: auto;
  padding: 20px;
}

.header {
  background: #173b63;
  color: white;
  padding: 24px 28px;
  border-radius: 15px;
}

.header h1 {
  margin: 0;
  font-size: 26px;
}

.header p {
  margin: 7px 0 0;
}

.controls {
  background: white;
  margin-top: 14px;
  padding: 15px;
  border-radius: 13px;
  display: flex;
  gap: 15px;
  align-items: end;
  flex-wrap: wrap;
}

.control {
  min-width: 220px;
}

label {
  display: block;
  font-size: 11px;
  font-weight: bold;
  color: #64748b;
  margin-bottom: 6px;
}

select, input, button, .entryBtn {
  height: 42px;
  border-radius: 8px;
  border: 1px solid #d7dee8;
  padding: 0 12px;
  font-size: 14px;
}

select, input {
  width: 100%;
  background: white;
}

button {
  background: #173b63;
  color: white;
  font-weight: bold;
  cursor: pointer;
}

.entryBtn {
  display: flex;
  align-items: center;
  text-decoration: none;
  background: #1769e0;
  color: white;
  font-weight: bold;
}

.status {
  margin-top: 12px;
  padding: 11px 14px;
  background: #eaf3fb;
  border-left: 4px solid #4b789d;
  border-radius: 7px;
}

.kpis {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
  margin-top: 14px;
}

.card, .panel {
  background: white;
  border-radius: 13px;
  border: 1px solid #e7edf3;
}

.card {
  padding: 15px;
}

.label {
  font-size: 11px;
  color: #64748b;
  font-weight: bold;
}

.value {
  font-size: 24px;
  font-weight: bold;
  margin-top: 7px;
}

.panel {
  margin-top: 14px;
  padding: 17px;
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 11px 8px;
  border-bottom: 1px solid #edf1f5;
  text-align: right;
  white-space: nowrap;
}

th:first-child, td:first-child {
  text-align: left;
}

th {
  background: #f7f9fc;
  font-size: 11px;
  color: #64748b;
}

.badge {
  padding: 5px 8px;
  border-radius: 15px;
  font-weight: bold;
}

.good {
  background: #dcfce7;
  color: #166534;
}

.mid {
  background: #fef3c7;
  color: #92400e;
}

.low {
  background: #fee2e2;
  color: #991b1b;
}

@media(max-width:1000px) {
  .kpis {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media(max-width:600px) {
  .kpis {
    grid-template-columns: repeat(2, 1fr);
  }

  .control {
    width: 100%;
  }
}
/* ===== MODERN COLOURFUL DASHBOARD THEME ===== */

body {
  background:
    radial-gradient(circle at top left, #dbeafe 0, transparent 35%),
    radial-gradient(circle at top right, #ede9fe 0, transparent 35%),
    linear-gradient(135deg, #f8fbff, #f5f3ff);
  color: #1e293b;
  min-height: 100vh;
}

/* Main Container */
.wrap {
  max-width: 1450px;
  margin: auto;
  padding: 24px;
}

/* Header */
.header {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #2563eb 0%, #4f46e5 45%, #7c3aed 100%);
  color: white;
  border-radius: 22px;
  padding: 28px 30px;
  margin-bottom: 24px;
  box-shadow: 0 15px 35px rgba(79, 70, 229, 0.25);
}

.header::after {
  content: "";
  position: absolute;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: rgba(255,255,255,0.10);
  right: -50px;
  top: -70px;
}

.header h1 {
  margin: 0;
  font-size: 30px;
  font-weight: 800;
  letter-spacing: 0.5px;
}

.header p {
  margin: 8px 0 0;
  font-size: 15px;
  color: #e0e7ff;
}

/* Filters / Controls */
.controls {
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(10px);
  padding: 20px;
  border-radius: 18px;
  box-shadow: 0 8px 24px rgba(15,23,42,0.08);
  border: 1px solid #e2e8f0;
  margin-bottom: 22px;
}

.control label {
  display: block;
  font-size: 12px;
  font-weight: 800;
  color: #475569;
  margin-bottom: 7px;
  letter-spacing: 0.5px;
}

.control input,
.control select {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  background: #ffffff;
  color: #0f172a;
  font-size: 14px;
  outline: none;
  transition: all 0.25s ease;
}

.control input:focus,
.control select:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 4px rgba(99,102,241,0.12);
}

/* Cards */
.card,
.stat-card {
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 8px 24px rgba(15,23,42,0.07);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card:hover,
.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 30px rgba(79,70,229,0.12);
}

/* Table Container */
.table-wrap,
.table-container {
  background: white;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(15,23,42,0.08);
  border: 1px solid #e2e8f0;
}

/* Table */
table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

thead th {
  background: linear-gradient(135deg, #1e40af, #4338ca);
  color: white;
  padding: 14px 12px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  border: none;
}

tbody td {
  padding: 13px 12px;
  border-bottom: 1px solid #eef2f7;
  font-size: 13px;
  color: #334155;
}

tbody tr:nth-child(even) {
  background: #f8fafc;
}

tbody tr:hover {
  background: #eef2ff;
}

/* Buttons */
button,
.btn {
  border: none;
  border-radius: 12px;
  padding: 11px 18px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

button:hover,
.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 15px rgba(0,0,0,0.15);
}

/* Links */
a {
  transition: all 0.2s ease;
}

/* Percentage / Status cells */
.good,
.success {
  color: #15803d;
  background: #dcfce7;
  font-weight: 700;
  border-radius: 8px;
  padding: 5px 8px;
}

.warning {
  color: #a16207;
  background: #fef9c3;
  font-weight: 700;
  border-radius: 8px;
  padding: 5px 8px;
}

.danger,
.bad {
  color: #b91c1c;
  background: #fee2e2;
  font-weight: 700;
  border-radius: 8px;
  padding: 5px 8px;
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-thumb {
  background: linear-gradient(#6366f1, #8b5cf6);
  border-radius: 10px;
}

::-webkit-scrollbar-track {
  background: #eef2ff;
}

/* Mobile */
@media (max-width: 768px) {
  .wrap {
    padding: 12px;
  }

  .header {
    padding: 22px 18px;
    border-radius: 16px;
  }

  .header h1 {
    font-size: 22px;
  }

  .controls {
    padding: 14px;
  }

  table {
    min-width: 900px;
  }
}
</style>
</head>

<body>

<div class="wrap">

  <div class="header">
    <h1>DAILY DELIVERY REPORT - 1st SUB DIVISION</h1>
    <p>Office-wise Delivery Performance</p>
  </div>

  <div class="controls">

    <div class="control">
      <label>REPORT DATE</label>
      <select id="date"></select>
    </div>
<div class="control">
    <label>REPORT TYPE</label>
    <select id="reportTypeFilter">
        <option value="Overall">Overall Report</option>
        <option value="24 SP">24 SP Report</option>
    </select>
</div>
    <div class="control">
      <label>OFFICE SEARCH</label>
      <input id="search" placeholder="Search office...">
    </div>

    <button id="clear">Clear</button>

    

  </div>

  <div class="status" id="status">
    Loading data from D1 database...
  </div>

  <div class="kpis">

    <div class="card">
      <div class="label">ARTICLES RECEIVED</div>
      <div class="value" id="received">0</div>
    </div>

    <div class="card">
      <div class="label">ARTICLES ISSUED</div>
      <div class="value" id="issued">0</div>
    </div>

    <div class="card">
      <div class="label">ARTICLES DELIVERED</div>
      <div class="value" id="delivered">0</div>
    </div>

    <div class="card">
      <div class="label">AVERAGE DELIVERY</div>
      <div class="value" id="average">0.00%</div>
    </div>

    <div class="card">
      <div class="label">MISSENT</div>
      <div class="value" id="missent">0</div>
    </div>

    <div class="card">
      <div class="label">RTS</div>
      <div class="value" id="rts">0</div>
    </div>

  </div>

  <div class="panel">

    <h2>Office-wise Performance <span id="count"></span></h2>

    <table>
      <thead>
        <tr>
          <th>Office</th>
          <th>Received</th>
          <th>Issued</th>
          <th>Delivered</th>
          <th>Delivery %</th>
          <th>Missent %</th>
          <th>RTS %</th>
          <th>Delivery % (RTS)</th>
          <th>Remarks</th>
        </tr>
      </thead>

      <tbody id="tbody"></tbody>
    </table>

  </div>

</div>

<script>
var allData = [];

function n(value) {
  return Number(value || 0);
}

function percent(value, total) {
  if (!total) return 0;
  return (value / total) * 100;
}

function formatNumber(value) {
  return n(value).toLocaleString('en-IN');
}

function formatDate(value) {
  var p = value.split('-');
  if (p.length !== 3) return value;
  return p[2] + '/' + p[1] + '/' + p[0];
}

function badgeClass(value) {
  if (value >= 95) return 'good';
  if (value >= 85) return 'mid';
  return 'low';
}

async function loadData() {
  var status = document.getElementById('status');

  try {
    var response = await fetch('/api/reports');

    if (!response.ok) {
      throw new Error('Unable to read database');
    }

    allData = await response.json();

    if (!Array.isArray(allData)) {
      allData = [];
    }

    var dates = [];

    allData.forEach(function(row) {
      if (row.report_date && dates.indexOf(row.report_date) === -1) {
        dates.push(row.report_date);
      }
    });

    dates.sort().reverse();

    var dateSelect = document.getElementById('date');
    dateSelect.innerHTML = '';

    dates.forEach(function(date) {
      var option = document.createElement('option');
      option.value = date;
      option.textContent = formatDate(date);
      dateSelect.appendChild(option);
    });

    if (dates.length === 0) {
      var option = document.createElement('option');
      option.value = '';
      option.textContent = 'No Data';
      dateSelect.appendChild(option);

      status.textContent =
        'Database connected, but no report is available.';
    } else {
      dateSelect.value = dates[0];
      status.textContent = 'Live data connected to D1 database.';
    }

    render();

  } catch (error) {
    status.textContent =
      'Error loading report: ' + error.message;
  }
}

function render() {
  var selectedDate = document.getElementById('date').value;
var selectedReportType =
  document.getElementById('reportTypeFilter').value;
  var search =
    document.getElementById('search').value.trim().toLowerCase();

  var rows = allData.filter(function(row) {
    var correctDate = row.report_date === selectedDate;
var correctReportType =
  (row.report_type || 'Overall') === selectedReportType;
    var correctOffice =
      !search ||
      String(row.office_name || '')
        .toLowerCase()
        .indexOf(search) !== -1;

return correctDate && correctReportType && correctOffice;
  });

  var totalReceived = 0;
  var totalIssued = 0;
  var totalDelivered = 0;
  var totalMissent = 0;
  var totalRts = 0;

  var deliveryPercentages = [];

  rows.forEach(function(row) {
    totalReceived += n(row.articles_received);
    totalIssued += n(row.articles_issue);
    totalDelivered += n(row.delivered);
    totalMissent += n(row.missent);
    totalRts += n(row.rts);

    if (n(row.articles_issue) > 0) {
      deliveryPercentages.push(
        percent(n(row.delivered), n(row.articles_issue))
      );
    }
  });

  var average = 0;

  if (deliveryPercentages.length > 0) {
    average =
      deliveryPercentages.reduce(function(a, b) {
        return a + b;
      }, 0) / deliveryPercentages.length;
  }

  document.getElementById('received').textContent =
    formatNumber(totalReceived);

  document.getElementById('issued').textContent =
    formatNumber(totalIssued);

  document.getElementById('delivered').textContent =
    formatNumber(totalDelivered);

  document.getElementById('missent').textContent =
    formatNumber(totalMissent);

  document.getElementById('rts').textContent =
    formatNumber(totalRts);

  document.getElementById('average').textContent =
    average.toFixed(2) + '%';

  document.getElementById('count').textContent =
    '(' + rows.length + ' offices)';

  var tbody = document.getElementById('tbody');
  tbody.innerHTML = '';

  rows.forEach(function(row) {
    var received = n(row.articles_received);
    var issued = n(row.articles_issue);
    var delivered = n(row.delivered);
    var missent = n(row.missent);
    var rts = n(row.rts);

    var deliveryPct = percent(delivered, issued);
    var missentPct = percent(missent, received);
    var rtsPct = percent(rts, received);
    var deliveryRtsPct = percent(delivered + rts, issued);

    var tr = document.createElement('tr');

    tr.innerHTML =
      '<td><b>' + String(row.office_name || '') + '</b></td>' +
      '<td>' + formatNumber(received) + '</td>' +
      '<td>' + formatNumber(issued) + '</td>' +
      '<td>' + formatNumber(delivered) + '</td>' +
      '<td><span class="badge ' +
      badgeClass(deliveryPct) + '">' +
      deliveryPct.toFixed(2) + '%</span></td>' +
      '<td>' + missentPct.toFixed(2) + '%</td>' +
      '<td>' + rtsPct.toFixed(2) + '%</td>' +
     '<td>' + deliveryRtsPct.toFixed(2) + '%</td>' +
'<td>' + String(row.remarks || '') + '</td>';

    tbody.appendChild(tr);
  });
}

document.getElementById('date')
  .addEventListener('change', render);
document.getElementById('reportTypeFilter')
  .addEventListener('change', render);
document.getElementById('search')
  .addEventListener('input', render);

document.getElementById('clear')
  .addEventListener('click', function() {
    document.getElementById('search').value = '';
    render();
  });

loadData();
</script>

</body>
</html>
`;

const ENTRY_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <title>1st SD Daily Delivery Report</title>

  <style>
    body {
      font-family: Arial, sans-serif;
      background: #f4f7fb;
      margin: 0;
      padding: 25px;
    }

    .container {
      max-width: 850px;
      margin: auto;
      background: white;
      padding: 25px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    }

    h1 {
      text-align: center;
      margin-top: 0;
    }

    .subtitle {
      text-align: center;
      color: #555;
      margin-bottom: 25px;
    }

    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }

    label {
      font-weight: bold;
      display: block;
      margin-bottom: 5px;
    }

    input,
    select,
    textarea {
      width: 100%;
      padding: 11px;
      box-sizing: border-box;
      border: 1px solid #ccc;
      border-radius: 6px;
      font-size: 15px;
    }

    textarea {
      resize: vertical;
    }

    .full {
      grid-column: 1 / -1;
    }

    button {
      width: 100%;
      padding: 14px;
      margin-top: 20px;
      border: 0;
      border-radius: 7px;
      background: #1769e0;
      color: white;
      font-size: 17px;
      font-weight: bold;
      cursor: pointer;
    }

    button:hover {
      background: #0f56bd;
    }

    .result {
      margin-top: 20px;
      padding: 15px;
      border-radius: 7px;
      display: none;
      text-align: center;
      font-weight: bold;
    }

    .success {
      background: #e6f7ea;
      color: #137333;
    }

    .error {
      background: #fde8e7;
      color: #b3261e;
    }

    .calculations {
      margin-top: 20px;
      background: #f3f6fa;
      padding: 15px;
      border-radius: 8px;
    }

    .calc-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      text-align: center;
    }

    .calc-box {
      background: white;
      padding: 12px 5px;
      border-radius: 7px;
    }

    .calc-title {
      font-size: 12px;
      color: #666;
    }

    .calc-value {
      font-size: 18px;
      font-weight: bold;
      margin-top: 4px;
    }

    @media (max-width: 650px) {
      .grid {
        grid-template-columns: 1fr;
      }

      .full {
        grid-column: auto;
      }

      .calc-grid {
        grid-template-columns: 1fr 1fr;
      }
    }
  </style>
</head>

<body>

<div class="container">

  <h1>1st SD Daily Delivery Report</h1>
  <div class="subtitle">
    Daily Data Entry
  </div>

  <form id="reportForm">

    <div class="grid">

      <div>
        <label>Date</label>
        <input type="date" id="report_date" required>
      </div>
<div>
    <label>Report Type</label>
    <select id="report_type" required>
        <option value="Overall">Overall Report</option>
        <option value="24 SP">24 SP Report</option>
    </select>
</div>
      <div>
        <label>Office</label>
        <select id="office_name" required>
          <option value="">Select Office</option>
          <option>IDC SRT Nagar PO</option>
          <option>Rashtrapati Bhawan PO</option>
          <option>UPSC PO</option>
          <option>Nodal Delivery Centre</option>
        </select>
      </div>

      <div>
        <label>Bags Received</label>
        <input type="number" id="bags_received" min="0" value="0">
      </div>

      <div>
        <label>Articles Received</label>
        <input type="number" id="articles_received" min="0" value="0">
      </div>

      <div>
        <label>Articles Issue</label>
        <input type="number" id="articles_issue" min="0" value="0">
      </div>

      <div>
        <label>Missent</label>
        <input type="number" id="missent" min="0" value="0">
      </div>

      <div>
        <label>RTS</label>
        <input type="number" id="rts" min="0" value="0">
      </div>

      <div>
        <label>Deposit</label>
        <input type="number" id="deposit" min="0" value="0">
      </div>

      <div>
        <label>Delivered</label>
        <input type="number" id="delivered" min="0" value="0">
      </div>

      <div class="full">
        <label>Remarks</label>
        <textarea id="remarks" rows="3"></textarea>
      </div>

    </div>

    <div class="calculations">

      <div class="calc-grid">

        <div class="calc-box">
          <div class="calc-title">Missent %</div>
          <div class="calc-value" id="missentPercent">0.00%</div>
        </div>

        <div class="calc-box">
          <div class="calc-title">RTS %</div>
          <div class="calc-value" id="rtsPercent">0.00%</div>
        </div>

        <div class="calc-box">
          <div class="calc-title">Delivery %</div>
          <div class="calc-value" id="deliveryPercent">0.00%</div>
        </div>

        <div class="calc-box">
          <div class="calc-title">Delivery % incl. RTS</div>
          <div class="calc-value" id="deliveryRtsPercent">0.00%</div>
        </div>

      </div>

    </div>

    <button type="submit">
      Save Delivery Report
    </button>
<button type="button" id="deleteBtn" style="background:#dc2626; margin-top:12px;">
  Delete Entry
</button>
  </form>

  <div id="result" class="result"></div>

</div>


<script>

const ids = [
  "articles_received",
  "articles_issue",
  "missent",
  "rts",
  "delivered"
];

ids.forEach(id => {
  document.getElementById(id).addEventListener("input", calculate);
});


function num(id) {
  return Number(document.getElementById(id).value || 0);
}


function calculate() {

  const received = num("articles_received");
  const issue = num("articles_issue");
  const missent = num("missent");
  const rts = num("rts");
  const delivered = num("delivered");

  const missentPercent =
    received > 0 ? missent / received * 100 : 0;

  const rtsPercent =
    received > 0 ? rts / received * 100 : 0;

  const deliveryPercent =
    issue > 0 ? delivered / issue * 100 : 0;

  const deliveryRtsPercent =
    issue > 0 ? (delivered + rts) / issue * 100 : 0;

  document.getElementById("missentPercent").textContent =
    missentPercent.toFixed(2) + "%";

  document.getElementById("rtsPercent").textContent =
    rtsPercent.toFixed(2) + "%";

  document.getElementById("deliveryPercent").textContent =
    deliveryPercent.toFixed(2) + "%";

  document.getElementById("deliveryRtsPercent").textContent =
    deliveryRtsPercent.toFixed(2) + "%";
}


document.getElementById("report_date").value =
  new Date().toISOString().split("T")[0];


document.getElementById("reportForm").addEventListener(
  "submit",
  async function(event) {

    event.preventDefault();

    const resultBox = document.getElementById("result");

    const data = {
      report_date:
        document.getElementById("report_date").value,

report_type:
    document.getElementById("report_type").value,
      office_name:
        document.getElementById("office_name").value,

      bags_received:
        num("bags_received"),

      articles_received:
        num("articles_received"),

      articles_issue:
        num("articles_issue"),

      missent:
        num("missent"),

      rts:
        num("rts"),

      deposit:
        num("deposit"),

      delivered:
        num("delivered"),

      remarks:
        document.getElementById("remarks").value
    };

    try {

      const response = await fetch("/api/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      resultBox.style.display = "block";

      if (result.success) {

        resultBox.className = "result success";

        resultBox.textContent =
          "✓ Delivery report saved successfully.";

      } else {

        resultBox.className = "result error";

        resultBox.textContent =
          "Error: " + result.error;
      }

    } catch (error) {

      resultBox.style.display = "block";
      resultBox.className = "result error";

      resultBox.textContent =
        "Unable to save report.";
    }
  }
);
document.getElementById("deleteBtn").addEventListener("click", async function () {

  const report_date = document.getElementById("report_date").value;
  const office_name = document.getElementById("office_name").value;
  const report_type = document.getElementById("report_type").value;
  const resultBox = document.getElementById("result");

if (!report_date || !office_name || !report_type) {
alert("Please select Date, Report Type and Office first.");
    return;
  }

  const confirmDelete = confirm(
    "Are you sure you want to delete the report for " +
    office_name +
    " dated " +
    report_date +
    "?"
  );

  if (!confirmDelete) {
    return;
  }

  try {
    const response = await fetch("/api/report", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        report_date: report_date,
        office_name: office_name,
        report_type: report_type
      })
    });

    const result = await response.json();

    resultBox.style.display = "block";

    if (result.success) {
      resultBox.className = "result success";
      resultBox.textContent = "✓ Delivery report deleted successfully.";
    } else {
      resultBox.className = "result error";
      resultBox.textContent = "Error: " + result.error;
    }

  } catch (error) {
    resultBox.style.display = "block";
    resultBox.className = "result error";
    resultBox.textContent = "Unable to delete report.";
  }
});
</script>

</body>
</html>
`;

const DASHBOARD_BASE64 = "PCFkb2N0eXBlIGh0bWw+PGh0bWwgbGFuZz0iZW4iPjxoZWFkPjxtZXRhIGNoYXJzZXQ9InV0Zi04Ij4KPG1ldGEgbmFtZT0idmlld3BvcnQiIGNvbnRlbnQ9IndpZHRoPWRldmljZS13aWR0aCxpbml0aWFsLXNjYWxlPTEiPjx0aXRsZT4xc3QgU0QgRGVsaXZlcnkgRGFzaGJvYXJkPC90aXRsZT4KPHN0eWxlPgoqe2JveC1zaXppbmc6Ym9yZGVyLWJveH1ib2R5e21hcmdpbjowO2JhY2tncm91bmQ6I2YzZjZmYTtjb2xvcjojMWYyOTM3O2ZvbnQtZmFtaWx5OlNlZ29lIFVJLEFyaWFsLHNhbnMtc2VyaWZ9Ci53cmFwe21heC13aWR0aDoxNDAwcHg7bWFyZ2luOmF1dG87cGFkZGluZzoyMHB4fS5oZWFke2JhY2tncm91bmQ6IzE3M2I2Mztjb2xvcjojZmZmO2JvcmRlci1yYWRpdXM6MTVweDtwYWRkaW5nOjIzcHggMjdweH0KaDF7bWFyZ2luOjA7Zm9udC1zaXplOjI1cHh9LmhlYWQgcHttYXJnaW46NnB4IDAgMDtvcGFjaXR5Oi44NX0uY29udHJvbHMsLnBhbmVsLC5jYXJke2JhY2tncm91bmQ6I2ZmZjtib3JkZXI6MXB4IHNvbGlkICNlN2VkZjM7Ym9yZGVyLXJhZGl1czoxM3B4O2JveC1zaGFkb3c6MCAzcHggMTRweCAjMDAwMDAwMGF9Ci5jb250cm9sc3ttYXJnaW4tdG9wOjE0cHg7cGFkZGluZzoxNXB4O2Rpc3BsYXk6ZmxleDtnYXA6MTRweDthbGlnbi1pdGVtczplbmQ7ZmxleC13cmFwOndyYXB9bGFiZWx7Zm9udC1zaXplOjExcHg7Zm9udC13ZWlnaHQ6ODAwO2NvbG9yOiM2NDc0OGI7ZGlzcGxheTpibG9jazttYXJnaW4tYm90dG9tOjZweDt0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2V9CnNlbGVjdCxpbnB1dCxidXR0b257aGVpZ2h0OjQwcHg7Ym9yZGVyOjFweCBzb2xpZCAjZDdkZWU4O2JvcmRlci1yYWRpdXM6OHB4O3BhZGRpbmc6MCAxMXB4O2JhY2tncm91bmQ6I2ZmZn1zZWxlY3QsaW5wdXR7bWluLXdpZHRoOjIyMHB4fWJ1dHRvbntiYWNrZ3JvdW5kOiMxNzNiNjM7Y29sb3I6I2ZmZjtmb250LXdlaWdodDo3MDB9Ci5rcGlze2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDYsMWZyKTtnYXA6MTJweDttYXJnaW4tdG9wOjE0cHh9LmNhcmR7cGFkZGluZzoxNXB4fS5sYWJ7Zm9udC1zaXplOjExcHg7Y29sb3I6IzY0NzQ4Yjtmb250LXdlaWdodDo3MDA7dGV4dC10cmFuc2Zvcm06dXBwZXJjYXNlfS52YWx7Zm9udC1zaXplOjI0cHg7Zm9udC13ZWlnaHQ6ODAwO21hcmdpbi10b3A6N3B4fQoubm90ZXttYXJnaW4tdG9wOjEycHg7cGFkZGluZzoxMHB4IDEzcHg7YmFja2dyb3VuZDojZWFmM2ZiO2JvcmRlci1sZWZ0OjRweCBzb2xpZCAjNGI3ODlkO2JvcmRlci1yYWRpdXM6N3B4O2ZvbnQtc2l6ZToxMnB4fQouZ3JpZHtkaXNwbGF5OmdyaWQ7Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOjEuN2ZyIC43NWZyO2dhcDoxNHB4O21hcmdpbi10b3A6MTRweH0ucGFuZWx7cGFkZGluZzoxN3B4O21hcmdpbi1ib3R0b206MTRweH1oMntmb250LXNpemU6MTdweDttYXJnaW46MCAwIDEzcHh9CnRhYmxle3dpZHRoOjEwMCU7Ym9yZGVyLWNvbGxhcHNlOmNvbGxhcHNlO2ZvbnQtc2l6ZToxM3B4fXRoLHRke3BhZGRpbmc6MTBweCA3cHg7Ym9yZGVyLWJvdHRvbToxcHggc29saWQgI2VkZjFmNTt0ZXh0LWFsaWduOnJpZ2h0fXRoOmZpcnN0LWNoaWxkLHRkOmZpcnN0LWNoaWxke3RleHQtYWxpZ246bGVmdH10aHtiYWNrZ3JvdW5kOiNmN2Y5ZmM7Y29sb3I6IzY0NzQ4Yjtmb250LXNpemU6MTBweDt0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2V9Ci5iYWRnZXtkaXNwbGF5OmlubGluZS1ibG9jaztwYWRkaW5nOjRweCA4cHg7Ym9yZGVyLXJhZGl1czo5OTlweDtmb250LXNpemU6MTFweDtmb250LXdlaWdodDo4MDB9Lmdvb2R7YmFja2dyb3VuZDojZGNmY2U3O2NvbG9yOiMxNjY1MzR9Lm1pZHtiYWNrZ3JvdW5kOiNmZWYzYzc7Y29sb3I6IzkyNDAwZX0ubG93e2JhY2tncm91bmQ6I2ZlZTJlMjtjb2xvcjojOTkxYjFifQoucmFua3tkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2dhcDo4cHg7cGFkZGluZzo5cHggMDtib3JkZXItYm90dG9tOjFweCBzb2xpZCAjZWRmMWY1fS5yYW5rbmFtZXtmbGV4OjE7Zm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6NzAwfS5yYW5rcGN0e2ZvbnQtd2VpZ2h0OjgwMDtmb250LXNpemU6MTJweH0uYmFye2hlaWdodDo3cHg7YmFja2dyb3VuZDojZWRmMWY1O2JvcmRlci1yYWRpdXM6N3B4O292ZXJmbG93OmhpZGRlbjttYXJnaW4tdG9wOjVweH0uZmlsbHtoZWlnaHQ6MTAwJTtiYWNrZ3JvdW5kOiM0Yjc4OWR9CkBtZWRpYShtYXgtd2lkdGg6MTEwMHB4KXsua3Bpc3tncmlkLXRlbXBsYXRlLWNvbHVtbnM6cmVwZWF0KDMsMWZyKX0uZ3JpZHtncmlkLXRlbXBsYXRlLWNvbHVtbnM6MWZyfX1AbWVkaWEobWF4LXdpZHRoOjY1MHB4KXsud3JhcHtwYWRkaW5nOjEwcHh9LmtwaXN7Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOnJlcGVhdCgyLDFmcil9fQo8L3N0eWxlPjwvaGVhZD48Ym9keT48ZGl2IGNsYXNzPSJ3cmFwIj4KPGRpdiBjbGFzcz0iaGVhZCI+PGgxPkRBSUxZIERFTElWRVJZIFJFUE9SVCDigJMgMXN0IFNVQiBESVZJU0lPTjwvaDE+PHA+T2ZmaWNlLXdpc2UgRGVsaXZlcnkgUGVyZm9ybWFuY2U8L3A+PC9kaXY+CjxkaXYgY2xhc3M9ImNvbnRyb2xzIj48ZGl2PjxsYWJlbD5SZXBvcnQgRGF0ZTwvbGFiZWw+PHNlbGVjdCBpZD0iZGF0ZSI+PC9zZWxlY3Q+PC9kaXY+PGRpdj48bGFiZWw+T2ZmaWNlIFNlYXJjaDwvbGFiZWw+PGlucHV0IGlkPSJzZWFyY2giIHBsYWNlaG9sZGVyPSJTZWFyY2ggb2ZmaWNlLi4uIj48L2Rpdj48YnV0dG9uIGlkPSJjbGVhciI+Q2xlYXI8L2J1dHRvbj48L2Rpdj4KPGRpdiBjbGFzcz0ibm90ZSI+PGI+Q29ycmVjdGVkOjwvYj4gRGVsaXZlcnkgJSBpcyBub3cgZGlzcGxheWVkIGV4YWN0bHkgZnJvbSB5b3VyIEV4Y2VsJ3MgPGI+RGVsaXZlcnkgcGVyY2VudGFnZTwvYj4gZm9ybXVsYTogPGI+RGVsaXZlcmVkIMO3IEFydGljbGVzIElzc3VlZDwvYj4uIFRoZSBkYXNoYm9hcmQncyBvdmVyYWxsIHBlcmNlbnRhZ2UgdXNlcyB5b3VyIEV4Y2VsJ3MgPGI+QXZlcmFnZSBEZWxpdmVyeTwvYj4gdmFsdWUuPC9kaXY+CjxkaXYgY2xhc3M9ImtwaXMiPgo8ZGl2IGNsYXNzPSJjYXJkIj48ZGl2IGNsYXNzPSJsYWIiPkFydGljbGVzIFJlY2VpdmVkPC9kaXY+PGRpdiBjbGFzcz0idmFsIiBpZD0icmVjZWl2ZWQiPjA8L2Rpdj48L2Rpdj4KPGRpdiBjbGFzcz0iY2FyZCI+PGRpdiBjbGFzcz0ibGFiIj5BcnRpY2xlcyBJc3N1ZWQ8L2Rpdj48ZGl2IGNsYXNzPSJ2YWwiIGlkPSJpc3N1ZWQiPjA8L2Rpdj48L2Rpdj4KPGRpdiBjbGFzcz0iY2FyZCI+PGRpdiBjbGFzcz0ibGFiIj5BcnRpY2xlcyBEZWxpdmVyZWQ8L2Rpdj48ZGl2IGNsYXNzPSJ2YWwiIGlkPSJkZWxpdmVyZWQiPjA8L2Rpdj48L2Rpdj4KPGRpdiBjbGFzcz0iY2FyZCI+PGRpdiBjbGFzcz0ibGFiIj5BdmVyYWdlIERlbGl2ZXJ5PC9kaXY+PGRpdiBjbGFzcz0idmFsIiBpZD0ib3ZlcmFsbCI+4oCUPC9kaXY+PC9kaXY+CjxkaXYgY2xhc3M9ImNhcmQiPjxkaXYgY2xhc3M9ImxhYiI+TWlzc2VudDwvZGl2PjxkaXYgY2xhc3M9InZhbCIgaWQ9Im1pc3NlbnQiPjA8L2Rpdj48L2Rpdj4KPGRpdiBjbGFzcz0iY2FyZCI+PGRpdiBjbGFzcz0ibGFiIj5SVFM8L2Rpdj48ZGl2IGNsYXNzPSJ2YWwiIGlkPSJydHMiPjA8L2Rpdj48L2Rpdj4KPC9kaXY+CjxkaXYgY2xhc3M9ImdyaWQiPjxkaXYgY2xhc3M9InBhbmVsIj48aDI+T2ZmaWNlLXdpc2UgUGVyZm9ybWFuY2UgPHNwYW4gaWQ9ImNvdW50IiBzdHlsZT0iZm9udC1zaXplOjExcHg7Y29sb3I6IzY0NzQ4YiI+PC9zcGFuPjwvaDI+Cjx0YWJsZT48dGhlYWQ+PHRyPjx0aD5PZmZpY2U8L3RoPjx0aD5SZWNlaXZlZDwvdGg+PHRoPklzc3VlZDwvdGg+PHRoPkRlbGl2ZXJlZDwvdGg+PHRoPkRlbGl2ZXJ5ICU8L3RoPjx0aD5NaXNzZW50ICU8L3RoPjx0aD5SVFMgJTwvdGg+PHRoPkRlbGl2ZXJ5ICUgKFJUUyk8L3RoPjwvdHI+PC90aGVhZD48dGJvZHkgaWQ9ImJvZHkiPjwvdGJvZHk+PC90YWJsZT48L2Rpdj4KPGRpdj48ZGl2IGNsYXNzPSJwYW5lbCI+PGgyPlRvcCBQZXJmb3JtaW5nIE9mZmljZXM8L2gyPjxkaXYgaWQ9InJhbmsiPjwvZGl2PjwvZGl2Pgo8ZGl2IGNsYXNzPSJwYW5lbCI+PGgyPkV4Y2VsIENhbGN1bGF0aW9uPC9oMj48ZGl2IHN0eWxlPSJmb250LXNpemU6MTNweDtsaW5lLWhlaWdodDoxLjgiPgo8Yj5EZWxpdmVyeSAlPC9iPjxicj5EZWxpdmVyZWQgw7cgQXJ0aWNsZXMgSXNzdWVkIMOXIDEwMDxicj48YnI+CjxiPk1pc3NlbnQgJTwvYj48YnI+TWlzc2VudCDDtyBBcnRpY2xlcyBSZWNlaXZlZCDDlyAxMDA8YnI+PGJyPgo8Yj5SVFMgJTwvYj48YnI+UlRTIMO3IEFydGljbGVzIFJlY2VpdmVkIMOXIDEwMDxicj48YnI+CjxiPkRlbGl2ZXJ5ICUgKFJUUyk8L2I+PGJyPihSVFMgKyBEZWxpdmVyZWQpIMO3IEFydGljbGVzIElzc3VlZCDDlyAxMDAKPC9kaXY+PC9kaXY+PC9kaXY+PC9kaXY+PC9kaXY+CjxzY3JpcHQ+CmNvbnN0IERBVEE9W3siZGF0ZSI6ICIyMDI2LTA3LTMxIiwgIm9mZmljZSI6ICJJREMgU1JUIE5hZ2FyIFBPIiwgImJhZ3MiOiAzMS4wLCAicmVjZWl2ZWQiOiA0MjY0LjAsICJpc3N1ZWQiOiA0MTI2LjAsICJtaXNzZW50IjogMTM4LjAsICJtaXNzZW50X3BjdCI6IDMuMjM2Mzk3NzQ5LCAicnRzIjogMzA0LjAsICJydHNfcGN0IjogNy4xMjk0NTU5MSwgImRlcG9zaXQiOiA5Mi4wLCAiZGVsaXZlcmVkIjogMzg1Ni4wLCAiZGVsaXZlcnlfcGN0IjogOTMuNDU2MTMxODUsICJkZWxpdmVyeV9ydHNfcGN0IjogMS4wMDgyNDA0Mjd9LCB7ImRhdGUiOiAiMjAyNi0wNy0zMSIsICJvZmZpY2UiOiAiUmFzaHRyYXBhdGkgQmhhd2FuIFBPIiwgImJhZ3MiOiA0LjAsICJyZWNlaXZlZCI6IDE4Ny4wLCAiaXNzdWVkIjogMTg1LjAsICJtaXNzZW50IjogMi4wLCAibWlzc2VudF9wY3QiOiAxLjA2OTUxODcxNywgInJ0cyI6IDQuMCwgInJ0c19wY3QiOiAyLjEzOTAzNzQzMywgImRlcG9zaXQiOiAwLjAsICJkZWxpdmVyZWQiOiAxODEuMCwgImRlbGl2ZXJ5X3BjdCI6IDk3LjgzNzgzNzgzOTk5OTk5LCAiZGVsaXZlcnlfcnRzX3BjdCI6IDEwMC4wfSwgeyJkYXRlIjogIjIwMjYtMDctMzEiLCAib2ZmaWNlIjogIlVQU0MgUE8iLCAiYmFncyI6IDguMCwgInJlY2VpdmVkIjogOTYuMCwgImlzc3VlZCI6IDk1LjAsICJtaXNzZW50IjogMS4wLCAibWlzc2VudF9wY3QiOiAxLjA0MTY2NjY2Njk5OTk5OTksICJydHMiOiAxLjAsICJydHNfcGN0IjogMS4wNDE2NjY2NjY5OTk5OTk5LCAiZGVwb3NpdCI6IDAuMCwgImRlbGl2ZXJlZCI6IDk0LjAsICJkZWxpdmVyeV9wY3QiOiA5OC45NDczNjg0MiwgImRlbGl2ZXJ5X3J0c19wY3QiOiAxMDAuMH0sIHsiZGF0ZSI6ICIyMDI2LTA3LTMxIiwgIm9mZmljZSI6ICJOb2RhbCBEZWxpdmVyeSBDZW50cmUiLCAiYmFncyI6IDE2OS4wLCAicmVjZWl2ZWQiOiAyMTcwLjAsICJpc3N1ZWQiOiAyMTUxLjAsICJtaXNzZW50IjogMzcuMCwgIm1pc3NlbnRfcGN0IjogMS43MDUwNjkxMjQsICJydHMiOiA2OC4wLCAicnRzX3BjdCI6IDMuMTMzNjQwNTUzLCAiZGVwb3NpdCI6IDIzLjAsICJkZWxpdmVyZWQiOiAyMDYwLjAsICJkZWxpdmVyeV9wY3QiOiA5NS43Njk0MDk1OCwgImRlbGl2ZXJ5X3J0c19wY3QiOiA5OC45MzA3Mjk4OTAwMDAwMX0sIHsiZGF0ZSI6ICIyMDI2LTA4LTAxIiwgIm9mZmljZSI6ICJJREMgU1JUIE5hZ2FyIFBPIiwgImJhZ3MiOiAyMy4wLCAicmVjZWl2ZWQiOiAyMzE1LjAsICJpc3N1ZWQiOiAxOTcwLjAsICJtaXNzZW50IjogMTA1LjAsICJtaXNzZW50X3BjdCI6IDQuNTM1NjM3MTQ5LCAicnRzIjogMjAxLjAsICJydHNfcGN0IjogOC42ODI1MDU0LCAiZGVwb3NpdCI6IDg3LjAsICJkZWxpdmVyZWQiOiAxNjY5LjAsICJkZWxpdmVyeV9wY3QiOiA4NC43MjA4MTIxODAwMDAwMSwgImRlbGl2ZXJ5X3J0c19wY3QiOiA5NC45MjM4NTc4Njk5OTk5OX0sIHsiZGF0ZSI6ICIyMDI2LTA4LTAxIiwgIm9mZmljZSI6ICJSYXNodHJhcGF0aSBCaGF3YW4gUE8iLCAiYmFncyI6IDYuMCwgInJlY2VpdmVkIjogMTg1LjAsICJpc3N1ZWQiOiAxODUuMCwgIm1pc3NlbnQiOiAwLjAsICJtaXNzZW50X3BjdCI6IDAuMCwgInJ0cyI6IDAuMCwgInJ0c19wY3QiOiAwLjAsICJkZXBvc2l0IjogMC4wLCAiZGVsaXZlcmVkIjogMTg1LjAsICJkZWxpdmVyeV9wY3QiOiAxMDAuMCwgImRlbGl2ZXJ5X3J0c19wY3QiOiAxMDAuMH0sIHsiZGF0ZSI6ICIyMDI2LTA4LTAxIiwgIm9mZmljZSI6ICJVUFNDIFBPIiwgImJhZ3MiOiA3LjAsICJyZWNlaXZlZCI6IDEwLjAsICJpc3N1ZWQiOiAxMC4wLCAibWlzc2VudCI6IDAuMCwgIm1pc3NlbnRfcGN0IjogMC4wLCAicnRzIjogMC4wLCAicnRzX3BjdCI6IDAuMCwgImRlcG9zaXQiOiAwLjAsICJkZWxpdmVyZWQiOiAxMC4wLCAiZGVsaXZlcnlfcGN0IjogMTAwLjAsICJkZWxpdmVyeV9ydHNfcGN0IjogMTAwLjB9LCB7ImRhdGUiOiAiMjAyNi0wOC0wMSIsICJvZmZpY2UiOiAiTm9kYWwgRGVsaXZlcnkgQ2VudHJlIiwgImJhZ3MiOiAxNTIuMCwgInJlY2VpdmVkIjogMjAxOC4wLCAiaXNzdWVkIjogMjAxMC4wLCAibWlzc2VudCI6IDMxLjAsICJtaXNzZW50X3BjdCI6IDEuNTM2MTc0NDMsICJydHMiOiAzOC4wLCAicnRzX3BjdCI6IDEuODgzMDUyNTI2OTk5OTk5OCwgImRlcG9zaXQiOiAzNjguMCwgImRlbGl2ZXJlZCI6IDE2MDQuMCwgImRlbGl2ZXJ5X3BjdCI6IDc5LjgwMDk5NTAyLCAiZGVsaXZlcnlfcnRzX3BjdCI6IDgxLjY5MTU0MjI5fSwgeyJkYXRlIjogIjIwMjYtMDgtMDIiLCAib2ZmaWNlIjogIklEQyBTUlQgTmFnYXIgUE8iLCAiYmFncyI6IDUuMCwgInJlY2VpdmVkIjogMTIuMCwgImlzc3VlZCI6IDEyLjAsICJtaXNzZW50IjogMC4wLCAibWlzc2VudF9wY3QiOiAwLjAsICJydHMiOiAwLjAsICJydHNfcGN0IjogMC4wLCAiZGVwb3NpdCI6IDMuMCwgImRlbGl2ZXJlZCI6IDkuMCwgImRlbGl2ZXJ5X3BjdCI6IDc1LjAsICJkZWxpdmVyeV9ydHNfcGN0IjogNzUuMH0sIHsiZGF0ZSI6ICIyMDI2LTA4LTAyIiwgIm9mZmljZSI6ICJSYXNodHJhcGF0aSBCaGF3YW4gUE8iLCAiYmFncyI6IDAuMCwgInJlY2VpdmVkIjogMC4wLCAiaXNzdWVkIjogMC4wLCAibWlzc2VudCI6IDAuMCwgIm1pc3NlbnRfcGN0IjogbnVsbCwgInJ0cyI6IDAuMCwgInJ0c19wY3QiOiBudWxsLCAiZGVwb3NpdCI6IDAuMCwgImRlbGl2ZXJlZCI6IDAuMCwgImRlbGl2ZXJ5X3BjdCI6IG51bGwsICJkZWxpdmVyeV9ydHNfcGN0IjogbnVsbH0sIHsiZGF0ZSI6ICIyMDI2LTA4LTAyIiwgIm9mZmljZSI6ICJVUFNDIFBPIiwgImJhZ3MiOiAxLjAsICJyZWNlaXZlZCI6IDE1LjAsICJpc3N1ZWQiOiAxNS4wLCAibWlzc2VudCI6IDAuMCwgIm1pc3NlbnRfcGN0IjogMC4wLCAicnRzIjogMC4wLCAicnRzX3BjdCI6IDAuMCwgImRlcG9zaXQiOiAwLjAsICJkZWxpdmVyZWQiOiAxNS4wLCAiZGVsaXZlcnlfcGN0IjogMTAwLjAsICJkZWxpdmVyeV9ydHNfcGN0IjogMTAwLjB9LCB7ImRhdGUiOiAiMjAyNi0wOC0wMiIsICJvZmZpY2UiOiAiTm9kYWwgRGVsaXZlcnkgQ2VudHJlIiwgImJhZ3MiOiAxODYuMCwgInJlY2VpdmVkIjogMTk2NC4wLCAiaXNzdWVkIjogMTAxNS4wLCAibWlzc2VudCI6IDE5LjAsICJtaXNzZW50X3BjdCI6IDAuOTY3NDEzNDQxOTk5OTk5OSwgInJ0cyI6IDE3LjAsICJydHNfcGN0IjogMC44NjU1ODA0NDgxLCAiZGVwb3NpdCI6IDEzMjEuMCwgImRlbGl2ZXJlZCI6IDk3NS4wLCAiZGVsaXZlcnlfcGN0IjogOTYuMDU5MTEzMjk5OTk5OTksICJkZWxpdmVyeV9ydHNfcGN0IjogOTcuNzMzOTkwMTUwMDAwMDF9LCB7ImRhdGUiOiAiMjAyNi0wOC0wMyIsICJvZmZpY2UiOiAiSURDIFNSVCBOYWdhciBQTyIsICJiYWdzIjogMzQuMCwgInJlY2VpdmVkIjogNTM2Ni4wLCAiaXNzdWVkIjogNDcwOC4wLCAibWlzc2VudCI6IDE4MS4wLCAibWlzc2VudF9wY3QiOiAzLjM3MzA4OTgyNSwgInJ0cyI6IDM5NS4wLCAicnRzX3BjdCI6IDcuMzYxMTYyODc3MDAwMDAxLCAiZGVwb3NpdCI6IDE1MC4wLCAiZGVsaXZlcmVkIjogNDE2NC4wLCAiZGVsaXZlcnlfcGN0IjogODguNDQ1MTk5NjYsICJkZWxpdmVyeV9ydHNfcGN0IjogOTYuODM1MTc0MTd9LCB7ImRhdGUiOiAiMjAyNi0wOC0wMyIsICJvZmZpY2UiOiAiUmFzaHRyYXBhdGkgQmhhd2FuIFBPIiwgImJhZ3MiOiA2LjAsICJyZWNlaXZlZCI6IDM5MC4wLCAiaXNzdWVkIjogMzg5LjAsICJtaXNzZW50IjogMS4wLCAibWlzc2VudF9wY3QiOiAwLjI1NjQxMDI1NjQsICJydHMiOiAyLjAsICJydHNfcGN0IjogMC41MTI4MjA1MTI4LCAiZGVwb3NpdCI6IDEuMCwgImRlbGl2ZXJlZCI6IDM4Ni4wLCAiZGVsaXZlcnlfcGN0IjogOTkuMjI4NzkxNzcsICJkZWxpdmVyeV9ydHNfcGN0IjogOTkuNzQyOTMwNTl9LCB7ImRhdGUiOiAiMjAyNi0wOC0wMyIsICJvZmZpY2UiOiAiVVBTQyBQTyIsICJiYWdzIjogNy4wLCAicmVjZWl2ZWQiOiAxNTcuMCwgImlzc3VlZCI6IDE1Mi4wLCAibWlzc2VudCI6IDUuMCwgIm1pc3NlbnRfcGN0IjogMy4xODQ3MTMzNzYsICJydHMiOiA3LjAsICJydHNfcGN0IjogNC40NTg1OTg3MjYsICJkZXBvc2l0IjogMC4wLCAiZGVsaXZlcmVkIjogMTQ1LjAsICJkZWxpdmVyeV9wY3QiOiA5NS4zOTQ3MzY4NDAwMDAwMSwgImRlbGl2ZXJ5X3J0c19wY3QiOiAxMDAuMH0sIHsiZGF0ZSI6ICIyMDI2LTA4LTAzIiwgIm9mZmljZSI6ICJOb2RhbCBEZWxpdmVyeSBDZW50cmUiLCAiYmFncyI6IDEyNC4wLCAicmVjZWl2ZWQiOiAxNjM3LjAsICJpc3N1ZWQiOiAyOTI0LjAsICJtaXNzZW50IjogMzQuMCwgIm1pc3NlbnRfcGN0IjogMi4wNzY5NzAwNjcsICJydHMiOiAxNDMuMCwgInJ0c19wY3QiOiA4LjczNTQ5MTc1MywgImRlcG9zaXQiOiAxMjEuMCwgImRlbGl2ZXJlZCI6IDI2NjAuMCwgImRlbGl2ZXJ5X3BjdCI6IDkwLjk3MTI3MjIzLCAiZGVsaXZlcnlfcnRzX3BjdCI6IDk1Ljg2MTgzMzExfSwgeyJkYXRlIjogIjIwMjYtMDgtMDQiLCAib2ZmaWNlIjogIklEQyBTUlQgTmFnYXIgUE8iLCAiYmFncyI6IDIwLjAsICJyZWNlaXZlZCI6IDMyNDYuMCwgImlzc3VlZCI6IDMxMDkuMCwgIm1pc3NlbnQiOiAxMzcuMCwgIm1pc3NlbnRfcGN0IjogNC4yMjA1NzkxNzQsICJydHMiOiA0NzguMCwgInJ0c19wY3QiOiAxNC43MjU4MTYzODk5OTk5OTksICJkZXBvc2l0IjogMTUxLjAsICJkZWxpdmVyZWQiOiAyNDgwLjAsICJkZWxpdmVyeV9wY3QiOiA3OS43Njg0MTQyOCwgImRlbGl2ZXJ5X3J0c19wY3QiOiA5NS4xNDMxMzI4Mzk5OTk5OX0sIHsiZGF0ZSI6ICIyMDI2LTA4LTA0IiwgIm9mZmljZSI6ICJSYXNodHJhcGF0aSBCaGF3YW4gUE8iLCAiYmFncyI6IDMuMCwgInJlY2VpdmVkIjogMTkwLjAsICJpc3N1ZWQiOiAxOTEuMCwgIm1pc3NlbnQiOiAwLjAsICJtaXNzZW50X3BjdCI6IDAuMCwgInJ0cyI6IDQuMCwgInJ0c19wY3QiOiAyLjEwNTI2MzE1OCwgImRlcG9zaXQiOiAwLjAsICJkZWxpdmVyZWQiOiAxODcuMCwgImRlbGl2ZXJ5X3BjdCI6IDk3LjkwNTc1OTE2LCAiZGVsaXZlcnlfcnRzX3BjdCI6IDEwMC4wfSwgeyJkYXRlIjogIjIwMjYtMDgtMDQiLCAib2ZmaWNlIjogIlVQU0MgUE8iLCAiYmFncyI6IDUuMCwgInJlY2VpdmVkIjogMTcxLjAsICJpc3N1ZWQiOiAxNjcuMCwgIm1pc3NlbnQiOiA0LjAsICJtaXNzZW50X3BjdCI6IDIuMzM5MTgxMjg3LCAicnRzIjogOS4wLCAicnRzX3BjdCI6IDUuMjYzMTU3ODk1LCAiZGVwb3NpdCI6IDAuMCwgImRlbGl2ZXJlZCI6IDE1OC4wLCAiZGVsaXZlcnlfcGN0IjogOTQuNjEwNzc4NDQsICJkZWxpdmVyeV9ydHNfcGN0IjogMTAwLjB9LCB7ImRhdGUiOiAiMjAyNi0wOC0wNCIsICJvZmZpY2UiOiAiTm9kYWwgRGVsaXZlcnkgQ2VudHJlIiwgImJhZ3MiOiAxOTEuMCwgInJlY2VpdmVkIjogMjM4Mi4wLCAiaXNzdWVkIjogMjQzNi4wLCAibWlzc2VudCI6IDY3LjAsICJtaXNzZW50X3BjdCI6IDIuODEyNzYyMzg0OTk5OTk5NiwgInJ0cyI6IDc5LjAsICJydHNfcGN0IjogMy4zMTY1NDA3MjIsICJkZXBvc2l0IjogNTEuMCwgImRlbGl2ZXJlZCI6IDIzMDYuMCwgImRlbGl2ZXJ5X3BjdCI6IDk0LjY2MzM4MjU5LCAiZGVsaXZlcnlfcnRzX3BjdCI6IDk3LjkwNjQwMzk0fSwgeyJkYXRlIjogIjIwMjYtMDgtMDUiLCAib2ZmaWNlIjogIklEQyBTUlQgTmFnYXIgUE8iLCAiYmFncyI6IDIzLjAsICJyZWNlaXZlZCI6IDI2MDEuMCwgImlzc3VlZCI6IDI0ODguMCwgIm1pc3NlbnQiOiAxMTMuMCwgIm1pc3NlbnRfcGN0IjogNC4zNDQ0ODI4OTA5OTk5OTksICJydHMiOiAzMDguMCwgInJ0c19wY3QiOiAxMS44NDE1OTkzOCwgImRlcG9zaXQiOiA5Mi4wLCAiZGVsaXZlcmVkIjogMjA4OC4wLCAiZGVsaXZlcnlfcGN0IjogODMuOTIyODI5NTgsICJkZWxpdmVyeV9ydHNfcGN0IjogOTYuMzAyMjUwOH0sIHsiZGF0ZSI6ICIyMDI2LTA4LTA1IiwgIm9mZmljZSI6ICJSYXNodHJhcGF0aSBCaGF3YW4gUE8iLCAiYmFncyI6IDQuMCwgInJlY2VpdmVkIjogOTYuMCwgImlzc3VlZCI6IDk2LjAsICJtaXNzZW50IjogMC4wLCAibWlzc2VudF9wY3QiOiAwLjAsICJydHMiOiAxLjAsICJydHNfcGN0IjogMS4wNDE2NjY2NjY5OTk5OTk5LCAiZGVwb3NpdCI6IDAuMCwgImRlbGl2ZXJlZCI6IDk1LjAsICJkZWxpdmVyeV9wY3QiOiA5OC45NTgzMzMzMywgImRlbGl2ZXJ5X3J0c19wY3QiOiAxMDAuMH0sIHsiZGF0ZSI6ICIyMDI2LTA4LTA1IiwgIm9mZmljZSI6ICJVUFNDIFBPIiwgImJhZ3MiOiAxNC4wLCAicmVjZWl2ZWQiOiAyODcuMCwgImlzc3VlZCI6IDI4Ny4wLCAibWlzc2VudCI6IDAuMCwgIm1pc3NlbnRfcGN0IjogMC4wLCAicnRzIjogMC4wLCAicnRzX3BjdCI6IDAuMCwgImRlcG9zaXQiOiAwLjAsICJkZWxpdmVyZWQiOiAyODcuMCwgImRlbGl2ZXJ5X3BjdCI6IDEwMC4wLCAiZGVsaXZlcnlfcnRzX3BjdCI6IDEwMC4wfSwgeyJkYXRlIjogIjIwMjYtMDgtMDUiLCAib2ZmaWNlIjogIk5vZGFsIERlbGl2ZXJ5IENlbnRyZSIsICJiYWdzIjogMTQ3LjAsICJyZWNlaXZlZCI6IDE1ODIuMCwgImlzc3VlZCI6IDE1OTQuMCwgIm1pc3NlbnQiOiAzOS4wLCAibWlzc2VudF9wY3QiOiAyLjQ2NTIzMzg4MSwgInJ0cyI6IDUzLjAsICJydHNfcGN0IjogMy4zNTAxODk2MzMwMDAwMDAzLCAiZGVwb3NpdCI6IDE5LjAsICJkZWxpdmVyZWQiOiAxNTIyLjAsICJkZWxpdmVyeV9wY3QiOiA5NS40ODMwNjE0OCwgImRlbGl2ZXJ5X3J0c19wY3QiOiA5OC44MDgwMzAxMX0sIHsiZGF0ZSI6ICIyMDI2LTA4LTA2IiwgIm9mZmljZSI6ICJJREMgU1JUIE5hZ2FyIFBPIiwgImJhZ3MiOiAyNS4wLCAicmVjZWl2ZWQiOiAyNTg4LjAsICJpc3N1ZWQiOiAyMDgxLjAsICJtaXNzZW50IjogMTE2LjAsICJtaXNzZW50X3BjdCI6IDQuNDgyMjI1NjU3MDAwMDAxLCAicnRzIjogMjIxLjAsICJydHNfcGN0IjogOC41Mzk0MTI2NzQwMDAwMDEsICJkZXBvc2l0IjogNDg2LjAsICJkZWxpdmVyZWQiOiAxNzY1LjAsICJkZWxpdmVyeV9wY3QiOiA4NC44MTQ5OTI3OSwgImRlbGl2ZXJ5X3J0c19wY3QiOiA5NS40MzQ4ODcwN30sIHsiZGF0ZSI6ICIyMDI2LTA4LTA2IiwgIm9mZmljZSI6ICJSYXNodHJhcGF0aSBCaGF3YW4gUE8iLCAiYmFncyI6IDMuMCwgInJlY2VpdmVkIjogMjAzLjAsICJpc3N1ZWQiOiAyMDMuMCwgIm1pc3NlbnQiOiAwLjAsICJtaXNzZW50X3BjdCI6IDAuMCwgInJ0cyI6IDYuMCwgInJ0c19wY3QiOiAyLjk1NTY2NTAyNSwgImRlcG9zaXQiOiAwLjAsICJkZWxpdmVyZWQiOiAxOTcuMCwgImRlbGl2ZXJ5X3BjdCI6IDk3LjA0NDMzNDk4LCAiZGVsaXZlcnlfcnRzX3BjdCI6IDEwMC4wfSwgeyJkYXRlIjogIjIwMjYtMDgtMDYiLCAib2ZmaWNlIjogIlVQU0MgUE8iLCAiYmFncyI6IDI4LjAsICJyZWNlaXZlZCI6IDM0NC4wLCAiaXNzdWVkIjogMzQzLjAsICJtaXNzZW50IjogMS4wLCAibWlzc2VudF9wY3QiOiAwLjI5MDY5NzY3NDQsICJydHMiOiAwLjAsICJydHNfcGN0IjogMC4wLCAiZGVwb3NpdCI6IDAuMCwgImRlbGl2ZXJlZCI6IDM0My4wLCAiZGVsaXZlcnlfcGN0IjogMTAwLjAsICJkZWxpdmVyeV9ydHNfcGN0IjogMTAwLjB9LCB7ImRhdGUiOiAiMjAyNi0wOC0wNiIsICJvZmZpY2UiOiAiTm9kYWwgRGVsaXZlcnkgQ2VudHJlIiwgImJhZ3MiOiAxNDUuMCwgInJlY2VpdmVkIjogMTQ2MS4wLCAiaXNzdWVkIjogMTQzMi4wLCAibWlzc2VudCI6IDQ4LjAsICJtaXNzZW50X3BjdCI6IDMuMjg1NDIwOTQ1LCAicnRzIjogNjMuMCwgInJ0c19wY3QiOiA0LjMxMjExNDk5LCAiZGVwb3NpdCI6IDMzLjAsICJkZWxpdmVyZWQiOiAxMzM2LjAsICJkZWxpdmVyeV9wY3QiOiA5My4yOTYwODkzOSwgImRlbGl2ZXJ5X3J0c19wY3QiOiA5Ny42OTU1MzA3M30sIHsiZGF0ZSI6ICIyMDI2LTA4LTA3IiwgIm9mZmljZSI6ICJJREMgU1JUIE5hZ2FyIFBPIiwgImJhZ3MiOiAyMS4wLCAicmVjZWl2ZWQiOiAzMzE5LjAsICJpc3N1ZWQiOiAzMTczLjAsICJtaXNzZW50IjogMTQ2LjAsICJtaXNzZW50X3BjdCI6IDQuMzk4OTE1MzM2LCAicnRzIjogMjQ0LjAsICJydHNfcGN0IjogNy4zNTE2MTE5MzEsICJkZXBvc2l0IjogMTUyLjAsICJkZWxpdmVyZWQiOiAyNzQ3LjAsICJkZWxpdmVyeV9wY3QiOiA4Ni41NzQyMTk5OCwgImRlbGl2ZXJ5X3J0c19wY3QiOiA5NC4yNjQxMDMzN30sIHsiZGF0ZSI6ICIyMDI2LTA4LTA3IiwgIm9mZmljZSI6ICJSYXNodHJhcGF0aSBCaGF3YW4gUE8iLCAiYmFncyI6IDcuMCwgInJlY2VpdmVkIjogMjIyLjAsICJpc3N1ZWQiOiAyMjEuMCwgIm1pc3NlbnQiOiAxLjAsICJtaXNzZW50X3BjdCI6IDAuNDUwNDUwNDUwNSwgInJ0cyI6IDEuMCwgInJ0c19wY3QiOiAwLjQ1MDQ1MDQ1MDUsICJkZXBvc2l0IjogMC4wLCAiZGVsaXZlcmVkIjogMjIwLjAsICJkZWxpdmVyeV9wY3QiOiA5OS41NDc1MTEzMSwgImRlbGl2ZXJ5X3J0c19wY3QiOiAxMDAuMH0sIHsiZGF0ZSI6ICIyMDI2LTA4LTA3IiwgIm9mZmljZSI6ICJVUFNDIFBPIiwgImJhZ3MiOiAxMC4wLCAicmVjZWl2ZWQiOiAxNzMuMCwgImlzc3VlZCI6IDE3MS4wLCAibWlzc2VudCI6IDIuMCwgIm1pc3NlbnRfcGN0IjogMS4xNTYwNjkzNjQsICJydHMiOiA2LjAsICJydHNfcGN0IjogMy40NjgyMDgwOTIsICJkZXBvc2l0IjogMC4wLCAiZGVsaXZlcmVkIjogMTY1LjAsICJkZWxpdmVyeV9wY3QiOiA5Ni40OTEyMjgwNywgImRlbGl2ZXJ5X3J0c19wY3QiOiAxMDAuMH0sIHsiZGF0ZSI6ICIyMDI2LTA4LTA3IiwgIm9mZmljZSI6ICJOb2RhbCBEZWxpdmVyeSBDZW50cmUiLCAiYmFncyI6IDE3MC4wLCAicmVjZWl2ZWQiOiAxOTM1LjAsICJpc3N1ZWQiOiAxOTM5LjAsICJtaXNzZW50IjogMjkuMCwgIm1pc3NlbnRfcGN0IjogMS40OTg3MDgwMDk5OTk5OTk5LCAicnRzIjogNjcuMCwgInJ0c19wY3QiOiAzLjQ2MjUzMjMsICJkZXBvc2l0IjogNTcuMCwgImRlbGl2ZXJlZCI6IDE4MTUuMCwgImRlbGl2ZXJ5X3BjdCI6IDkzLjYwNDk1MTAxMDAwMDAxLCAiZGVsaXZlcnlfcnRzX3BjdCI6IDk3LjA2MDM0MDM4fSwgeyJkYXRlIjogIjIwMjYtMDgtMDgiLCAib2ZmaWNlIjogIklEQyBTUlQgTmFnYXIgUE8iLCAiYmFncyI6IDI2LjAsICJyZWNlaXZlZCI6IDI4MDIuMCwgImlzc3VlZCI6IDE3ODkuMCwgIm1pc3NlbnQiOiA5Ni4wLCAibWlzc2VudF9wY3QiOiAzLjQyNjEyNDE5NywgInJ0cyI6IDI1NC4wLCAicnRzX3BjdCI6IDkuMDY0OTUzNjA1MDAwMDAxLCAiZGVwb3NpdCI6IDEwMTIuMCwgImRlbGl2ZXJlZCI6IDE0NDAuMCwgImRlbGl2ZXJ5X3BjdCI6IDgwLjQ5MTg5NDkxLCAiZGVsaXZlcnlfcnRzX3BjdCI6IDk0LjY4OTc3MDgxOTk5OTk5fSwgeyJkYXRlIjogIjIwMjYtMDgtMDgiLCAib2ZmaWNlIjogIlJhc2h0cmFwYXRpIEJoYXdhbiBQTyIsICJiYWdzIjogNy4wLCAicmVjZWl2ZWQiOiAxODkuMCwgImlzc3VlZCI6IDE4OC4wLCAibWlzc2VudCI6IDEuMCwgIm1pc3NlbnRfcGN0IjogMC41MjkxMDA1MjkwOTk5OTk5LCAicnRzIjogMi4wLCAicnRzX3BjdCI6IDEuMDU4MjAxMDU4LCAiZGVwb3NpdCI6IDAuMCwgImRlbGl2ZXJlZCI6IDE4Ni4wLCAiZGVsaXZlcnlfcGN0IjogOTguOTM2MTcwMjEsICJkZWxpdmVyeV9ydHNfcGN0IjogMTAwLjB9LCB7ImRhdGUiOiAiMjAyNi0wOC0wOCIsICJvZmZpY2UiOiAiVVBTQyBQTyIsICJiYWdzIjogMi4wLCAicmVjZWl2ZWQiOiAyNy4wLCAiaXNzdWVkIjogMjcuMCwgIm1pc3NlbnQiOiAwLjAsICJtaXNzZW50X3BjdCI6IDAuMCwgInJ0cyI6IDAuMCwgInJ0c19wY3QiOiAwLjAsICJkZXBvc2l0IjogMS4wLCAiZGVsaXZlcmVkIjogMjYuMCwgImRlbGl2ZXJ5X3BjdCI6IDk2LjI5NjI5NjMsICJkZWxpdmVyeV9ydHNfcGN0IjogOTYuMjk2Mjk2M30sIHsiZGF0ZSI6ICIyMDI2LTA4LTA4IiwgIm9mZmljZSI6ICJOb2RhbCBEZWxpdmVyeSBDZW50cmUiLCAiYmFncyI6IDE1MC4wLCAicmVjZWl2ZWQiOiAxODk2LjAsICJpc3N1ZWQiOiAxOTI0LjAsICJtaXNzZW50IjogMjkuMCwgIm1pc3NlbnRfcGN0IjogMS41Mjk1MzU4NjUsICJydHMiOiA2NS4wLCAicnRzX3BjdCI6IDMuNDI4MjcwMDQyLCAiZGVwb3NpdCI6IDQ3MS4wLCAiZGVsaXZlcmVkIjogMTM4OC4wLCAiZGVsaXZlcnlfcGN0IjogNzIuMTQxMzcyMTQsICJkZWxpdmVyeV9ydHNfcGN0IjogNzUuNTE5NzUwNTJ9LCB7ImRhdGUiOiAiMjAyNi0wOC0wOCIsICJvZmZpY2UiOiAiTmFtZSBvZiBPZmZpY2UiLCAiYmFncyI6IG51bGwsICJyZWNlaXZlZCI6IG51bGwsICJpc3N1ZWQiOiBudWxsLCAibWlzc2VudCI6IG51bGwsICJtaXNzZW50X3BjdCI6IG51bGwsICJydHMiOiBudWxsLCAicnRzX3BjdCI6IG51bGwsICJkZXBvc2l0IjogbnVsbCwgImRlbGl2ZXJlZCI6IG51bGwsICJkZWxpdmVyeV9wY3QiOiBudWxsLCAiZGVsaXZlcnlfcnRzX3BjdCI6IG51bGx9LCB7ImRhdGUiOiAiMjAyNi0wOC0wOSIsICJvZmZpY2UiOiAiSURDIFNSVCBOYWdhciBQTyIsICJiYWdzIjogMy4wLCAicmVjZWl2ZWQiOiA3LjAsICJpc3N1ZWQiOiA3LjAsICJtaXNzZW50IjogMC4wLCAibWlzc2VudF9wY3QiOiAwLjAsICJydHMiOiAwLjAsICJydHNfcGN0IjogMC4wLCAiZGVwb3NpdCI6IDAuMCwgImRlbGl2ZXJlZCI6IDcuMCwgImRlbGl2ZXJ5X3BjdCI6IDEwMC4wLCAiZGVsaXZlcnlfcnRzX3BjdCI6IDEwMC4wfSwgeyJkYXRlIjogIjIwMjYtMDgtMDkiLCAib2ZmaWNlIjogIlJhc2h0cmFwYXRpIEJoYXdhbiBQTyIsICJiYWdzIjogMC4wLCAicmVjZWl2ZWQiOiAwLjAsICJpc3N1ZWQiOiAwLjAsICJtaXNzZW50IjogMC4wLCAibWlzc2VudF9wY3QiOiBudWxsLCAicnRzIjogMC4wLCAicnRzX3BjdCI6IG51bGwsICJkZXBvc2l0IjogMC4wLCAiZGVsaXZlcmVkIjogMC4wLCAiZGVsaXZlcnlfcGN0IjogbnVsbCwgImRlbGl2ZXJ5X3J0c19wY3QiOiBudWxsfSwgeyJkYXRlIjogIjIwMjYtMDgtMDkiLCAib2ZmaWNlIjogIlVQU0MgUE8iLCAiYmFncyI6IDEuMCwgInJlY2VpdmVkIjogMS4wLCAiaXNzdWVkIjogMS4wLCAibWlzc2VudCI6IDAuMCwgIm1pc3NlbnRfcGN0IjogMC4wLCAicnRzIjogMC4wLCAicnRzX3BjdCI6IDAuMCwgImRlcG9zaXQiOiAwLjAsICJkZWxpdmVyZWQiOiAxLjAsICJkZWxpdmVyeV9wY3QiOiAxMDAuMCwgImRlbGl2ZXJ5X3J0c19wY3QiOiAxMDAuMH0sIHsiZGF0ZSI6ICIyMDI2LTA4LTA5IiwgIm9mZmljZSI6ICJOb2RhbCBEZWxpdmVyeSBDZW50cmUiLCAiYmFncyI6IDE3Ni4wLCAicmVjZWl2ZWQiOiAyMDk0LjAsICJpc3N1ZWQiOiAxMDkzLjAsICJtaXNzZW50IjogMTcuMCwgIm1pc3NlbnRfcGN0IjogMC44MTE4NDMzNjIwMDAwMDAxLCAicnRzIjogMjIuMCwgInJ0c19wY3QiOiAxLjA1MDYyMDgyMDk5OTk5OTksICJkZXBvc2l0IjogMTQ4Mi4wLCAiZGVsaXZlcmVkIjogMTA0NC4wLCAiZGVsaXZlcnlfcGN0IjogOTUuNTE2OTI1ODkwMDAwMDEsICJkZWxpdmVyeV9ydHNfcGN0IjogOTcuNTI5NzM0Njh9LCB7ImRhdGUiOiAiMjAyNi0wOC0wOSIsICJvZmZpY2UiOiAiTmFtZSBvZiBPZmZpY2UiLCAiYmFncyI6IG51bGwsICJyZWNlaXZlZCI6IG51bGwsICJpc3N1ZWQiOiBudWxsLCAibWlzc2VudCI6IG51bGwsICJtaXNzZW50X3BjdCI6IG51bGwsICJydHMiOiBudWxsLCAicnRzX3BjdCI6IG51bGwsICJkZXBvc2l0IjogbnVsbCwgImRlbGl2ZXJlZCI6IG51bGwsICJkZWxpdmVyeV9wY3QiOiBudWxsLCAiZGVsaXZlcnlfcnRzX3BjdCI6IG51bGx9LCB7ImRhdGUiOiAiMjAyNi0wOC0xMCIsICJvZmZpY2UiOiAiSURDIFNSVCBOYWdhciBQTyIsICJiYWdzIjogMzMuMCwgInJlY2VpdmVkIjogNTkxMy4wLCAiaXNzdWVkIjogNTEyNi4wLCAibWlzc2VudCI6IDIzNy4wLCAibWlzc2VudF9wY3QiOiA0LjAwODExNzcwNywgInJ0cyI6IDQwMy4wLCAicnRzX3BjdCI6IDYuODE1NDkxMjkwMDAwMDAxLCAiZGVwb3NpdCI6IDY4Mi4wLCAiZGVsaXZlcmVkIjogNDU5MS4wLCAiZGVsaXZlcnlfcGN0IjogODkuNTYzMDEyMSwgImRlbGl2ZXJ5X3J0c19wY3QiOiA5Ny40MjQ4OTI3fSwgeyJkYXRlIjogIjIwMjYtMDgtMTAiLCAib2ZmaWNlIjogIlJhc2h0cmFwYXRpIEJoYXdhbiBQTyIsICJiYWdzIjogNy4wLCAicmVjZWl2ZWQiOiAzNzIuMCwgImlzc3VlZCI6IDM3Mi4wLCAibWlzc2VudCI6IDAuMCwgIm1pc3NlbnRfcGN0IjogMC4wLCAicnRzIjogMy4wLCAicnRzX3BjdCI6IDAuODA2NDUxNjEyOTAwMDAwMSwgImRlcG9zaXQiOiAwLjAsICJkZWxpdmVyZWQiOiAzNjkuMCwgImRlbGl2ZXJ5X3BjdCI6IDk5LjE5MzU0ODM5LCAiZGVsaXZlcnlfcnRzX3BjdCI6IDEwMC4wfSwgeyJkYXRlIjogIjIwMjYtMDgtMTAiLCAib2ZmaWNlIjogIlVQU0MgUE8iLCAiYmFncyI6IDIzLjAsICJyZWNlaXZlZCI6IDM0MC4wLCAiaXNzdWVkIjogMzQwLjAsICJtaXNzZW50IjogMS4wLCAibWlzc2VudF9wY3QiOiAwLjI5NDExNzY0NzEsICJydHMiOiAxLjAsICJydHNfcGN0IjogMC4yOTQxMTc2NDcxLCAiZGVwb3NpdCI6IDAuMCwgImRlbGl2ZXJlZCI6IDMzOS4wLCAiZGVsaXZlcnlfcGN0IjogOTkuNzA1ODgyMzUsICJkZWxpdmVyeV9ydHNfcGN0IjogMTAwLjB9LCB7ImRhdGUiOiAiMjAyNi0wOC0xMCIsICJvZmZpY2UiOiAiTm9kYWwgRGVsaXZlcnkgQ2VudHJlIiwgImJhZ3MiOiAxMTUuMCwgInJlY2VpdmVkIjogMTMwOC4wLCAiaXNzdWVkIjogMjc3MC4wLCAibWlzc2VudCI6IDIwLjAsICJtaXNzZW50X3BjdCI6IDEuNTI5MDUxOTg4LCAicnRzIjogMTc4LjAsICJydHNfcGN0IjogMTMuNjA4NTYyNjkwMDAwMDAxLCAiZGVwb3NpdCI6IDExMi4wLCAiZGVsaXZlcmVkIjogMjQ4MC4wLCAiZGVsaXZlcnlfcGN0IjogODkuNTMwNjg1OTIsICJkZWxpdmVyeV9ydHNfcGN0IjogOTUuOTU2Njc4N30sIHsiZGF0ZSI6ICIyMDI2LTA4LTEwIiwgIm9mZmljZSI6ICJOYW1lIG9mIE9mZmljZSIsICJiYWdzIjogbnVsbCwgInJlY2VpdmVkIjogbnVsbCwgImlzc3VlZCI6IG51bGwsICJtaXNzZW50IjogbnVsbCwgIm1pc3NlbnRfcGN0IjogbnVsbCwgInJ0cyI6IG51bGwsICJydHNfcGN0IjogbnVsbCwgImRlcG9zaXQiOiBudWxsLCAiZGVsaXZlcmVkIjogbnVsbCwgImRlbGl2ZXJ5X3BjdCI6IG51bGwsICJkZWxpdmVyeV9ydHNfcGN0IjogbnVsbH0sIHsiZGF0ZSI6ICIyMDI2LTA4LTExIiwgIm9mZmljZSI6ICJJREMgU1JUIE5hZ2FyIFBPIiwgImJhZ3MiOiAyNS4wLCAicmVjZWl2ZWQiOiAzMTU0LjAsICJpc3N1ZWQiOiAyOTk0LjAsICJtaXNzZW50IjogMTYwLjAsICJtaXNzZW50X3BjdCI6IDUuMDcyOTIzMjcyMDAwMDAxLCAicnRzIjogNDM5LjAsICJydHNfcGN0IjogMTMuOTE4ODMzMjI5OTk5OTk5LCAiZGVwb3NpdCI6IDEyNy4wLCAiZGVsaXZlcmVkIjogMjQyOC4wLCAiZGVsaXZlcnlfcGN0IjogODEuMDk1NTI0MzgsICJkZWxpdmVyeV9ydHNfcGN0IjogOTUuNzU4MTgzMDN9LCB7ImRhdGUiOiAiMjAyNi0wOC0xMSIsICJvZmZpY2UiOiAiUmFzaHRyYXBhdGkgQmhhd2FuIFBPIiwgImJhZ3MiOiA3LjAsICJyZWNlaXZlZCI6IDI0Mi4wLCAiaXNzdWVkIjogMjQyLjAsICJtaXNzZW50IjogMC4wLCAibWlzc2VudF9wY3QiOiAwLjAsICJydHMiOiA3LjAsICJydHNfcGN0IjogMi44OTI1NjE5ODMsICJkZXBvc2l0IjogMC4wLCAiZGVsaXZlcmVkIjogMjM1LjAsICJkZWxpdmVyeV9wY3QiOiA5Ny4xMDc0MzgwMiwgImRlbGl2ZXJ5X3J0c19wY3QiOiAxMDAuMH0sIHsiZGF0ZSI6ICIyMDI2LTA4LTExIiwgIm9mZmljZSI6ICJVUFNDIFBPIiwgImJhZ3MiOiA2LjAsICJyZWNlaXZlZCI6IDcwLjAsICJpc3N1ZWQiOiA3MC4wLCAibWlzc2VudCI6IDEuMCwgIm1pc3NlbnRfcGN0IjogMS40Mjg1NzE0MjksICJydHMiOiAwLjAsICJydHNfcGN0IjogMC4wLCAiZGVwb3NpdCI6IDAuMCwgImRlbGl2ZXJlZCI6IDY5LjAsICJkZWxpdmVyeV9wY3QiOiA5OC41NzE0Mjg1NywgImRlbGl2ZXJ5X3J0c19wY3QiOiA5OC41NzE0Mjg1N30sIHsiZGF0ZSI6ICIyMDI2LTA4LTExIiwgIm9mZmljZSI6ICJOb2RhbCBEZWxpdmVyeSBDZW50cmUiLCAiYmFncyI6IDE1OC4wLCAicmVjZWl2ZWQiOiAyMzQyLjAsICJpc3N1ZWQiOiAyMzcwLjAsICJtaXNzZW50IjogODQuMCwgIm1pc3NlbnRfcGN0IjogMy41ODY2NzgwNTMwMDAwMDA0LCAicnRzIjogODkuMCwgInJ0c19wY3QiOiAzLjgwMDE3MDc5Mzk5OTk5OTYsICJkZXBvc2l0IjogNjMuMCwgImRlbGl2ZXJlZCI6IDIyMTguMCwgImRlbGl2ZXJ5X3BjdCI6IDkzLjU4NjQ5Nzg5LCAiZGVsaXZlcnlfcnRzX3BjdCI6IDk3LjM0MTc3MjE1MDAwMDAxfSwgeyJkYXRlIjogIjIwMjYtMDgtMTEiLCAib2ZmaWNlIjogIk5hbWUgb2YgT2ZmaWNlIiwgImJhZ3MiOiBudWxsLCAicmVjZWl2ZWQiOiBudWxsLCAiaXNzdWVkIjogbnVsbCwgIm1pc3NlbnQiOiBudWxsLCAibWlzc2VudF9wY3QiOiBudWxsLCAicnRzIjogbnVsbCwgInJ0c19wY3QiOiBudWxsLCAiZGVwb3NpdCI6IG51bGwsICJkZWxpdmVyZWQiOiBudWxsLCAiZGVsaXZlcnlfcGN0IjogbnVsbCwgImRlbGl2ZXJ5X3J0c19wY3QiOiBudWxsfSwgeyJkYXRlIjogIjIwMjYtMDgtMTIiLCAib2ZmaWNlIjogIklEQyBTUlQgTmFnYXIgUE8iLCAiYmFncyI6IDIxLjAsICJyZWNlaXZlZCI6IDM5NzguMCwgImlzc3VlZCI6IDM2OTcuMCwgIm1pc3NlbnQiOiAyODEuMCwgIm1pc3NlbnRfcGN0IjogNy4wNjM4NTExODA5OTk5OTk1LCAicnRzIjogMzU4LjAsICJydHNfcGN0IjogOC45OTk0OTcyMzUsICJkZXBvc2l0IjogOTkuMCwgImRlbGl2ZXJlZCI6IDMyNDAuMCwgImRlbGl2ZXJ5X3BjdCI6IDg3LjYzODYyNTkxLCAiZGVsaXZlcnlfcnRzX3BjdCI6IDk3LjMyMjE1MzF9LCB7ImRhdGUiOiAiMjAyNi0wOC0xMiIsICJvZmZpY2UiOiAiUmFzaHRyYXBhdGkgQmhhd2FuIFBPIiwgImJhZ3MiOiA2LjAsICJyZWNlaXZlZCI6IDEyNi4wLCAiaXNzdWVkIjogMTI1LjAsICJtaXNzZW50IjogMS4wLCAibWlzc2VudF9wY3QiOiAwLjc5MzY1MDc5MzcwMDAwMDEsICJydHMiOiAxLjAsICJydHNfcGN0IjogMC43OTM2NTA3OTM3MDAwMDAxLCAiZGVwb3NpdCI6IDAuMCwgImRlbGl2ZXJlZCI6IDEyNC4wLCAiZGVsaXZlcnlfcGN0IjogOTkuMiwgImRlbGl2ZXJ5X3J0c19wY3QiOiAxMDAuMH0sIHsiZGF0ZSI6ICIyMDI2LTA4LTEyIiwgIm9mZmljZSI6ICJVUFNDIFBPIiwgImJhZ3MiOiA4LjAsICJyZWNlaXZlZCI6IDQ3LjAsICJpc3N1ZWQiOiA0Ny4wLCAibWlzc2VudCI6IDAuMCwgIm1pc3NlbnRfcGN0IjogMC4wLCAicnRzIjogMC4wLCAicnRzX3BjdCI6IDAuMCwgImRlcG9zaXQiOiAwLjAsICJkZWxpdmVyZWQiOiA0Ny4wLCAiZGVsaXZlcnlfcGN0IjogMTAwLjAsICJkZWxpdmVyeV9ydHNfcGN0IjogMTAwLjB9LCB7ImRhdGUiOiAiMjAyNi0wOC0xMiIsICJvZmZpY2UiOiAiTm9kYWwgRGVsaXZlcnkgQ2VudHJlIiwgImJhZ3MiOiAxMDEuMCwgInJlY2VpdmVkIjogMTIyMy4wLCAiaXNzdWVkIjogMTI0OS4wLCAibWlzc2VudCI6IDM3LjAsICJtaXNzZW50X3BjdCI6IDMuMDI1MzQ3NTA2LCAicnRzIjogMzQuMCwgInJ0c19wY3QiOiAyLjc4MDA0OTA2LCAiZGVwb3NpdCI6IDcwLjAsICJkZWxpdmVyZWQiOiAxMTQ1LjAsICJkZWxpdmVyeV9wY3QiOiA5MS42NzMzMzg2NywgImRlbGl2ZXJ5X3J0c19wY3QiOiA5NC4zOTU1MTY0MX0sIHsiZGF0ZSI6ICIyMDI2LTA4LTEyIiwgIm9mZmljZSI6ICJOYW1lIG9mIE9mZmljZSIsICJiYWdzIjogbnVsbCwgInJlY2VpdmVkIjogbnVsbCwgImlzc3VlZCI6IG51bGwsICJtaXNzZW50IjogbnVsbCwgIm1pc3NlbnRfcGN0IjogbnVsbCwgInJ0cyI6IG51bGwsICJydHNfcGN0IjogbnVsbCwgImRlcG9zaXQiOiBudWxsLCAiZGVsaXZlcmVkIjogbnVsbCwgImRlbGl2ZXJ5X3BjdCI6IG51bGwsICJkZWxpdmVyeV9ydHNfcGN0IjogbnVsbH0sIHsiZGF0ZSI6ICIyMDI2LTA4LTEzIiwgIm9mZmljZSI6ICJJREMgU1JUIE5hZ2FyIFBPIiwgImJhZ3MiOiAyNy4wLCAicmVjZWl2ZWQiOiAzNDQ4LjAsICJpc3N1ZWQiOiAzMjQyLjAsICJtaXNzZW50IjogMjA2LjAsICJtaXNzZW50X3BjdCI6IDUuOTc0NDc3OTU4LCAicnRzIjogNDAxLjAsICJydHNfcGN0IjogMTEuNjI5OTMwMzksICJkZXBvc2l0IjogMTI3LjAsICJkZWxpdmVyZWQiOiAyNzE0LjAsICJkZWxpdmVyeV9wY3QiOiA4My43MTM3NTY5NCwgImRlbGl2ZXJ5X3J0c19wY3QiOiA5Ni4wODI2NjUwMjAwMDAwMX0sIHsiZGF0ZSI6ICIyMDI2LTA4LTEzIiwgIm9mZmljZSI6ICJSYXNodHJhcGF0aSBCaGF3YW4gUE8iLCAiYmFncyI6IDQuMCwgInJlY2VpdmVkIjogMTE0LjAsICJpc3N1ZWQiOiAxMTQuMCwgIm1pc3NlbnQiOiAwLjAsICJtaXNzZW50X3BjdCI6IDAuMCwgInJ0cyI6IDEuMCwgInJ0c19wY3QiOiAwLjg3NzE5Mjk4MjUsICJkZXBvc2l0IjogMC4wLCAiZGVsaXZlcmVkIjogMTEzLjAsICJkZWxpdmVyeV9wY3QiOiA5OS4xMjI4MDcwMjAwMDAwMSwgImRlbGl2ZXJ5X3J0c19wY3QiOiAxMDAuMH0sIHsiZGF0ZSI6ICIyMDI2LTA4LTEzIiwgIm9mZmljZSI6ICJVUFNDIFBPIiwgImJhZ3MiOiA2LjAsICJyZWNlaXZlZCI6IDYyLjAsICJpc3N1ZWQiOiA2Mi4wLCAibWlzc2VudCI6IDAuMCwgIm1pc3NlbnRfcGN0IjogMC4wLCAicnRzIjogMS4wLCAicnRzX3BjdCI6IDEuNjEyOTAzMjI1OTk5OTk5OCwgImRlcG9zaXQiOiAwLjAsICJkZWxpdmVyZWQiOiA2MS4wLCAiZGVsaXZlcnlfcGN0IjogOTguMzg3MDk2NzcsICJkZWxpdmVyeV9ydHNfcGN0IjogMTAwLjB9LCB7ImRhdGUiOiAiMjAyNi0wOC0xMyIsICJvZmZpY2UiOiAiTm9kYWwgRGVsaXZlcnkgQ2VudHJlIiwgImJhZ3MiOiAxMTYuMCwgInJlY2VpdmVkIjogMTY4Mi4wLCAiaXNzdWVkIjogMTcwNC4wLCAibWlzc2VudCI6IDQ4LjAsICJtaXNzZW50X3BjdCI6IDIuODUzNzQ1NTQxLCAicnRzIjogNTQuMCwgInJ0c19wY3QiOiAzLjIxMDQ2MzczMzk5OTk5OTcsICJkZXBvc2l0IjogMjguMCwgImRlbGl2ZXJlZCI6IDE2MjIuMCwgImRlbGl2ZXJ5X3BjdCI6IDk1LjE4Nzc5MzQzLCAiZGVsaXZlcnlfcnRzX3BjdCI6IDk4LjM1NjgwNzUxfSwgeyJkYXRlIjogIjIwMjYtMDgtMTMiLCAib2ZmaWNlIjogIk5hbWUgb2YgT2ZmaWNlIiwgImJhZ3MiOiBudWxsLCAicmVjZWl2ZWQiOiBudWxsLCAiaXNzdWVkIjogbnVsbCwgIm1pc3NlbnQiOiBudWxsLCAibWlzc2VudF9wY3QiOiBudWxsLCAicnRzIjogbnVsbCwgInJ0c19wY3QiOiBudWxsLCAiZGVwb3NpdCI6IG51bGwsICJkZWxpdmVyZWQiOiBudWxsLCAiZGVsaXZlcnlfcGN0IjogbnVsbCwgImRlbGl2ZXJ5X3J0c19wY3QiOiBudWxsfSwgeyJkYXRlIjogIjIwMjYtMDgtMTQiLCAib2ZmaWNlIjogIklEQyBTUlQgTmFnYXIgUE8iLCAiYmFncyI6IDI2LjAsICJyZWNlaXZlZCI6IDMwOTEuMCwgImlzc3VlZCI6IDI5MDEuMCwgIm1pc3NlbnQiOiAxOTAuMCwgIm1pc3NlbnRfcGN0IjogNi4xNDY4NzgwMzMsICJydHMiOiAyMjMuMCwgInJ0c19wY3QiOiA3LjIxNDQ5MzY5MDk5OTk5OTUsICJkZXBvc2l0IjogNTEuMCwgImRlbGl2ZXJlZCI6IDI2MjcuMCwgImRlbGl2ZXJ5X3BjdCI6IDkwLjU1NDk4MTA0LCAiZGVsaXZlcnlfcnRzX3BjdCI6IDk4LjI0MTk4NTUyfSwgeyJkYXRlIjogIjIwMjYtMDgtMTQiLCAib2ZmaWNlIjogIlJhc2h0cmFwYXRpIEJoYXdhbiBQTyIsICJiYWdzIjogOS4wLCAicmVjZWl2ZWQiOiAyMTUuMCwgImlzc3VlZCI6IDIxNC4wLCAibWlzc2VudCI6IDEuMCwgIm1pc3NlbnRfcGN0IjogMC40NjUxMTYyNzkxMDAwMDAwMywgInJ0cyI6IDYuMCwgInJ0c19wY3QiOiAyLjc5MDY5NzY3NCwgImRlcG9zaXQiOiAxLjAsICJkZWxpdmVyZWQiOiAyMDcuMCwgImRlbGl2ZXJ5X3BjdCI6IDk2LjcyODk3MTk2LCAiZGVsaXZlcnlfcnRzX3BjdCI6IDk5LjUzMjcxMDI4fSwgeyJkYXRlIjogIjIwMjYtMDgtMTQiLCAib2ZmaWNlIjogIlVQU0MgUE8iLCAiYmFncyI6IDEwLjAsICJyZWNlaXZlZCI6IDc2LjAsICJpc3N1ZWQiOiA3Ni4wLCAibWlzc2VudCI6IDAuMCwgIm1pc3NlbnRfcGN0IjogMC4wLCAicnRzIjogMS4wLCAicnRzX3BjdCI6IDEuMzE1Nzg5NDc0LCAiZGVwb3NpdCI6IDAuMCwgImRlbGl2ZXJlZCI6IDc1LjAsICJkZWxpdmVyeV9wY3QiOiA5OC42ODQyMTA1MywgImRlbGl2ZXJ5X3J0c19wY3QiOiAxMDAuMH0sIHsiZGF0ZSI6ICIyMDI2LTA4LTE0IiwgIm9mZmljZSI6ICJOb2RhbCBEZWxpdmVyeSBDZW50cmUiLCAiYmFncyI6IDE4MC4wLCAicmVjZWl2ZWQiOiAxODcwLjAsICJpc3N1ZWQiOiAxODU3LjAsICJtaXNzZW50IjogNDEuMCwgIm1pc3NlbnRfcGN0IjogMi4xOTI1MTMzNjkwMDAwMDAzLCAicnRzIjogNjQuMCwgInJ0c19wY3QiOiAzLjQyMjQ1OTg5MywgImRlcG9zaXQiOiA1NC4wLCAiZGVsaXZlcmVkIjogMTczOS4wLCAiZGVsaXZlcnlfcGN0IjogOTMuNjQ1NjY1MDUsICJkZWxpdmVyeV9ydHNfcGN0IjogOTcuMDkyMDg0MDEwMDAwMDF9LCB7ImRhdGUiOiAiMjAyNi0wOC0xNCIsICJvZmZpY2UiOiAiTmFtZSBvZiBPZmZpY2UiLCAiYmFncyI6IG51bGwsICJyZWNlaXZlZCI6IG51bGwsICJpc3N1ZWQiOiBudWxsLCAibWlzc2VudCI6IG51bGwsICJtaXNzZW50X3BjdCI6IG51bGwsICJydHMiOiBudWxsLCAicnRzX3BjdCI6IG51bGwsICJkZXBvc2l0IjogbnVsbCwgImRlbGl2ZXJlZCI6IG51bGwsICJkZWxpdmVyeV9wY3QiOiBudWxsLCAiZGVsaXZlcnlfcnRzX3BjdCI6IG51bGx9LCB7ImRhdGUiOiAiMjAyNi0wOC0xNSIsICJvZmZpY2UiOiAiSURDIFNSVCBOYWdhciBQTyIsICJiYWdzIjogbnVsbCwgInJlY2VpdmVkIjogbnVsbCwgImlzc3VlZCI6IG51bGwsICJtaXNzZW50IjogbnVsbCwgIm1pc3NlbnRfcGN0IjogbnVsbCwgInJ0cyI6IG51bGwsICJydHNfcGN0IjogbnVsbCwgImRlcG9zaXQiOiBudWxsLCAiZGVsaXZlcmVkIjogbnVsbCwgImRlbGl2ZXJ5X3BjdCI6IG51bGwsICJkZWxpdmVyeV9ydHNfcGN0IjogbnVsbH0sIHsiZGF0ZSI6ICIyMDI2LTA4LTE1IiwgIm9mZmljZSI6ICJSYXNodHJhcGF0aSBCaGF3YW4gUE8iLCAiYmFncyI6IG51bGwsICJyZWNlaXZlZCI6IG51bGwsICJpc3N1ZWQiOiBudWxsLCAibWlzc2VudCI6IG51bGwsICJtaXNzZW50X3BjdCI6IG51bGwsICJydHMiOiBudWxsLCAicnRzX3BjdCI6IG51bGwsICJkZXBvc2l0IjogbnVsbCwgImRlbGl2ZXJlZCI6IG51bGwsICJkZWxpdmVyeV9wY3QiOiBudWxsLCAiZGVsaXZlcnlfcnRzX3BjdCI6IG51bGx9LCB7ImRhdGUiOiAiMjAyNi0wOC0xNSIsICJvZmZpY2UiOiAiVVBTQyBQTyIsICJiYWdzIjogbnVsbCwgInJlY2VpdmVkIjogbnVsbCwgImlzc3VlZCI6IG51bGwsICJtaXNzZW50IjogbnVsbCwgIm1pc3NlbnRfcGN0IjogbnVsbCwgInJ0cyI6IG51bGwsICJydHNfcGN0IjogbnVsbCwgImRlcG9zaXQiOiBudWxsLCAiZGVsaXZlcmVkIjogbnVsbCwgImRlbGl2ZXJ5X3BjdCI6IG51bGwsICJkZWxpdmVyeV9ydHNfcGN0IjogbnVsbH0sIHsiZGF0ZSI6ICIyMDI2LTA4LTE1IiwgIm9mZmljZSI6ICJOb2RhbCBEZWxpdmVyeSBDZW50cmUiLCAiYmFncyI6IG51bGwsICJyZWNlaXZlZCI6IG51bGwsICJpc3N1ZWQiOiBudWxsLCAibWlzc2VudCI6IG51bGwsICJtaXNzZW50X3BjdCI6IG51bGwsICJydHMiOiBudWxsLCAicnRzX3BjdCI6IG51bGwsICJkZXBvc2l0IjogbnVsbCwgImRlbGl2ZXJlZCI6IG51bGwsICJkZWxpdmVyeV9wY3QiOiBudWxsLCAiZGVsaXZlcnlfcnRzX3BjdCI6IG51bGx9LCB7ImRhdGUiOiAiMjAyNi0wOC0xNSIsICJvZmZpY2UiOiAiTmFtZSBvZiBPZmZpY2UiLCAiYmFncyI6IG51bGwsICJyZWNlaXZlZCI6IG51bGwsICJpc3N1ZWQiOiBudWxsLCAibWlzc2VudCI6IG51bGwsICJtaXNzZW50X3BjdCI6IG51bGwsICJydHMiOiBudWxsLCAicnRzX3BjdCI6IG51bGwsICJkZXBvc2l0IjogbnVsbCwgImRlbGl2ZXJlZCI6IG51bGwsICJkZWxpdmVyeV9wY3QiOiBudWxsLCAiZGVsaXZlcnlfcnRzX3BjdCI6IG51bGx9LCB7ImRhdGUiOiAiMjAyNi0wOC0xNiIsICJvZmZpY2UiOiAiSURDIFNSVCBOYWdhciBQTyIsICJiYWdzIjogNy4wLCAicmVjZWl2ZWQiOiAxMDYuMCwgImlzc3VlZCI6IDEwNS4wLCAibWlzc2VudCI6IDEuMCwgIm1pc3NlbnRfcGN0IjogMC45NDMzOTYyMjY0LCAicnRzIjogMi4wLCAicnRzX3BjdCI6IDEuODg2NzkyNDUzLCAiZGVwb3NpdCI6IDM3LjAsICJkZWxpdmVyZWQiOiA2Ni4wLCAiZGVsaXZlcnlfcGN0IjogNjIuODU3MTQyODYsICJkZWxpdmVyeV9ydHNfcGN0IjogNjQuNzYxOTA0NzZ9LCB7ImRhdGUiOiAiMjAyNi0wOC0xNiIsICJvZmZpY2UiOiAiUmFzaHRyYXBhdGkgQmhhd2FuIFBPIiwgImJhZ3MiOiAwLjAsICJyZWNlaXZlZCI6IDAuMCwgImlzc3VlZCI6IDAuMCwgIm1pc3NlbnQiOiAwLjAsICJtaXNzZW50X3BjdCI6IG51bGwsICJydHMiOiAwLjAsICJydHNfcGN0IjogbnVsbCwgImRlcG9zaXQiOiAwLjAsICJkZWxpdmVyZWQiOiAwLjAsICJkZWxpdmVyeV9wY3QiOiBudWxsLCAiZGVsaXZlcnlfcnRzX3BjdCI6IG51bGx9LCB7ImRhdGUiOiAiMjAyNi0wOC0xNiIsICJvZmZpY2UiOiAiVVBTQyBQTyIsICJiYWdzIjogMC4wLCAicmVjZWl2ZWQiOiAwLjAsICJpc3N1ZWQiOiAwLjAsICJtaXNzZW50IjogMC4wLCAibWlzc2VudF9wY3QiOiBudWxsLCAicnRzIjogMC4wLCAicnRzX3BjdCI6IG51bGwsICJkZXBvc2l0IjogMC4wLCAiZGVsaXZlcmVkIjogMC4wLCAiZGVsaXZlcnlfcGN0IjogbnVsbCwgImRlbGl2ZXJ5X3J0c19wY3QiOiBudWxsfSwgeyJkYXRlIjogIjIwMjYtMDgtMTYiLCAib2ZmaWNlIjogIk5vZGFsIERlbGl2ZXJ5IENlbnRyZSIsICJiYWdzIjogMTgxLjAsICJyZWNlaXZlZCI6IDIwOTguMCwgImlzc3VlZCI6IDEwMjEuMCwgIm1pc3NlbnQiOiAzOS4wLCAibWlzc2VudF9wY3QiOiAxLjg1ODkxMzI1MSwgInJ0cyI6IDE5LjAsICJydHNfcGN0IjogMC45MDU2MjQ0MDQyLCAiZGVwb3NpdCI6IDExNDEuMCwgImRlbGl2ZXJlZCI6IDk1My4wLCAiZGVsaXZlcnlfcGN0IjogOTMuMzM5ODYyODgsICJkZWxpdmVyeV9ydHNfcGN0IjogOTUuMjAwNzgzNTV9LCB7ImRhdGUiOiAiMjAyNi0wOC0xNiIsICJvZmZpY2UiOiAiTmFtZSBvZiBPZmZpY2UiLCAiYmFncyI6IG51bGwsICJyZWNlaXZlZCI6IG51bGwsICJpc3N1ZWQiOiBudWxsLCAibWlzc2VudCI6IG51bGwsICJtaXNzZW50X3BjdCI6IG51bGwsICJydHMiOiBudWxsLCAicnRzX3BjdCI6IG51bGwsICJkZXBvc2l0IjogbnVsbCwgImRlbGl2ZXJlZCI6IG51bGwsICJkZWxpdmVyeV9wY3QiOiBudWxsLCAiZGVsaXZlcnlfcnRzX3BjdCI6IG51bGx9LCB7ImRhdGUiOiAiMjAyNi0wOC0xNyIsICJvZmZpY2UiOiAiSURDIFNSVCBOYWdhciBQTyIsICJiYWdzIjogMzMuMCwgInJlY2VpdmVkIjogNjk3MC4wLCAiaXNzdWVkIjogNjA4NC4wLCAibWlzc2VudCI6IDMzOS4wLCAibWlzc2VudF9wY3QiOiA0Ljg2MzcwMTU3OCwgInJ0cyI6IDM0MS4wLCAicnRzX3BjdCI6IDQuODkyMzk1OTgzLCAiZGVwb3NpdCI6IDY0Ny4wLCAiZGVsaXZlcmVkIjogNTY0My4wLCAiZGVsaXZlcnlfcGN0IjogOTIuNzUxNDc5MjksICJkZWxpdmVyeV9ydHNfcGN0IjogOTguMzU2MzQ0NTF9LCB7ImRhdGUiOiAiMjAyNi0wOC0xNyIsICJvZmZpY2UiOiAiUmFzaHRyYXBhdGkgQmhhd2FuIFBPIiwgImJhZ3MiOiA4LjAsICJyZWNlaXZlZCI6IDQ3NS4wLCAiaXNzdWVkIjogNDczLjAsICJtaXNzZW50IjogMy4wLCAibWlzc2VudF9wY3QiOiAwLjYzMTU3ODk0NzQsICJydHMiOiA5LjAsICJydHNfcGN0IjogMS44OTQ3MzY4NDIsICJkZXBvc2l0IjogMS4wLCAiZGVsaXZlcmVkIjogNDYzLjAsICJkZWxpdmVyeV9wY3QiOiA5Ny44ODU4MzUxLCAiZGVsaXZlcnlfcnRzX3BjdCI6IDk5Ljc4ODU4MzUxfSwgeyJkYXRlIjogIjIwMjYtMDgtMTciLCAib2ZmaWNlIjogIlVQU0MgUE8iLCAiYmFncyI6IDEyLjAsICJyZWNlaXZlZCI6IDE5MS4wLCAiaXNzdWVkIjogMTg2LjAsICJtaXNzZW50IjogNS4wLCAibWlzc2VudF9wY3QiOiAyLjYxNzgwMTA0NywgInJ0cyI6IDAuMCwgInJ0c19wY3QiOiAwLjAsICJkZXBvc2l0IjogMC4wLCAiZGVsaXZlcmVkIjogMTg2LjAsICJkZWxpdmVyeV9wY3QiOiAxMDAuMCwgImRlbGl2ZXJ5X3J0c19wY3QiOiAxMDAuMH0sIHsiZGF0ZSI6ICIyMDI2LTA4LTE3IiwgIm9mZmljZSI6ICJOb2RhbCBEZWxpdmVyeSBDZW50cmUiLCAiYmFncyI6IDIwNy4wLCAicmVjZWl2ZWQiOiAyNTYwLjAsICJpc3N1ZWQiOiAzNjQ1LjAsICJtaXNzZW50IjogNTYuMCwgIm1pc3NlbnRfcGN0IjogMi4xODc1LCAicnRzIjogMTkyLjAsICJydHNfcGN0IjogNy41LCAiZGVwb3NpdCI6IDE3MS4wLCAiZGVsaXZlcmVkIjogMzI4Mi4wLCAiZGVsaXZlcnlfcGN0IjogOTAuMDQxMTUyMjYsICJkZWxpdmVyeV9ydHNfcGN0IjogOTUuMzA4NjQxOTh9LCB7ImRhdGUiOiAiMjAyNi0wOC0xNyIsICJvZmZpY2UiOiAiTmFtZSBvZiBPZmZpY2UiLCAiYmFncyI6IG51bGwsICJyZWNlaXZlZCI6IG51bGwsICJpc3N1ZWQiOiBudWxsLCAibWlzc2VudCI6IG51bGwsICJtaXNzZW50X3BjdCI6IG51bGwsICJydHMiOiBudWxsLCAicnRzX3BjdCI6IG51bGwsICJkZXBvc2l0IjogbnVsbCwgImRlbGl2ZXJlZCI6IG51bGwsICJkZWxpdmVyeV9wY3QiOiBudWxsLCAiZGVsaXZlcnlfcnRzX3BjdCI6IG51bGx9LCB7ImRhdGUiOiAiMjAyNi0wOC0xOCIsICJvZmZpY2UiOiAiSURDIFNSVCBOYWdhciBQTyIsICJiYWdzIjogMjIuMCwgInJlY2VpdmVkIjogMzQ5Ny4wLCAiaXNzdWVkIjogMzMxMi4wLCAibWlzc2VudCI6IDE4NS4wLCAibWlzc2VudF9wY3QiOiA1LjI5MDI0ODc4NSwgInJ0cyI6IDMxMC4wLCAicnRzX3BjdCI6IDguODY0NzQxMjA3LCAiZGVwb3NpdCI6IDY3LjAsICJkZWxpdmVyZWQiOiAyOTM1LjAsICJkZWxpdmVyeV9wY3QiOiA4OC42MTcxNDk3NiwgImRlbGl2ZXJ5X3J0c19wY3QiOiA5Ny45NzcwNTMxNDAwMDAwMX0sIHsiZGF0ZSI6ICIyMDI2LTA4LTE4IiwgIm9mZmljZSI6ICJSYXNodHJhcGF0aSBCaGF3YW4gUE8iLCAiYmFncyI6IDcuMCwgInJlY2VpdmVkIjogMjA3LjAsICJpc3N1ZWQiOiAyMDcuMCwgIm1pc3NlbnQiOiAxLjAsICJtaXNzZW50X3BjdCI6IDAuNDgzMDkxNzg3NCwgInJ0cyI6IDAuMCwgInJ0c19wY3QiOiAwLjAsICJkZXBvc2l0IjogMC4wLCAiZGVsaXZlcmVkIjogMjA3LjAsICJkZWxpdmVyeV9wY3QiOiAxMDAuMCwgImRlbGl2ZXJ5X3J0c19wY3QiOiAxMDAuMH0sIHsiZGF0ZSI6ICIyMDI2LTA4LTE4IiwgIm9mZmljZSI6ICJVUFNDIFBPIiwgImJhZ3MiOiA0LjAsICJyZWNlaXZlZCI6IDQ4LjAsICJpc3N1ZWQiOiA0Ni4wLCAibWlzc2VudCI6IDIuMCwgIm1pc3NlbnRfcGN0IjogNC4xNjY2NjY2NjY5OTk5OTksICJydHMiOiAyLjAsICJydHNfcGN0IjogNC4xNjY2NjY2NjY5OTk5OTksICJkZXBvc2l0IjogMC4wLCAiZGVsaXZlcmVkIjogNDQuMCwgImRlbGl2ZXJ5X3BjdCI6IDk1LjY1MjE3MzkxLCAiZGVsaXZlcnlfcnRzX3BjdCI6IDEwMC4wfSwgeyJkYXRlIjogIjIwMjYtMDgtMTgiLCAib2ZmaWNlIjogIk5vZGFsIERlbGl2ZXJ5IENlbnRyZSIsICJiYWdzIjogMTMxLjAsICJyZWNlaXZlZCI6IDE4MDUuMCwgImlzc3VlZCI6IDE5MTguMCwgIm1pc3NlbnQiOiA1OC4wLCAibWlzc2VudF9wY3QiOiAzLjIxMzI5NjM5OSwgInJ0cyI6IDgxLjAsICJydHNfcGN0IjogNC40ODc1MzQ2MjU5OTk5OTk1LCAiZGVwb3NpdCI6IDI4LjAsICJkZWxpdmVyZWQiOiAxODA5LjAsICJkZWxpdmVyeV9wY3QiOiA5NC4zMTY5OTY4NywgImRlbGl2ZXJ5X3J0c19wY3QiOiA5OC41NDAxNDU5OX0sIHsiZGF0ZSI6ICIyMDI2LTA4LTE4IiwgIm9mZmljZSI6ICJOYW1lIG9mIE9mZmljZSIsICJiYWdzIjogbnVsbCwgInJlY2VpdmVkIjogbnVsbCwgImlzc3VlZCI6IG51bGwsICJtaXNzZW50IjogbnVsbCwgIm1pc3NlbnRfcGN0IjogbnVsbCwgInJ0cyI6IG51bGwsICJydHNfcGN0IjogbnVsbCwgImRlcG9zaXQiOiBudWxsLCAiZGVsaXZlcmVkIjogbnVsbCwgImRlbGl2ZXJ5X3BjdCI6IG51bGwsICJkZWxpdmVyeV9ydHNfcGN0IjogbnVsbH0sIHsiZGF0ZSI6ICIyMDI2LTA4LTE5IiwgIm9mZmljZSI6ICJJREMgU1JUIE5hZ2FyIFBPIiwgImJhZ3MiOiAyNi4wLCAicmVjZWl2ZWQiOiAzMTMxLjAsICJpc3N1ZWQiOiAyOTQxLjAsICJtaXNzZW50IjogMTkwLjAsICJtaXNzZW50X3BjdCI6IDYuMDY4MzQ4NzcsICJydHMiOiAxNzUuMCwgInJ0c19wY3QiOiA1LjU4OTI2ODYwNCwgImRlcG9zaXQiOiA0NS4wLCAiZGVsaXZlcmVkIjogMjcyMS4wLCAiZGVsaXZlcnlfcGN0IjogOTIuNTE5NTUxMTcsICJkZWxpdmVyeV9ydHNfcGN0IjogOTguNDY5OTA4MTl9LCB7ImRhdGUiOiAiMjAyNi0wOC0xOSIsICJvZmZpY2UiOiAiUmFzaHRyYXBhdGkgQmhhd2FuIFBPIiwgImJhZ3MiOiA1LjAsICJyZWNlaXZlZCI6IDExMC4wLCAiaXNzdWVkIjogMTEwLjAsICJtaXNzZW50IjogMC4wLCAibWlzc2VudF9wY3QiOiAwLjAsICJydHMiOiAxLjAsICJydHNfcGN0IjogMC45MDkwOTA5MDkxLCAiZGVwb3NpdCI6IDAuMCwgImRlbGl2ZXJlZCI6IDEwOS4wLCAiZGVsaXZlcnlfcGN0IjogOTkuMDkwOTA5MDksICJkZWxpdmVyeV9ydHNfcGN0IjogMTAwLjB9LCB7ImRhdGUiOiAiMjAyNi0wOC0xOSIsICJvZmZpY2UiOiAiVVBTQyBQTyIsICJiYWdzIjogNS4wLCAicmVjZWl2ZWQiOiA5MC4wLCAiaXNzdWVkIjogODguMCwgIm1pc3NlbnQiOiAyLjAsICJtaXNzZW50X3BjdCI6IDIuMjIyMjIyMjIyLCAicnRzIjogMy4wLCAicnRzX3BjdCI6IDMuMzMzMzMzMzMzLCAiZGVwb3NpdCI6IDAuMCwgImRlbGl2ZXJlZCI6IDg1LjAsICJkZWxpdmVyeV9wY3QiOiA5Ni41OTA5MDkwOSwgImRlbGl2ZXJ5X3J0c19wY3QiOiAxMDAuMH0sIHsiZGF0ZSI6ICIyMDI2LTA4LTE5IiwgIm9mZmljZSI6ICJOb2RhbCBEZWxpdmVyeSBDZW50cmUiLCAiYmFncyI6IDEwMC4wLCAicmVjZWl2ZWQiOiAxMTE0LjAsICJpc3N1ZWQiOiAxMTEyLjAsICJtaXNzZW50IjogMzAuMCwgIm1pc3NlbnRfcGN0IjogMi42OTI5OTgyMDUsICJydHMiOiA0NS4wLCAicnRzX3BjdCI6IDQuMDM5NDk3MzA2OTk5OTk5NSwgImRlcG9zaXQiOiAxNi4wLCAiZGVsaXZlcmVkIjogMTA1MS4wLCAiZGVsaXZlcnlfcGN0IjogOTQuNTE0Mzg4NDksICJkZWxpdmVyeV9ydHNfcGN0IjogOTguNTYxMTUxMDh9LCB7ImRhdGUiOiAiMjAyNi0wOC0xOSIsICJvZmZpY2UiOiAiTmFtZSBvZiBPZmZpY2UiLCAiYmFncyI6IG51bGwsICJyZWNlaXZlZCI6IG51bGwsICJpc3N1ZWQiOiBudWxsLCAibWlzc2VudCI6IG51bGwsICJtaXNzZW50X3BjdCI6IG51bGwsICJydHMiOiBudWxsLCAicnRzX3BjdCI6IG51bGwsICJkZXBvc2l0IjogbnVsbCwgImRlbGl2ZXJlZCI6IG51bGwsICJkZWxpdmVyeV9wY3QiOiBudWxsLCAiZGVsaXZlcnlfcnRzX3BjdCI6IG51bGx9LCB7ImRhdGUiOiAiMjAyNi0wOC0yMCIsICJvZmZpY2UiOiAiSURDIFNSVCBOYWdhciBQTyIsICJiYWdzIjogMjguMCwgInJlY2VpdmVkIjogMjkyMy4wLCAiaXNzdWVkIjogMjcxNi4wLCAibWlzc2VudCI6IDIwNy4wLCAibWlzc2VudF9wY3QiOiA3LjA4MTc2NTMxMDAwMDAwMSwgInJ0cyI6IDI3NC4wLCAicnRzX3BjdCI6IDkuMzczOTMwODkzLCAiZGVwb3NpdCI6IDM1LjAsICJkZWxpdmVyZWQiOiAyNDA3LjAsICJkZWxpdmVyeV9wY3QiOiA4OC42MjI5NzQ5NiwgImRlbGl2ZXJ5X3J0c19wY3QiOiA5OC43MTEzNDAyMX0sIHsiZGF0ZSI6ICIyMDI2LTA4LTIwIiwgIm9mZmljZSI6ICJSYXNodHJhcGF0aSBCaGF3YW4gUE8iLCAiYmFncyI6IDUuMCwgInJlY2VpdmVkIjogMTI0LjAsICJpc3N1ZWQiOiAxMjIuMCwgIm1pc3NlbnQiOiAyLjAsICJtaXNzZW50X3BjdCI6IDEuNjEyOTAzMjI1OTk5OTk5OCwgInJ0cyI6IDEuMCwgInJ0c19wY3QiOiAwLjgwNjQ1MTYxMjkwMDAwMDEsICJkZXBvc2l0IjogMC4wLCAiZGVsaXZlcmVkIjogMTIxLjAsICJkZWxpdmVyeV9wY3QiOiA5OS4xODAzMjc4NywgImRlbGl2ZXJ5X3J0c19wY3QiOiAxMDAuMH0sIHsiZGF0ZSI6ICIyMDI2LTA4LTIwIiwgIm9mZmljZSI6ICJVUFNDIFBPIiwgImJhZ3MiOiA2LjAsICJyZWNlaXZlZCI6IDQyLjAsICJpc3N1ZWQiOiA0MS4wLCAibWlzc2VudCI6IDEuMCwgIm1pc3NlbnRfcGN0IjogMi4zODA5NTIzODEsICJydHMiOiAwLjAsICJydHNfcGN0IjogMC4wLCAiZGVwb3NpdCI6IDAuMCwgImRlbGl2ZXJlZCI6IDQxLjAsICJkZWxpdmVyeV9wY3QiOiAxMDAuMCwgImRlbGl2ZXJ5X3J0c19wY3QiOiAxMDAuMH0sIHsiZGF0ZSI6ICIyMDI2LTA4LTIwIiwgIm9mZmljZSI6ICJOb2RhbCBEZWxpdmVyeSBDZW50cmUiLCAiYmFncyI6IDE1My4wLCAicmVjZWl2ZWQiOiAxNjk2LjAsICJpc3N1ZWQiOiAxNjU5LjAsICJtaXNzZW50IjogNTMuMCwgIm1pc3NlbnRfcGN0IjogMy4xMjUsICJydHMiOiAxMDMuMCwgInJ0c19wY3QiOiA2LjA3MzExMzIwOCwgImRlcG9zaXQiOiAzOS4wLCAiZGVsaXZlcmVkIjogMTUxNy4wLCAiZGVsaXZlcnlfcGN0IjogOTEuNDQwNjI2ODgsICJkZWxpdmVyeV9ydHNfcGN0IjogOTcuNjQ5MTg2MjZ9LCB7ImRhdGUiOiAiMjAyNi0wOC0yMCIsICJvZmZpY2UiOiAiTmFtZSBvZiBPZmZpY2UiLCAiYmFncyI6IG51bGwsICJyZWNlaXZlZCI6IG51bGwsICJpc3N1ZWQiOiBudWxsLCAibWlzc2VudCI6IG51bGwsICJtaXNzZW50X3BjdCI6IG51bGwsICJydHMiOiBudWxsLCAicnRzX3BjdCI6IG51bGwsICJkZXBvc2l0IjogbnVsbCwgImRlbGl2ZXJlZCI6IG51bGwsICJkZWxpdmVyeV9wY3QiOiBudWxsLCAiZGVsaXZlcnlfcnRzX3BjdCI6IG51bGx9LCB7ImRhdGUiOiAiMjAyNi0wOC0yMSIsICJvZmZpY2UiOiAiSURDIFNSVCBOYWdhciBQTyIsICJiYWdzIjogMjkuMCwgInJlY2VpdmVkIjogMzAwNi4wLCAiaXNzdWVkIjogMjgxNi4wLCAibWlzc2VudCI6IDE5MC4wLCAibWlzc2VudF9wY3QiOiA2LjMyMDY5MTk0ODk5OTk5OTUsICJydHMiOiAyNjguMCwgInJ0c19wY3QiOiA4LjkxNTUwMjMyODk5OTk5OSwgImRlcG9zaXQiOiA0Ni4wLCAiZGVsaXZlcmVkIjogMjUwMi4wLCAiZGVsaXZlcnlfcGN0IjogODguODQ5NDMxODIsICJkZWxpdmVyeV9ydHNfcGN0IjogOTguMzY2NDc3MjY5OTk5OTl9LCB7ImRhdGUiOiAiMjAyNi0wOC0yMSIsICJvZmZpY2UiOiAiUmFzaHRyYXBhdGkgQmhhd2FuIFBPIiwgImJhZ3MiOiA1LjAsICJyZWNlaXZlZCI6IDE3Ny4wLCAiaXNzdWVkIjogMTc2LjAsICJtaXNzZW50IjogMS4wLCAibWlzc2VudF9wY3QiOiAwLjU2NDk3MTc1MTQsICJydHMiOiAyNS4wLCAicnRzX3BjdCI6IDE0LjEyNDI5Mzc5MDAwMDAwMSwgImRlcG9zaXQiOiAwLjAsICJkZWxpdmVyZWQiOiAxNTEuMCwgImRlbGl2ZXJ5X3BjdCI6IDg1Ljc5NTQ1NDU1LCAiZGVsaXZlcnlfcnRzX3BjdCI6IDEwMC4wfSwgeyJkYXRlIjogIjIwMjYtMDgtMjEiLCAib2ZmaWNlIjogIlVQU0MgUE8iLCAiYmFncyI6IDQuMCwgInJlY2VpdmVkIjogNDkuMCwgImlzc3VlZCI6IDQ4LjAsICJtaXNzZW50IjogMS4wLCAibWlzc2VudF9wY3QiOiAyLjA0MDgxNjMyNywgInJ0cyI6IDEuMCwgInJ0c19wY3QiOiAyLjA0MDgxNjMyNywgImRlcG9zaXQiOiAwLjAsICJkZWxpdmVyZWQiOiA0Ny4wLCAiZGVsaXZlcnlfcGN0IjogOTcuOTE2NjY2NjcsICJkZWxpdmVyeV9ydHNfcGN0IjogMTAwLjB9LCB7ImRhdGUiOiAiMjAyNi0wOC0yMSIsICJvZmZpY2UiOiAiTm9kYWwgRGVsaXZlcnkgQ2VudHJlIiwgImJhZ3MiOiAxMjYuMCwgInJlY2VpdmVkIjogMTg4MC4wLCAiaXNzdWVkIjogMTgzNS4wLCAibWlzc2VudCI6IDg0LjAsICJtaXNzZW50X3BjdCI6IDQuNDY4MDg1MTA2LCAicnRzIjogOTEuMCwgInJ0c19wY3QiOiA0Ljg0MDQyNTUzMiwgImRlcG9zaXQiOiAxNi4wLCAiZGVsaXZlcmVkIjogMTcyOC4wLCAiZGVsaXZlcnlfcGN0IjogOTQuMTY4OTM3MzMsICJkZWxpdmVyeV9ydHNfcGN0IjogOTkuMTI4MDY1NH0sIHsiZGF0ZSI6ICIyMDI2LTA4LTIxIiwgIm9mZmljZSI6ICJOYW1lIG9mIE9mZmljZSIsICJiYWdzIjogbnVsbCwgInJlY2VpdmVkIjogbnVsbCwgImlzc3VlZCI6IG51bGwsICJtaXNzZW50IjogbnVsbCwgIm1pc3NlbnRfcGN0IjogbnVsbCwgInJ0cyI6IG51bGwsICJydHNfcGN0IjogbnVsbCwgImRlcG9zaXQiOiBudWxsLCAiZGVsaXZlcmVkIjogbnVsbCwgImRlbGl2ZXJ5X3BjdCI6IG51bGwsICJkZWxpdmVyeV9ydHNfcGN0IjogbnVsbH0sIHsiZGF0ZSI6ICIyMDI2LTA4LTIyIiwgIm9mZmljZSI6ICJJREMgU1JUIE5hZ2FyIFBPIiwgImJhZ3MiOiAyNS4wLCAicmVjZWl2ZWQiOiAzODY0LjAsICJpc3N1ZWQiOiAzMDQzLjAsICJtaXNzZW50IjogMTQ4LjAsICJtaXNzZW50X3BjdCI6IDMuODMwMjI3NzQyOTk5OTk5NiwgInJ0cyI6IDIxMC4wLCAicnRzX3BjdCI6IDUuNDM0NzgyNjA5LCAiZGVwb3NpdCI6IDczMi4wLCAiZGVsaXZlcmVkIjogMjc3NC4wLCAiZGVsaXZlcnlfcGN0IjogOTEuMTYwMDM5NDMsICJkZWxpdmVyeV9ydHNfcGN0IjogOTguMDYxMTIzODl9LCB7ImRhdGUiOiAiMjAyNi0wOC0yMiIsICJvZmZpY2UiOiAiUmFzaHRyYXBhdGkgQmhhd2FuIFBPIiwgImJhZ3MiOiA4LjAsICJyZWNlaXZlZCI6IDEyNC4wLCAiaXNzdWVkIjogMTIzLjAsICJtaXNzZW50IjogMS4wLCAibWlzc2VudF9wY3QiOiAwLjgwNjQ1MTYxMjkwMDAwMDEsICJydHMiOiAxLjAsICJydHNfcGN0IjogMC44MDY0NTE2MTI5MDAwMDAxLCAiZGVwb3NpdCI6IDAuMCwgImRlbGl2ZXJlZCI6IDEyMi4wLCAiZGVsaXZlcnlfcGN0IjogOTkuMTg2OTkxODcsICJkZWxpdmVyeV9ydHNfcGN0IjogMTAwLjB9LCB7ImRhdGUiOiAiMjAyNi0wOC0yMiIsICJvZmZpY2UiOiAiVVBTQyBQTyIsICJiYWdzIjogMi4wLCAicmVjZWl2ZWQiOiAyLjAsICJpc3N1ZWQiOiAyLjAsICJtaXNzZW50IjogMC4wLCAibWlzc2VudF9wY3QiOiAwLjAsICJydHMiOiAwLjAsICJydHNfcGN0IjogMC4wLCAiZGVwb3NpdCI6IDAuMCwgImRlbGl2ZXJlZCI6IDIuMCwgImRlbGl2ZXJ5X3BjdCI6IDEwMC4wLCAiZGVsaXZlcnlfcnRzX3BjdCI6IDEwMC4wfSwgeyJkYXRlIjogIjIwMjYtMDgtMjIiLCAib2ZmaWNlIjogIk5vZGFsIERlbGl2ZXJ5IENlbnRyZSIsICJiYWdzIjogMTc5LjAsICJyZWNlaXZlZCI6IDE2NzkuMCwgImlzc3VlZCI6IDE2MDkuMCwgIm1pc3NlbnQiOiA4Ni4wLCAibWlzc2VudF9wY3QiOiA1LjEyMjA5NjQ4NiwgInJ0cyI6IDIyLjAsICJydHNfcGN0IjogMS4zMTAzMDM3NTE5OTk5OTk4LCAiZGVwb3NpdCI6IDI5OS4wLCAiZGVsaXZlcmVkIjogMTI4OC4wLCAiZGVsaXZlcnlfcGN0IjogODAuMDQ5NzIwMzE5OTk5OTksICJkZWxpdmVyeV9ydHNfcGN0IjogODEuNDE3MDI5MjEwMDAwMDF9LCB7ImRhdGUiOiAiMjAyNi0wOC0yMiIsICJvZmZpY2UiOiAiTmFtZSBvZiBPZmZpY2UiLCAiYmFncyI6IG51bGwsICJyZWNlaXZlZCI6IG51bGwsICJpc3N1ZWQiOiBudWxsLCAibWlzc2VudCI6IG51bGwsICJtaXNzZW50X3BjdCI6IG51bGwsICJydHMiOiBudWxsLCAicnRzX3BjdCI6IG51bGwsICJkZXBvc2l0IjogbnVsbCwgImRlbGl2ZXJlZCI6IG51bGwsICJkZWxpdmVyeV9wY3QiOiBudWxsLCAiZGVsaXZlcnlfcnRzX3BjdCI6IG51bGx9LCB7ImRhdGUiOiAiMjAyNi0wOC0yMyIsICJvZmZpY2UiOiAiSURDIFNSVCBOYWdhciBQTyIsICJiYWdzIjogNi4wLCAicmVjZWl2ZWQiOiA1NC4wLCAiaXNzdWVkIjogNTQuMCwgIm1pc3NlbnQiOiAwLjAsICJtaXNzZW50X3BjdCI6IDAuMCwgInJ0cyI6IDAuMCwgInJ0c19wY3QiOiAwLjAsICJkZXBvc2l0IjogNS4wLCAiZGVsaXZlcmVkIjogNDkuMCwgImRlbGl2ZXJ5X3BjdCI6IDkwLjc0MDc0MDc0LCAiZGVsaXZlcnlfcnRzX3BjdCI6IDkwLjc0MDc0MDc0fSwgeyJkYXRlIjogIjIwMjYtMDgtMjMiLCAib2ZmaWNlIjogIlJhc2h0cmFwYXRpIEJoYXdhbiBQTyIsICJiYWdzIjogMC4wLCAicmVjZWl2ZWQiOiAwLjAsICJpc3N1ZWQiOiAwLjAsICJtaXNzZW50IjogMC4wLCAibWlzc2VudF9wY3QiOiBudWxsLCAicnRzIjogMC4wLCAicnRzX3BjdCI6IG51bGwsICJkZXBvc2l0IjogMC4wLCAiZGVsaXZlcmVkIjogMC4wLCAiZGVsaXZlcnlfcGN0IjogbnVsbCwgImRlbGl2ZXJ5X3J0c19wY3QiOiBudWxsfSwgeyJkYXRlIjogIjIwMjYtMDgtMjMiLCAib2ZmaWNlIjogIlVQU0MgUE8iLCAiYmFncyI6IDAuMCwgInJlY2VpdmVkIjogMC4wLCAiaXNzdWVkIjogMC4wLCAibWlzc2VudCI6IDAuMCwgIm1pc3NlbnRfcGN0IjogbnVsbCwgInJ0cyI6IG51bGwsICJydHNfcGN0IjogbnVsbCwgImRlcG9zaXQiOiAwLjAsICJkZWxpdmVyZWQiOiAwLjAsICJkZWxpdmVyeV9wY3QiOiBudWxsLCAiZGVsaXZlcnlfcnRzX3BjdCI6IG51bGx9LCB7ImRhdGUiOiAiMjAyNi0wOC0yMyIsICJvZmZpY2UiOiAiTm9kYWwgRGVsaXZlcnkgQ2VudHJlIiwgImJhZ3MiOiAyMDAuMCwgInJlY2VpdmVkIjogMTc3OC4wLCAiaXNzdWVkIjogODgxLjAsICJtaXNzZW50IjogMzkuMCwgIm1pc3NlbnRfcGN0IjogMi4xOTM0NzU4MTYwMDAwMDAzLCAicnRzIjogNC4wLCAicnRzX3BjdCI6IDAuMjI0OTcxODc4NDk5OTk5OTcsICJkZXBvc2l0IjogMTE5Ny4wLCAiZGVsaXZlcmVkIjogODM3LjAsICJkZWxpdmVyeV9wY3QiOiA5NS4wMDU2NzUzNjk5OTk5OSwgImRlbGl2ZXJ5X3J0c19wY3QiOiA5NS40NTk3MDQ4Nzk5OTk5OX0sIHsiZGF0ZSI6ICIyMDI2LTA4LTIzIiwgIm9mZmljZSI6ICJOYW1lIG9mIE9mZmljZSIsICJiYWdzIjogbnVsbCwgInJlY2VpdmVkIjogbnVsbCwgImlzc3VlZCI6IG51bGwsICJtaXNzZW50IjogbnVsbCwgIm1pc3NlbnRfcGN0IjogbnVsbCwgInJ0cyI6IG51bGwsICJydHNfcGN0IjogbnVsbCwgImRlcG9zaXQiOiBudWxsLCAiZGVsaXZlcmVkIjogbnVsbCwgImRlbGl2ZXJ5X3BjdCI6IG51bGwsICJkZWxpdmVyeV9ydHNfcGN0IjogbnVsbH0sIHsiZGF0ZSI6ICIyMDI2LTA4LTI0IiwgIm9mZmljZSI6ICJJREMgU1JUIE5hZ2FyIFBPIiwgImJhZ3MiOiAzNy4wLCAicmVjZWl2ZWQiOiA2MjczLjAsICJpc3N1ZWQiOiA1MzYwLjAsICJtaXNzZW50IjogNDE3LjAsICJtaXNzZW50X3BjdCI6IDYuNjQ3NTM3MDY0MDAwMDAxLCAicnRzIjogMzMyLjAsICJydHNfcGN0IjogNS4yOTI1MjM1MTMsICJkZXBvc2l0IjogNTk5LjAsICJkZWxpdmVyZWQiOiA0OTI1LjAsICJkZWxpdmVyeV9wY3QiOiA5MS44ODQzMjgzNiwgImRlbGl2ZXJ5X3J0c19wY3QiOiA5OC4wNzgzNTgyMX0sIHsiZGF0ZSI6ICIyMDI2LTA4LTI0IiwgIm9mZmljZSI6ICJSYXNodHJhcGF0aSBCaGF3YW4gUE8iLCAiYmFncyI6IDEwLjAsICJyZWNlaXZlZCI6IDM0Ni4wLCAiaXNzdWVkIjogMzQ1LjAsICJtaXNzZW50IjogMS4wLCAibWlzc2VudF9wY3QiOiAwLjI4OTAxNzM0MSwgInJ0cyI6IDQuMCwgInJ0c19wY3QiOiAxLjE1NjA2OTM2NCwgImRlcG9zaXQiOiAxLjAsICJkZWxpdmVyZWQiOiAzNDAuMCwgImRlbGl2ZXJ5X3BjdCI6IDk4LjU1MDcyNDY0LCAiZGVsaXZlcnlfcnRzX3BjdCI6IDk5LjcxMDE0NDkzfSwgeyJkYXRlIjogIjIwMjYtMDgtMjQiLCAib2ZmaWNlIjogIlVQU0MgUE8iLCAiYmFncyI6IDE5LjAsICJyZWNlaXZlZCI6IDIyMi4wLCAiaXNzdWVkIjogMjEwLjAsICJtaXNzZW50IjogMTIuMCwgIm1pc3NlbnRfcGN0IjogNS40MDU0MDU0MDUsICJydHMiOiAyLjAsICJydHNfcGN0IjogMC45MDA5MDA5MDA5MDAwMDAxLCAiZGVwb3NpdCI6IDAuMCwgImRlbGl2ZXJlZCI6IDIwOC4wLCAiZGVsaXZlcnlfcGN0IjogOTkuMDQ3NjE5MDUwMDAwMDEsICJkZWxpdmVyeV9ydHNfcGN0IjogMTAwLjB9LCB7ImRhdGUiOiAiMjAyNi0wOC0yNCIsICJvZmZpY2UiOiAiTm9kYWwgRGVsaXZlcnkgQ2VudHJlIiwgImJhZ3MiOiAxNzAuMCwgInJlY2VpdmVkIjogMTg5Ny4wLCAiaXNzdWVkIjogMzAyOS4wLCAibWlzc2VudCI6IDY1LjAsICJtaXNzZW50X3BjdCI6IDMuNDI2NDYyODM2MDAwMDAwMiwgInJ0cyI6IDExMi4wLCAicnRzX3BjdCI6IDUuOTA0MDU5MDQxLCAiZGVwb3NpdCI6IDIwOC4wLCAiZGVsaXZlcmVkIjogMjcwOS4wLCAiZGVsaXZlcnlfcGN0IjogODkuNDM1NDU3MjUsICJkZWxpdmVyeV9ydHNfcGN0IjogOTMuMTMzMDQ3MjF9LCB7ImRhdGUiOiAiMjAyNi0wOC0yNCIsICJvZmZpY2UiOiAiTmFtZSBvZiBPZmZpY2UiLCAiYmFncyI6IG51bGwsICJyZWNlaXZlZCI6IG51bGwsICJpc3N1ZWQiOiBudWxsLCAibWlzc2VudCI6IG51bGwsICJtaXNzZW50X3BjdCI6IG51bGwsICJydHMiOiBudWxsLCAicnRzX3BjdCI6IG51bGwsICJkZXBvc2l0IjogbnVsbCwgImRlbGl2ZXJlZCI6IG51bGwsICJkZWxpdmVyeV9wY3QiOiBudWxsLCAiZGVsaXZlcnlfcnRzX3BjdCI6IG51bGx9LCB7ImRhdGUiOiAiMjAyNi0wOC0yNSIsICJvZmZpY2UiOiAiSURDIFNSVCBOYWdhciBQTyIsICJiYWdzIjogMjYuMCwgInJlY2VpdmVkIjogMzA1Ny4wLCAiaXNzdWVkIjogMjkyMi4wLCAibWlzc2VudCI6IDEzNS4wLCAibWlzc2VudF9wY3QiOiA0LjQxNjA5NDIxMDAwMDAwMSwgInJ0cyI6IDMyMC4wLCAicnRzX3BjdCI6IDEwLjQ2Nzc3ODg3LCAiZGVwb3NpdCI6IDczLjAsICJkZWxpdmVyZWQiOiAyNTI5LjAsICJkZWxpdmVyeV9wY3QiOiA4Ni41NTAzMDgwMSwgImRlbGl2ZXJ5X3J0c19wY3QiOiA5Ny41MDE3MTExNn0sIHsiZGF0ZSI6ICIyMDI2LTA4LTI1IiwgIm9mZmljZSI6ICJSYXNodHJhcGF0aSBCaGF3YW4gUE8iLCAiYmFncyI6IDQuMCwgInJlY2VpdmVkIjogMTQyLjAsICJpc3N1ZWQiOiAxNDMuMCwgIm1pc3NlbnQiOiAwLjAsICJtaXNzZW50X3BjdCI6IDAuMCwgInJ0cyI6IDAuMCwgInJ0c19wY3QiOiAwLjAsICJkZXBvc2l0IjogMC4wLCAiZGVsaXZlcmVkIjogMTQzLjAsICJkZWxpdmVyeV9wY3QiOiAxMDAuMCwgImRlbGl2ZXJ5X3J0c19wY3QiOiAxMDAuMH0sIHsiZGF0ZSI6ICIyMDI2LTA4LTI1IiwgIm9mZmljZSI6ICJVUFNDIFBPIiwgImJhZ3MiOiA0LjAsICJyZWNlaXZlZCI6IDc1LjAsICJpc3N1ZWQiOiA3Mi4wLCAibWlzc2VudCI6IDMuMCwgIm1pc3NlbnRfcGN0IjogNC4wLCAicnRzIjogMC4wLCAicnRzX3BjdCI6IDAuMCwgImRlcG9zaXQiOiAwLjAsICJkZWxpdmVyZWQiOiA3Mi4wLCAiZGVsaXZlcnlfcGN0IjogMTAwLjAsICJkZWxpdmVyeV9ydHNfcGN0IjogMTAwLjB9LCB7ImRhdGUiOiAiMjAyNi0wOC0yNSIsICJvZmZpY2UiOiAiTm9kYWwgRGVsaXZlcnkgQ2VudHJlIiwgImJhZ3MiOiAxNzQuMCwgInJlY2VpdmVkIjogMjI1MS4wLCAiaXNzdWVkIjogMjIxOS4wLCAibWlzc2VudCI6IDMyLjAsICJtaXNzZW50X3BjdCI6IDEuNDIxNTkwNDA0LCAicnRzIjogOTQuMCwgInJ0c19wY3QiOiA0LjE3NTkyMTgxMjk5OTk5OTUsICJkZXBvc2l0IjogNzAuMCwgImRlbGl2ZXJlZCI6IDIwNTUuMCwgImRlbGl2ZXJ5X3BjdCI6IDkyLjYwOTI4MzQ2LCAiZGVsaXZlcnlfcnRzX3BjdCI6IDk2Ljg0NTQyNTg3fSwgeyJkYXRlIjogIjIwMjYtMDgtMjUiLCAib2ZmaWNlIjogIk5hbWUgb2YgT2ZmaWNlIiwgImJhZ3MiOiBudWxsLCAicmVjZWl2ZWQiOiBudWxsLCAiaXNzdWVkIjogbnVsbCwgIm1pc3NlbnQiOiBudWxsLCAibWlzc2VudF9wY3QiOiBudWxsLCAicnRzIjogbnVsbCwgInJ0c19wY3QiOiBudWxsLCAiZGVwb3NpdCI6IG51bGwsICJkZWxpdmVyZWQiOiBudWxsLCAiZGVsaXZlcnlfcGN0IjogbnVsbCwgImRlbGl2ZXJ5X3J0c19wY3QiOiBudWxsfSwgeyJkYXRlIjogIjIwMjYtMDgtMjYiLCAib2ZmaWNlIjogIklEQyBTUlQgTmFnYXIgUE8iLCAiYmFncyI6IDQzLjAsICJyZWNlaXZlZCI6IDU4OTYuMCwgImlzc3VlZCI6IDU1NTAuMCwgIm1pc3NlbnQiOiAzNDYuMCwgIm1pc3NlbnRfcGN0IjogNS44NjgzODUzNDYsICJydHMiOiAwLjAsICJydHNfcGN0IjogMC4wLCAiZGVwb3NpdCI6IDkuMCwgImRlbGl2ZXJlZCI6IDEzMi4wLCAiZGVsaXZlcnlfcGN0IjogMi4zNzgzNzgzNzgwMDAwMDAzLCAiZGVsaXZlcnlfcnRzX3BjdCI6IDIuMzc4Mzc4Mzc4MDAwMDAwM30sIHsiZGF0ZSI6ICIyMDI2LTA4LTI2IiwgIm9mZmljZSI6ICJSYXNodHJhcGF0aSBCaGF3YW4gUE8iLCAiYmFncyI6IDEuMCwgInJlY2VpdmVkIjogMS4wLCAiaXNzdWVkIjogMS4wLCAibWlzc2VudCI6IDAuMCwgIm1pc3NlbnRfcGN0IjogMTAwLjAsICJydHMiOiAwLjAsICJydHNfcGN0IjogMC4wLCAiZGVwb3NpdCI6IDAuMCwgImRlbGl2ZXJlZCI6IDEuMCwgImRlbGl2ZXJ5X3BjdCI6IDEwMC4wLCAiZGVsaXZlcnlfcnRzX3BjdCI6IDEwMC4wfSwgeyJkYXRlIjogIjIwMjYtMDgtMjYiLCAib2ZmaWNlIjogIlVQU0MgUE8iLCAiYmFncyI6IDIuMCwgInJlY2VpdmVkIjogMi4wLCAiaXNzdWVkIjogMi4wLCAibWlzc2VudCI6IDAuMCwgIm1pc3NlbnRfcGN0IjogMC4wLCAicnRzIjogMC4wLCAicnRzX3BjdCI6IDAuMCwgImRlcG9zaXQiOiAwLjAsICJkZWxpdmVyZWQiOiAyLjAsICJkZWxpdmVyeV9wY3QiOiAxMDAuMCwgImRlbGl2ZXJ5X3J0c19wY3QiOiAxMDAuMH0sIHsiZGF0ZSI6ICIyMDI2LTA4LTI2IiwgIm9mZmljZSI6ICJOb2RhbCBEZWxpdmVyeSBDZW50cmUiLCAiYmFncyI6IDEzNi4wLCAicmVjZWl2ZWQiOiAxNjY4LjAsICJpc3N1ZWQiOiA5NTIuMCwgIm1pc3NlbnQiOiAyMi4wLCAibWlzc2VudF9wY3QiOiAxLjMxODk0NDg0NCwgInJ0cyI6IDIuMCwgInJ0c19wY3QiOiAwLjExOTkwNDA3NjY5OTk5OTk5LCAiZGVwb3NpdCI6IDI0LjAsICJkZWxpdmVyZWQiOiA5MjYuMCwgImRlbGl2ZXJ5X3BjdCI6IDk3LjI2ODkwNzU2LCAiZGVsaXZlcnlfcnRzX3BjdCI6IDk3LjQ3ODk5MTZ9LCB7ImRhdGUiOiAiMjAyNi0wOC0yNiIsICJvZmZpY2UiOiAiTmFtZSBvZiBPZmZpY2UiLCAiYmFncyI6IG51bGwsICJyZWNlaXZlZCI6IG51bGwsICJpc3N1ZWQiOiBudWxsLCAibWlzc2VudCI6IG51bGwsICJtaXNzZW50X3BjdCI6IG51bGwsICJydHMiOiBudWxsLCAicnRzX3BjdCI6IG51bGwsICJkZXBvc2l0IjogbnVsbCwgImRlbGl2ZXJlZCI6IG51bGwsICJkZWxpdmVyeV9wY3QiOiBudWxsLCAiZGVsaXZlcnlfcnRzX3BjdCI6IG51bGx9LCB7ImRhdGUiOiAiMjAyNi0wOC0yNyIsICJvZmZpY2UiOiAiSURDIFNSVCBOYWdhciBQTyIsICJiYWdzIjogNDcuMCwgInJlY2VpdmVkIjogNTkxOS4wLCAiaXNzdWVkIjogNTU3My4wLCAibWlzc2VudCI6IDM0Ni4wLCAibWlzc2VudF9wY3QiOiA1Ljg0NTU4MjAyNCwgInJ0cyI6IDQ3Ni4wLCAicnRzX3BjdCI6IDguMDQxODk4OTY5LCAiZGVwb3NpdCI6IDExMy4wLCAiZGVsaXZlcmVkIjogNDk4NC4wLCAiZGVsaXZlcnlfcGN0IjogODkuNDMxMTg2MDgsICJkZWxpdmVyeV9ydHNfcGN0IjogOTcuOTcyMzY2Nzd9LCB7ImRhdGUiOiAiMjAyNi0wOC0yNyIsICJvZmZpY2UiOiAiUmFzaHRyYXBhdGkgQmhhd2FuIFBPIiwgImJhZ3MiOiAxMS4wLCAicmVjZWl2ZWQiOiA0ODIuMCwgImlzc3VlZCI6IDQ4MC4wLCAibWlzc2VudCI6IDIuMCwgIm1pc3NlbnRfcGN0IjogMC40MTQ5Mzc3NTkzLCAicnRzIjogNS4wLCAicnRzX3BjdCI6IDEuMDM3MzQ0Mzk4MDAwMDAwMSwgImRlcG9zaXQiOiAwLjAsICJkZWxpdmVyZWQiOiA0NzUuMCwgImRlbGl2ZXJ5X3BjdCI6IDk4Ljk1ODMzMzMzLCAiZGVsaXZlcnlfcnRzX3BjdCI6IDEwMC4wfSwgeyJkYXRlIjogIjIwMjYtMDgtMjciLCAib2ZmaWNlIjogIlVQU0MgUE8iLCAiYmFncyI6IDkuMCwgInJlY2VpdmVkIjogMTg2LjAsICJpc3N1ZWQiOiAxODEuMCwgIm1pc3NlbnQiOiA1LjAsICJtaXNzZW50X3BjdCI6IDIuNjg4MTcyMDQzLCAicnRzIjogMS4wLCAicnRzX3BjdCI6IDAuNTM3NjM0NDA4NiwgImRlcG9zaXQiOiAwLjAsICJkZWxpdmVyZWQiOiAxODAuMCwgImRlbGl2ZXJ5X3BjdCI6IDk5LjQ0NzUxMzgxLCAiZGVsaXZlcnlfcnRzX3BjdCI6IDEwMC4wfSwgeyJkYXRlIjogIjIwMjYtMDgtMjciLCAib2ZmaWNlIjogIk5vZGFsIERlbGl2ZXJ5IENlbnRyZSIsICJiYWdzIjogMTM2LjAsICJyZWNlaXZlZCI6IDE3NDEuMCwgImlzc3VlZCI6IDI0OTMuMCwgIm1pc3NlbnQiOiAzNi4wLCAibWlzc2VudF9wY3QiOiAyLjA2Nzc3NzE0LCAicnRzIjogMTUwLjAsICJydHNfcGN0IjogOC42MTU3MzgwODIsICJkZXBvc2l0IjogNzkuMCwgImRlbGl2ZXJlZCI6IDIyNjQuMCwgImRlbGl2ZXJ5X3BjdCI6IDkwLjgxNDI3OTk4LCAiZGVsaXZlcnlfcnRzX3BjdCI6IDk2LjgzMTEyNzE2fSwgeyJkYXRlIjogIjIwMjYtMDgtMjciLCAib2ZmaWNlIjogIk5hbWUgb2YgT2ZmaWNlIiwgImJhZ3MiOiBudWxsLCAicmVjZWl2ZWQiOiBudWxsLCAiaXNzdWVkIjogbnVsbCwgIm1pc3NlbnQiOiBudWxsLCAibWlzc2VudF9wY3QiOiBudWxsLCAicnRzIjogbnVsbCwgInJ0c19wY3QiOiBudWxsLCAiZGVwb3NpdCI6IG51bGwsICJkZWxpdmVyZWQiOiBudWxsLCAiZGVsaXZlcnlfcGN0IjogbnVsbCwgImRlbGl2ZXJ5X3J0c19wY3QiOiBudWxsfSwgeyJkYXRlIjogIjIwMjYtMDgtMjgiLCAib2ZmaWNlIjogIklEQyBTUlQgTmFnYXIgUE8iLCAiYmFncyI6IDMxLjAsICJyZWNlaXZlZCI6IDM0MzUuMCwgImlzc3VlZCI6IDMxMzIuMCwgIm1pc3NlbnQiOiAyMjEuMCwgIm1pc3NlbnRfcGN0IjogNi40MzM3NzAwMTQ5OTk5OTk1LCAicnRzIjogMjU1LjAsICJydHNfcGN0IjogNy40MjM1ODA3ODYwMDAwMDA1LCAiZGVwb3NpdCI6IDE5OS4wLCAiZGVsaXZlcmVkIjogMjY3OC4wLCAiZGVsaXZlcnlfcGN0IjogODUuNTA0NDY5OTksICJkZWxpdmVyeV9ydHNfcGN0IjogOTMuNjQ2MjMyNDR9LCB7ImRhdGUiOiAiMjAyNi0wOC0yOCIsICJvZmZpY2UiOiAiUmFzaHRyYXBhdGkgQmhhd2FuIFBPIiwgImJhZ3MiOiA4LjAsICJyZWNlaXZlZCI6IDI0Ny4wLCAiaXNzdWVkIjogMjQ3LjAsICJtaXNzZW50IjogMC4wLCAibWlzc2VudF9wY3QiOiAwLjAsICJydHMiOiA4LjAsICJydHNfcGN0IjogMy4yMzg4NjYzOTcwMDAwMDAyLCAiZGVwb3NpdCI6IDAuMCwgImRlbGl2ZXJlZCI6IDIzOS4wLCAiZGVsaXZlcnlfcGN0IjogOTYuNzYxMTMzNjAwMDAwMDEsICJkZWxpdmVyeV9ydHNfcGN0IjogMTAwLjB9LCB7ImRhdGUiOiAiMjAyNi0wOC0yOCIsICJvZmZpY2UiOiAiVVBTQyBQTyIsICJiYWdzIjogOC4wLCAicmVjZWl2ZWQiOiA4MC4wLCAiaXNzdWVkIjogODAuMCwgIm1pc3NlbnQiOiAwLjAsICJtaXNzZW50X3BjdCI6IDAuMCwgInJ0cyI6IDAuMCwgInJ0c19wY3QiOiAwLjAsICJkZXBvc2l0IjogMC4wLCAiZGVsaXZlcmVkIjogODAuMCwgImRlbGl2ZXJ5X3BjdCI6IDEwMC4wLCAiZGVsaXZlcnlfcnRzX3BjdCI6IDEwMC4wfSwgeyJkYXRlIjogIjIwMjYtMDgtMjgiLCAib2ZmaWNlIjogIk5vZGFsIERlbGl2ZXJ5IENlbnRyZSIsICJiYWdzIjogMTczLjAsICJyZWNlaXZlZCI6IDIxMjcuMCwgImlzc3VlZCI6IDIxMzMuMCwgIm1pc3NlbnQiOiA1OS4wLCAibWlzc2VudF9wY3QiOiAyLjc3Mzg1OTg5NywgInJ0cyI6IDkzLjAsICJydHNfcGN0IjogNC4zNzIzNTU0MywgImRlcG9zaXQiOiAxNTUuMCwgImRlbGl2ZXJlZCI6IDE4ODUuMCwgImRlbGl2ZXJ5X3BjdCI6IDg4LjM3MzE4MzMxLCAiZGVsaXZlcnlfcnRzX3BjdCI6IDkyLjczMzIzOTU3MDAwMDAxfSwgeyJkYXRlIjogIjIwMjYtMDgtMjgiLCAib2ZmaWNlIjogIk5hbWUgb2YgT2ZmaWNlIiwgImJhZ3MiOiBudWxsLCAicmVjZWl2ZWQiOiBudWxsLCAiaXNzdWVkIjogbnVsbCwgIm1pc3NlbnQiOiBudWxsLCAibWlzc2VudF9wY3QiOiBudWxsLCAicnRzIjogbnVsbCwgInJ0c19wY3QiOiBudWxsLCAiZGVwb3NpdCI6IG51bGwsICJkZWxpdmVyZWQiOiBudWxsLCAiZGVsaXZlcnlfcGN0IjogbnVsbCwgImRlbGl2ZXJ5X3J0c19wY3QiOiBudWxsfSwgeyJkYXRlIjogIjIwMjYtMDgtMjkiLCAib2ZmaWNlIjogIklEQyBTUlQgTmFnYXIgUE8iLCAiYmFncyI6IDI1LjAsICJyZWNlaXZlZCI6IDE4NDkuMCwgImlzc3VlZCI6IDE1NjEuMCwgIm1pc3NlbnQiOiA5MS4wLCAibWlzc2VudF9wY3QiOiA0LjkyMTU3OTIzMiwgInJ0cyI6IDE2MS4wLCAicnRzX3BjdCI6IDguNzA3NDA5NDEsICJkZXBvc2l0IjogNDIuMCwgImRlbGl2ZXJlZCI6IDEzNTguMCwgImRlbGl2ZXJ5X3BjdCI6IDg2Ljk5NTUxNTcsICJkZWxpdmVyeV9ydHNfcGN0IjogOTcuMzA5NDE3MDR9LCB7ImRhdGUiOiAiMjAyNi0wOC0yOSIsICJvZmZpY2UiOiAiUmFzaHRyYXBhdGkgQmhhd2FuIFBPIiwgImJhZ3MiOiAzLjAsICJyZWNlaXZlZCI6IDk4LjAsICJpc3N1ZWQiOiA5Ni4wLCAibWlzc2VudCI6IDIuMCwgIm1pc3NlbnRfcGN0IjogMi4wNDA4MTYzMjcsICJydHMiOiAxLjAsICJydHNfcGN0IjogMS4wMjA0MDgxNjMsICJkZXBvc2l0IjogMC4wLCAiZGVsaXZlcmVkIjogOTUuMCwgImRlbGl2ZXJ5X3BjdCI6IDk4Ljk1ODMzMzMzLCAiZGVsaXZlcnlfcnRzX3BjdCI6IDEwMC4wfSwgeyJkYXRlIjogIjIwMjYtMDgtMjkiLCAib2ZmaWNlIjogIlVQU0MgUE8iLCAiYmFncyI6IDIuMCwgInJlY2VpdmVkIjogMi4wLCAiaXNzdWVkIjogMi4wLCAibWlzc2VudCI6IDAuMCwgIm1pc3NlbnRfcGN0IjogMC4wLCAicnRzIjogMC4wLCAicnRzX3BjdCI6IDAuMCwgImRlcG9zaXQiOiAwLjAsICJkZWxpdmVyZWQiOiAyLjAsICJkZWxpdmVyeV9wY3QiOiAxMDAuMCwgImRlbGl2ZXJ5X3J0c19wY3QiOiAxMDAuMH0sIHsiZGF0ZSI6ICIyMDI2LTA4LTI5IiwgIm9mZmljZSI6ICJOb2RhbCBEZWxpdmVyeSBDZW50cmUiLCAiYmFncyI6IDExOS4wLCAicmVjZWl2ZWQiOiAxNjcwLjAsICJpc3N1ZWQiOiAxODAxLjAsICJtaXNzZW50IjogMzguMCwgIm1pc3NlbnRfcGN0IjogMi4yNzU0NDkxMDIsICJydHMiOiAzMS4wLCAicnRzX3BjdCI6IDEuODU2Mjg3NDI1LCAiZGVwb3NpdCI6IDI4My4wLCAiZGVsaXZlcmVkIjogMTQzNy4wLCAiZGVsaXZlcnlfcGN0IjogNzkuNzg5MDA2MTEsICJkZWxpdmVyeV9ydHNfcGN0IjogODEuNTEwMjcyMDd9LCB7ImRhdGUiOiAiMjAyNi0wOC0yOSIsICJvZmZpY2UiOiAiTmFtZSBvZiBPZmZpY2UiLCAiYmFncyI6IG51bGwsICJyZWNlaXZlZCI6IG51bGwsICJpc3N1ZWQiOiBudWxsLCAibWlzc2VudCI6IG51bGwsICJtaXNzZW50X3BjdCI6IG51bGwsICJydHMiOiBudWxsLCAicnRzX3BjdCI6IG51bGwsICJkZXBvc2l0IjogbnVsbCwgImRlbGl2ZXJlZCI6IG51bGwsICJkZWxpdmVyeV9wY3QiOiBudWxsLCAiZGVsaXZlcnlfcnRzX3BjdCI6IG51bGx9LCB7ImRhdGUiOiAiMjAyNi0wOC0zMCIsICJvZmZpY2UiOiAiSURDIFNSVCBOYWdhciBQTyIsICJiYWdzIjogbnVsbCwgInJlY2VpdmVkIjogbnVsbCwgImlzc3VlZCI6IG51bGwsICJtaXNzZW50IjogbnVsbCwgIm1pc3NlbnRfcGN0IjogbnVsbCwgInJ0cyI6IG51bGwsICJydHNfcGN0IjogbnVsbCwgImRlcG9zaXQiOiBudWxsLCAiZGVsaXZlcmVkIjogbnVsbCwgImRlbGl2ZXJ5X3BjdCI6IG51bGwsICJkZWxpdmVyeV9ydHNfcGN0IjogbnVsbH0sIHsiZGF0ZSI6ICIyMDI2LTA4LTMwIiwgIm9mZmljZSI6ICJSYXNodHJhcGF0aSBCaGF3YW4gUE8iLCAiYmFncyI6IG51bGwsICJyZWNlaXZlZCI6IG51bGwsICJpc3N1ZWQiOiBudWxsLCAibWlzc2VudCI6IG51bGwsICJtaXNzZW50X3BjdCI6IG51bGwsICJydHMiOiBudWxsLCAicnRzX3BjdCI6IG51bGwsICJkZXBvc2l0IjogbnVsbCwgImRlbGl2ZXJlZCI6IG51bGwsICJkZWxpdmVyeV9wY3QiOiBudWxsLCAiZGVsaXZlcnlfcnRzX3BjdCI6IG51bGx9LCB7ImRhdGUiOiAiMjAyNi0wOC0zMCIsICJvZmZpY2UiOiAiVVBTQyBQTyIsICJiYWdzIjogbnVsbCwgInJlY2VpdmVkIjogbnVsbCwgImlzc3VlZCI6IG51bGwsICJtaXNzZW50IjogbnVsbCwgIm1pc3NlbnRfcGN0IjogbnVsbCwgInJ0cyI6IG51bGwsICJydHNfcGN0IjogbnVsbCwgImRlcG9zaXQiOiBudWxsLCAiZGVsaXZlcmVkIjogbnVsbCwgImRlbGl2ZXJ5X3BjdCI6IG51bGwsICJkZWxpdmVyeV9ydHNfcGN0IjogbnVsbH0sIHsiZGF0ZSI6ICIyMDI2LTA4LTMwIiwgIm9mZmljZSI6ICJOb2RhbCBEZWxpdmVyeSBDZW50cmUiLCAiYmFncyI6IG51bGwsICJyZWNlaXZlZCI6IG51bGwsICJpc3N1ZWQiOiBudWxsLCAibWlzc2VudCI6IG51bGwsICJtaXNzZW50X3BjdCI6IG51bGwsICJydHMiOiBudWxsLCAicnRzX3BjdCI6IG51bGwsICJkZXBvc2l0IjogbnVsbCwgImRlbGl2ZXJlZCI6IG51bGwsICJkZWxpdmVyeV9wY3QiOiBudWxsLCAiZGVsaXZlcnlfcnRzX3BjdCI6IG51bGx9LCB7ImRhdGUiOiAiMjAyNi0wOC0zMCIsICJvZmZpY2UiOiAiTmFtZSBvZiBPZmZpY2UiLCAiYmFncyI6IG51bGwsICJyZWNlaXZlZCI6IG51bGwsICJpc3N1ZWQiOiBudWxsLCAibWlzc2VudCI6IG51bGwsICJtaXNzZW50X3BjdCI6IG51bGwsICJydHMiOiBudWxsLCAicnRzX3BjdCI6IG51bGwsICJkZXBvc2l0IjogbnVsbCwgImRlbGl2ZXJlZCI6IG51bGwsICJkZWxpdmVyeV9wY3QiOiBudWxsLCAiZGVsaXZlcnlfcnRzX3BjdCI6IG51bGx9LCB7ImRhdGUiOiAiMjAyNi0wOC0zMSIsICJvZmZpY2UiOiAiSURDIFNSVCBOYWdhciBQTyIsICJiYWdzIjogbnVsbCwgInJlY2VpdmVkIjogbnVsbCwgImlzc3VlZCI6IG51bGwsICJtaXNzZW50IjogbnVsbCwgIm1pc3NlbnRfcGN0IjogbnVsbCwgInJ0cyI6IG51bGwsICJydHNfcGN0IjogbnVsbCwgImRlcG9zaXQiOiBudWxsLCAiZGVsaXZlcmVkIjogbnVsbCwgImRlbGl2ZXJ5X3BjdCI6IG51bGwsICJkZWxpdmVyeV9ydHNfcGN0IjogbnVsbH0sIHsiZGF0ZSI6ICIyMDI2LTA4LTMxIiwgIm9mZmljZSI6ICJSYXNodHJhcGF0aSBCaGF3YW4gUE8iLCAiYmFncyI6IG51bGwsICJyZWNlaXZlZCI6IG51bGwsICJpc3N1ZWQiOiBudWxsLCAibWlzc2VudCI6IG51bGwsICJtaXNzZW50X3BjdCI6IG51bGwsICJydHMiOiBudWxsLCAicnRzX3BjdCI6IG51bGwsICJkZXBvc2l0IjogbnVsbCwgImRlbGl2ZXJlZCI6IG51bGwsICJkZWxpdmVyeV9wY3QiOiBudWxsLCAiZGVsaXZlcnlfcnRzX3BjdCI6IG51bGx9LCB7ImRhdGUiOiAiMjAyNi0wOC0zMSIsICJvZmZpY2UiOiAiVVBTQyBQTyIsICJiYWdzIjogbnVsbCwgInJlY2VpdmVkIjogbnVsbCwgImlzc3VlZCI6IG51bGwsICJtaXNzZW50IjogbnVsbCwgIm1pc3NlbnRfcGN0IjogbnVsbCwgInJ0cyI6IG51bGwsICJydHNfcGN0IjogbnVsbCwgImRlcG9zaXQiOiBudWxsLCAiZGVsaXZlcmVkIjogbnVsbCwgImRlbGl2ZXJ5X3BjdCI6IG51bGwsICJkZWxpdmVyeV9ydHNfcGN0IjogbnVsbH0sIHsiZGF0ZSI6ICIyMDI2LTA4LTMxIiwgIm9mZmljZSI6ICJOb2RhbCBEZWxpdmVyeSBDZW50cmUiLCAiYmFncyI6IG51bGwsICJyZWNlaXZlZCI6IG51bGwsICJpc3N1ZWQiOiBudWxsLCAibWlzc2VudCI6IG51bGwsICJtaXNzZW50X3BjdCI6IG51bGwsICJydHMiOiBudWxsLCAicnRzX3BjdCI6IG51bGwsICJkZXBvc2l0IjogbnVsbCwgImRlbGl2ZXJlZCI6IG51bGwsICJkZWxpdmVyeV9wY3QiOiBudWxsLCAiZGVsaXZlcnlfcnRzX3BjdCI6IG51bGx9LCB7ImRhdGUiOiAiMjAyNi0wOC0zMSIsICJvZmZpY2UiOiAiTmFtZSBvZiBPZmZpY2UiLCAiYmFncyI6IG51bGwsICJyZWNlaXZlZCI6IG51bGwsICJpc3N1ZWQiOiBudWxsLCAibWlzc2VudCI6IG51bGwsICJtaXNzZW50X3BjdCI6IG51bGwsICJydHMiOiBudWxsLCAicnRzX3BjdCI6IG51bGwsICJkZXBvc2l0IjogbnVsbCwgImRlbGl2ZXJlZCI6IG51bGwsICJkZWxpdmVyeV9wY3QiOiBudWxsLCAiZGVsaXZlcnlfcnRzX3BjdCI6IG51bGx9XTsgY29uc3QgQVZHPXsiMjAyNi0wNy0zMSI6IDAuOTY1MDI2ODY5MiwgIjIwMjYtMDgtMDEiOiAwLjkxMTMwNDUxOCwgIjIwMjYtMDgtMDIiOiAwLjg1NTI5NTU2NjUsICIyMDI2LTA4LTAzIjogMC45MzUxMDAwMDEzLCAiMjAyNi0wOC0wNCI6IDAuOTE3MzcwODM2MiwgIjIwMjYtMDgtMDUiOiAwLjk0NTkxMDU2MSwgIjIwMjYtMDgtMDYiOiAwLjkzNzg4ODU0MjksICIyMDI2LTA4LTA3IjogMC45NDA1NDQ3NzU5LCAiMjAyNi0wOC0wOCI6IDAuODY5NjY0MzMzOSwgIjIwMjYtMDgtMDkiOiBudWxsLCAiMjAyNi0wOC0xMCI6IDAuOTQ0OTgyODIxOSwgIjIwMjYtMDgtMTEiOiAwLjkyNTkwMjIyMjIsICIyMDI2LTA4LTEyIjogMC45NDYyNzk5MTE1LCAiMjAyNi0wOC0xMyI6IDAuOTQxMDI4NjM1NCwgIjIwMjYtMDgtMTQiOiAwLjk0OTAzNDU3MTUsICIyMDI2LTA4LTE1IjogbnVsbCwgIjIwMjYtMDgtMTYiOiBudWxsLCAiMjAyNi0wOC0xNyI6IDAuOTUxNjk2MTY2NiwgIjIwMjYtMDgtMTgiOiAwLjk0NjQ2NTgwMTQsICIyMDI2LTA4LTE5IjogMC45NTY3ODkzOTQ2LCAiMjAyNi0wOC0yMCI6IDAuOTQ4MTA5ODI0MywgIjIwMjYtMDgtMjEiOiAwLjkxNjgyNjIyNTksICIyMDI2LTA4LTIyIjogMC45MjU5OTE4NzkxLCAiMjAyNi0wOC0yMyI6IG51bGwsICIyMDI2LTA4LTI0IjogMC45NDcyOTUzMjMyLCAiMjAyNi0wOC0yNSI6IDAuOTQ3ODk4OTc4NywgIjIwMjYtMDgtMjYiOiAwLjc0OTExODIxNDksICIyMDI2LTA4LTI3IjogMC45NDY2MjgyODMsICIyMDI2LTA4LTI4IjogMC45MjY1OTY5NjczLCAiMjAyNi0wOC0yOSI6IDAuOTE0MzU3MTM3OCwgIjIwMjYtMDgtMzAiOiBudWxsLCAiMjAyNi0wOC0zMSI6IG51bGx9OyBjb25zdCBkYXRlcz1bIjIwMjYtMDgtMzEiLCAiMjAyNi0wOC0zMCIsICIyMDI2LTA4LTI5IiwgIjIwMjYtMDgtMjgiLCAiMjAyNi0wOC0yNyIsICIyMDI2LTA4LTI2IiwgIjIwMjYtMDgtMjUiLCAiMjAyNi0wOC0yNCIsICIyMDI2LTA4LTIzIiwgIjIwMjYtMDgtMjIiLCAiMjAyNi0wOC0yMSIsICIyMDI2LTA4LTIwIiwgIjIwMjYtMDgtMTkiLCAiMjAyNi0wOC0xOCIsICIyMDI2LTA4LTE3IiwgIjIwMjYtMDgtMTYiLCAiMjAyNi0wOC0xNSIsICIyMDI2LTA4LTE0IiwgIjIwMjYtMDgtMTMiLCAiMjAyNi0wOC0xMiIsICIyMDI2LTA4LTExIiwgIjIwMjYtMDgtMTAiLCAiMjAyNi0wOC0wOSIsICIyMDI2LTA4LTA4IiwgIjIwMjYtMDgtMDciLCAiMjAyNi0wOC0wNiIsICIyMDI2LTA4LTA1IiwgIjIwMjYtMDgtMDQiLCAiMjAyNi0wOC0wMyIsICIyMDI2LTA4LTAyIiwgIjIwMjYtMDgtMDEiLCAiMjAyNi0wNy0zMSJdOwpjb25zdCBkcz1kb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZGF0ZScpLHE9ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NlYXJjaCcpOwpkYXRlcy5mb3JFYWNoKGQ9PntsZXQgbz1kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdvcHRpb24nKTtvLnZhbHVlPWQ7by50ZXh0Q29udGVudD1uZXcgRGF0ZShkKydUMDA6MDA6MDAnKS50b0xvY2FsZURhdGVTdHJpbmcoJ2VuLUlOJyk7ZHMuYXBwZW5kQ2hpbGQobyl9KTtkcy52YWx1ZT1kYXRlc1swXTsKY29uc3QgZm10PW49Pm49PW51bGw/J+KAlCc6TWF0aC5yb3VuZChuKS50b0xvY2FsZVN0cmluZygnZW4tSU4nKTsgY29uc3QgcGM9bj0+bj09bnVsbD8n4oCUJzpOdW1iZXIobikudG9GaXhlZCgyKSsnJSc7CmNvbnN0IGNscz1uPT5uPT1udWxsPycnOm4+PTk1Pydnb29kJzpuPj04MD8nbWlkJzonbG93JzsKZnVuY3Rpb24gcmVuZGVyKCl7CiBjb25zdCBhPURBVEEuZmlsdGVyKHg9PnguZGF0ZT09PWRzLnZhbHVlICYmIHgub2ZmaWNlLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMocS52YWx1ZS50b0xvd2VyQ2FzZSgpKSk7CiBjb25zdCBzdW09az0+YS5yZWR1Y2UoKHMseCk9PnMrKE51bWJlcih4W2tdKXx8MCksMCk7CiBbJ3JlY2VpdmVkJywnaXNzdWVkJywnZGVsaXZlcmVkJywnbWlzc2VudCcsJ3J0cyddLmZvckVhY2goaz0+ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaykudGV4dENvbnRlbnQ9Zm10KHN1bShrKSkpOwogZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ292ZXJhbGwnKS50ZXh0Q29udGVudD1wYyhBVkdbZHMudmFsdWVdKTsKIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjb3VudCcpLnRleHRDb250ZW50PScoJythLmxlbmd0aCsnIG9mZmljZXMpJzsKIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdib2R5JykuaW5uZXJIVE1MPWEubWFwKHg9PmA8dHI+PHRkPjxiPiR7eC5vZmZpY2V9PC9iPjwvdGQ+PHRkPiR7Zm10KHgucmVjZWl2ZWQpfTwvdGQ+PHRkPiR7Zm10KHguaXNzdWVkKX08L3RkPjx0ZD4ke2ZtdCh4LmRlbGl2ZXJlZCl9PC90ZD4KIDx0ZD48c3BhbiBjbGFzcz0iYmFkZ2UgJHtjbHMoeC5kZWxpdmVyeV9wY3QpfSI+JHtwYyh4LmRlbGl2ZXJ5X3BjdCl9PC9zcGFuPjwvdGQ+PHRkPiR7cGMoeC5taXNzZW50X3BjdCl9PC90ZD48dGQ+JHtwYyh4LnJ0c19wY3QpfTwvdGQ+PHRkPiR7cGMoeC5kZWxpdmVyeV9ydHNfcGN0KX08L3RkPjwvdHI+YCkuam9pbignJyk7CiBjb25zdCByPVsuLi5hXS5zb3J0KCh4LHkpPT4oeS5kZWxpdmVyeV9wY3Q/Py0xKS0oeC5kZWxpdmVyeV9wY3Q/Py0xKSkuc2xpY2UoMCw4KTsKIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyYW5rJykuaW5uZXJIVE1MPXIubWFwKCh4LGkpPT5gPGRpdiBjbGFzcz0icmFuayI+PGI+JHtpKzF9PC9iPjxkaXYgY2xhc3M9InJhbmtuYW1lIj4ke3gub2ZmaWNlfTxkaXYgY2xhc3M9ImJhciI+PGRpdiBjbGFzcz0iZmlsbCIgc3R5bGU9IndpZHRoOiR7TWF0aC5taW4oeC5kZWxpdmVyeV9wY3R8fDAsMTAwKX0lIj48L2Rpdj48L2Rpdj48L2Rpdj48ZGl2IGNsYXNzPSJyYW5rcGN0Ij4ke3BjKHguZGVsaXZlcnlfcGN0KX08L2Rpdj48L2Rpdj5gKS5qb2luKCcnKTsKfQpkcy5vbmNoYW5nZT1yZW5kZXI7cS5vbmlucHV0PXJlbmRlcjtkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2xlYXInKS5vbmNsaWNrPSgpPT57cS52YWx1ZT0nJztyZW5kZXIoKX07cmVuZGVyKCk7Cjwvc2NyaXB0PjwvYm9keT48L2h0bWw+";
