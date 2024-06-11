function calculateAIC(data, gmm) {
    const nComponents = gmm.weights.length;
    const logLikelihood = gmm.scoreSamples(data).reduce((a, b) => a + b, 0);
    return 2 * nComponents - 2 * logLikelihood;
}

function findOptimalGMM(data) {
    const maxComponents = 10;
    let optimalGMM = null;
    let lowestAIC = Infinity;

    for (let n = 1; n <= maxComponents; n++) {
        const gmm = ml5.gaussianMixtureModel(data, { nComponents: n });
        const aic = calculateAIC(data, gmm);

        if (aic < lowestAIC) {
            lowestAIC = aic;
            optimalGMM = gmm;
        }
    }
    
    return optimalGMM;
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
        pdfData.push([i, gmm.pdf(i) * scores.length]);
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

    // Find optimal GMM using AIC
    const gmm = findOptimalGMM(scores);

    // Clear previous chart
    d3.select("#chart").html("");

    drawChart('User Data', scores, gmm);
}
