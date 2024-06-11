function gaussianPDF(x, mean, variance) {
    const coefficient = 1 / Math.sqrt(2 * Math.PI * variance);
    const exponential = Math.exp(-0.5 * Math.pow((x - mean) / Math.sqrt(variance), 2));
    return coefficient * exponential;
}

function calculateGMM(data, nComponents) {
    // Randomly initialize means, variances, and weights
    const means = Array.from({ length: nComponents }, () => Math.random() * (Math.max(...data) - Math.min(...data)) + Math.min(...data));
    const variances = Array.from({ length: nComponents }, () => Math.random());
    const weights = Array.from({ length: nComponents }, () => 1 / nComponents);

    const maxIterations = 100;
    const tolerance = 1e-6;

    for (let iteration = 0; iteration < maxIterations; iteration++) {
        // E-step: calculate responsibilities
        const responsibilities = data.map(x => {
            const prob = means.map((mean, k) => weights[k] * gaussianPDF(x, mean, variances[k]));
            const sumProb = prob.reduce((a, b) => a + b, 0);
            return prob.map(p => p / sumProb);
        });

        // M-step: update weights, means, and variances
        const newWeights = Array(nComponents).fill(0);
        const newMeans = Array(nComponents).fill(0);
        const newVariances = Array(nComponents).fill(0);

        responsibilities.forEach((r, i) => {
            r.forEach((rik, k) => {
                newWeights[k] += rik;
                newMeans[k] += rik * data[i];
                newVariances[k] += rik * Math.pow(data[i] - means[k], 2);
            });
        });

        newWeights.forEach((w, k) => {
            newWeights[k] /= data.length;
            newMeans[k] /= (newWeights[k] * data.length);
            newVariances[k] /= (newWeights[k] * data.length);
        });

        // Check for convergence
        const weightChange = Math.max(...newWeights.map((w, k) => Math.abs(w - weights[k])));
        const meanChange = Math.max(...newMeans.map((m, k) => Math.abs(m - means[k])));
        const varianceChange = Math.max(...newVariances.map((v, k) => Math.abs(v - variances[k])));

        weights.splice(0, nComponents, ...newWeights);
        means.splice(0, nComponents, ...newMeans);
        variances.splice(0, nComponents, ...newVariances);

        if (weightChange < tolerance && meanChange < tolerance && varianceChange < tolerance) {
            break;
        }
    }

    return { means, variances, weights };
}

function drawChart(subject, scores, gmm) {
    const margin = { top: 20, right: 30, bottom: 40, left: 40 },
          width = 960 - margin.left - margin.right,
          height = 500 - margin.top - margin.bottom;

    const x = d3.scaleLinear()
        .domain([d3.min(scores), d3.max(scores)])
        .range([0, width]);

    const histogram = d3.histogram()
        .domain(x.domain())
        .thresholds(x.ticks(30));

    const bins = histogram(scores);

    const y = d3.scaleLinear()
        .domain([0, d3.max(bins, d => d.length)]).nice()
        .range([height, 0]);

    const svg = d3.select("#chart").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    svg.append("g")
      .selectAll("rect")
      .data(bins)
      .enter().append("rect")
        .attr("x", d => x(d.x0) + 1)
        .attr("y", d => y(d.length))
        .attr("width", d => x(d.x1) - x(d.x0) - 1)
        .attr("height", d => height - y(d.length))
        .attr("fill", "steelblue");

    svg.append("g")
        .call(d3.axisLeft(y));

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

    // Add GMM PDF and percentiles
    const line = d3.line()
        .x(d => x(d[0]))
        .y(d => y(d[1]));

    const pdfData = [];
    for (let i = x.domain()[0]; i <= x.domain()[1]; i += 0.1) {
        const pdf = gmm.means.reduce((sum, mean, k) => {
            return sum + gmm.weights[k] * gaussianPDF(i, mean, gmm.variances[k]);
        }, 0);
        pdfData.push([i, pdf * scores.length]);
    }

    svg.append("path")
        .datum(pdfData)
        .attr("fill", "none")
        .attr("stroke", "red")
        .attr("stroke-width", 1.5)
        .attr("d", line);

    const percentiles = [4, 11, 23, 40, 60, 77, 89, 96];
    const cumulativeDensity = math.cumsum(pdfData.map(d => d[1])) / d3.sum(pdfData, d => d[1]);

    percentiles.forEach(p => {
        const percValue = pdfData.find((_, i) => cumulativeDensity[i] >= p / 100)[0];
        svg.append("line")
            .attr("x1", x(percValue))
            .attr("x2", x(percValue))
            .attr("y1", y(0))
            .attr("y2", y(d3.max(bins, d => d.length)))
            .attr("stroke", "blue")
            .attr("stroke-dasharray", "4");

        svg.append("text")
            .attr("x", x(percValue))
            .attr("y", y(d3.max(bins, d => d.length)))
            .attr("dy", -5)
            .attr("text-anchor", "middle")
            .attr("fill", "blue")
            .text(`${p}%`);
    });
}

function analyzeData() {
    const inputData = document.getElementById('dataInput').value;
    const scores = inputData.split(',').map(Number).filter(x => !isNaN(x));
    
    if (scores.length === 0) {
        alert('Please enter valid scores.');
        return;
    }

    // Calculate GMM
    const gmm = calculateGMM(scores, 2);  // Use 2 components as an example

    // Clear previous chart
    d3.select("#chart").html("");

    drawChart('User Data', scores, gmm);
}
