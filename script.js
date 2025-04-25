let records = [];
let weightChart, bmiChart;

function openTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
}

document.getElementById("unit-system").addEventListener("change", function () {
    const metricInputs = document.getElementById("metric-inputs");
    const imperialInputs = document.getElementById("imperial-inputs");
    if (this.value === "metric") {
        metricInputs.classList.remove("hidden");
        imperialInputs.classList.add("hidden");
    } else {
        metricInputs.classList.add("hidden");
        imperialInputs.classList.remove("hidden");
    }
});

function computeAndRecordBMI() {
    const unitSystem = document.getElementById("unit-system").value;
    const date = document.getElementById("bmi-date").value || new Date().toISOString().split('T')[0];
    let heightM, weightKg;

    if (unitSystem === "metric") {
        const heightCm = parseFloat(document.getElementById("height-cm").value);
        const weight = parseFloat(document.getElementById("weight-kg").value);
        if (isNaN(heightCm) || isNaN(weight)) {
            alert("Please fill in all values.");
            return;
        }
        if (heightCm <= 0 || weight <= 0) {
            alert("Height and weight must be greater than zero.");
            return;
        }
        heightM = heightCm / 100;
        weightKg = weight;
    } else {
        const heightFt = parseFloat(document.getElementById("height-ft").value);
        const heightIn = parseFloat(document.getElementById("height-in").value);
        const weight = parseFloat(document.getElementById("weight-lb").value);
        if (isNaN(heightFt) || isNaN(heightIn) || isNaN(weight)) {
            alert("Please fill in all values.");
            return;
        }
        if ((heightFt < 0 || heightIn < 0 || (heightFt === 0 && heightIn === 0)) || weight <= 0) {
            alert("Height and weight must be greater than zero.");
            return;
        }
        const totalInches = (heightFt * 12) + heightIn;
        heightM = totalInches * 0.0254;
        weightKg = weight * 0.453592;
    }

    const bmi = weightKg / (heightM * heightM);
    const existing = records.find(r => r.date === date);
    if (existing && !confirm("Record already exists for this date. Override?")) return;
    if (existing) Object.assign(existing, { date, heightM, weightKg, bmi });
    else records.push({ date, heightM, weightKg, bmi });

    document.getElementById("bmi-result").innerText = `BMI on ${date}: ${bmi.toFixed(2)}`;

    updateTable();
    updateChart();
}

function getBMICategory(bmi, standard) {
    if (standard === "asia") {
        if (bmi < 18.5) return "Underweight";
        if (bmi < 23) return "Normal weight";
        if (bmi < 25) return "Overweight";
        return "Obesity";
    } else {
        if (bmi < 18.5) return "Underweight";
        if (bmi < 25) return "Normal weight";
        if (bmi < 30) return "Overweight";
        return "Obesity";
    }
}

function updateTable() {
    const sortOrder = document.getElementById("sort-order").value;
    const unit = document.getElementById("display-units").value;
    const bmiStandard = document.getElementById("bmi-standard").value;
    const tbody = document.querySelector("#records-table tbody");
    tbody.innerHTML = "";

    const sorted = [...records].sort((a, b) => sortOrder === 'asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date));

    sorted.forEach(({ date, heightM, weightKg, bmi }) => {
        const heightDisplay = unit === 'imperial' ? `${(heightM / 0.0254 / 12).toFixed(1)} ft` : `${(heightM * 100).toFixed(1)} cm`;
        const weightDisplay = unit === 'imperial' ? `${(weightKg / 0.453592).toFixed(1)} lb` : `${weightKg.toFixed(1)} kg`;
        const category = getBMICategory(bmi, bmiStandard);

        const row = `<tr><td>${date}</td><td>${heightDisplay}</td><td>${weightDisplay}</td><td>${bmi.toFixed(2)}</td><td>${category}</td></tr>`;
        tbody.insertAdjacentHTML('beforeend', row);
    });
}

function getAllDatesBetween(startDate, endDate) {
    const dates = [];
    let currentDate = new Date(startDate);
    const end = new Date(endDate);
    while (currentDate <= end) {
        dates.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return dates;
}

function updateChart() {
    const weightUnit = document.getElementById("weight-chart-unit").value;
    const bmiStandard = document.getElementById("bmi-chart-standard").value;
    const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));

    if (sorted.length === 0) return;

    const allDates = getAllDatesBetween(sorted[0].date, sorted[sorted.length - 1].date);

    const weightMap = new Map(sorted.map(r => [r.date, weightUnit === 'imperial' ? r.weightKg / 0.453592 : r.weightKg]));
    const bmiMap = new Map(sorted.map(r => [r.date, r.bmi]));

    const weights = allDates.map(d => weightMap.has(d) ? weightMap.get(d) : null);
    const bmis = allDates.map(d => bmiMap.has(d) ? bmiMap.get(d) : null);

    if (weightChart) weightChart.destroy();
    weightChart = new Chart(document.getElementById("weight-chart"), {
        type: 'line',
        data: {
            labels: allDates,
            datasets: [
                {
                    label: `Weight`,
                    data: weights,
                    borderColor: 'gray',
                    spanGaps: true,
                    tension: 0.3
                }
            ]
        },
        options: {
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return `Weight: ${context.raw.toFixed(1)} ${weightUnit === 'imperial' ? 'lb' : 'kg'}`;
                        }
                    }
                }
            },
            scales: {
                x: { title: { display: true, text: 'Date' } },
                y: { title: { display: true, text: 'Weight' } }
            }
        }
    });

    const annotations = bmiStandard === 'asia' ? [
        { type: 'box', yMin: 0, yMax: 18.5, backgroundColor: 'rgba(0, 0, 255, 0.1)', borderWidth: 0, label: { display: false } },
        { type: 'box', yMin: 18.5, yMax: 23, backgroundColor: 'rgba(0, 128, 0, 0.1)', borderWidth: 0, label: { display: false } },
        { type: 'box', yMin: 23, yMax: 25, backgroundColor: 'rgba(255, 165, 0, 0.1)', borderWidth: 0, label: { display: false } },
        { type: 'box', yMin: 25, yMax: 100, backgroundColor: 'rgba(255, 0, 0, 0.1)', borderWidth: 0, label: { display: false } }
    ] : [
        { type: 'box', yMin: 0, yMax: 18.5, backgroundColor: 'rgba(0, 0, 255, 0.1)', borderWidth: 0, label: { display: false } },
        { type: 'box', yMin: 18.5, yMax: 25, backgroundColor: 'rgba(0, 128, 0, 0.1)', borderWidth: 0, label: { display: false } },
        { type: 'box', yMin: 25, yMax: 30, backgroundColor: 'rgba(255, 165, 0, 0.1)', borderWidth: 0, label: { display: false } },
        { type: 'box', yMin: 30, yMax: 100, backgroundColor: 'rgba(255, 0, 0, 0.1)', borderWidth: 0, label: { display: false } }
    ];

    if (bmiChart) bmiChart.destroy();
    bmiChart = new Chart(document.getElementById("bmi-chart"), {
        type: 'line',
        data: {
            labels: allDates,
            datasets: [
                {
                    label: 'BMI',
                    data: bmis,
                    borderColor: 'gray',
                    backgroundColor: 'transparent',
                    spanGaps: true,
                    tension: 0.3
                }
            ]
        },
        options: {
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        generateLabels: function(chart) {
                            return [
                                { text: 'Underweight', fillStyle: 'rgba(0, 0, 255, 0.3)' },
                                { text: 'Normal weight', fillStyle: 'rgba(0, 128, 0, 0.3)' },
                                { text: 'Overweight', fillStyle: 'rgba(255, 165, 0, 0.3)' },
                                { text: 'Obesity', fillStyle: 'rgba(255, 0, 0, 0.3)' }
                            ];
                        }
                    }
                },
                tooltip: {
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            const bmi = context.raw;
                            let category = '';
                            if (bmiStandard === "asia") {
                                if (bmi < 18.5) category = "Underweight";
                                else if (bmi < 23) category = "Normal weight";
                                else if (bmi < 25) category = "Overweight";
                                else category = "Obesity";
                            } else {
                                if (bmi < 18.5) category = "Underweight";
                                else if (bmi < 25) category = "Normal weight";
                                else if (bmi < 30) category = "Overweight";
                                else category = "Obesity";
                            }
                            return `BMI: ${bmi.toFixed(2)} (${category})`;
                        }
                    }
                },
                annotation: { annotations }
            },
            scales: {
                x: { title: { display: true, text: 'Date' } },
                y: {
                    title: { display: true, text: 'BMI' },
                    min: 10,
                    max: 40,
                    ticks: {
                        stepSize: 2
                    }
                }
            }
        },
        plugins: ['annotation']
    });
}

openTab('calculator');