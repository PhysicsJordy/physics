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

    // 각 가우시안 컴포넌트 및 퍼센타일 추가
    const line = d3.line()
        .x(d => x(d[0]))
        .y(d => y(d[1] * height));

    gmm.weights.forEach((weight, i) => {
        const mean = gmm.means[i];
        const variance = gmm.variances[i];
        const pdfData = d3.range(d3.min(scores), d3.max(scores), 0.1).map(v => [v, gaussianPDF(v, mean, variance) * weight]);

        svg.append("path")
            .datum(pdfData)
            .attr("fill", "none")
            .attr("stroke", ['red', 'green', 'blue'][i]) // 다른 색상으로 각 컴포넌트 구분
            .attr("stroke-width", 2)
            .attr("d", line);

        svg.append("text")
            .attr("x", x(mean))
            .attr("y", y(0))
            .attr("dy", -5)
            .attr("text-anchor", "middle")
            .attr("fill", ['red', 'green', 'blue'][i])
            .text(`Mean: ${mean.toFixed(2)}, Std Dev: ${Math.sqrt(variance).toFixed(2)}, Weight: ${weight.toFixed(2)}`);
    });
}

function gaussianPDF(x, mean, variance) {
    const coefficient = 1 / Math.sqrt(2 * Math.PI * variance);
    const exponential = Math.exp(-0.5 * Math.pow((x - mean) / Math.sqrt(variance), 2));
    return coefficient * exponential;
}

function analyzeData() {
    const inputData = document.getElementById('dataInput').value;
    const scores = inputData.split(',').map(Number).filter(x => !isNaN(x));
    
    if (scores.length === 0) {
        alert('Please enter valid scores.');
        return;
    }

    const nComponents = 2; // 컴포넌트 수는 예시로 2를 사용합니다. 필요에 따라 조정 가능합니다.
    const gmm = calculateGMM(scores, nComponents);

    d3.select("#chart").html(""); // 이전 차트 삭제
    drawChart('User Data', scores, gmm);
}

document.addEventListener('DOMContentLoaded', function() {
    const analyzeButton = document.querySelector('button');
    analyzeButton.addEventListener('click', analyzeData);
});
