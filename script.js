const width = 800;
const height = 600;
const svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .style("border", "1px solid black")
    .on("click", deselected);
const g = svg.append("g");