import {Component, OnInit} from '@angular/core';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
// @ts-ignore
import * as voronoi from 'd3-geo-voronoi';
import {GraphNode} from "./models/node";
import {GraphEdge} from "./models/edge";
import {MyServiceService} from "./services/my-service.service";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit{

  width;
  height;

  nodes: GraphNode[] = []
  edges: GraphEdge[] = []

  displayVoronoi: boolean;

  svg: any;
  g: any;
  map: any;
  projection: any
  geoJson: any
  tooltip: any
  voronoiDiagram: any
  graphicalNodes: any = []

  constructor(private myService: MyServiceService) {
    this.width = this.myService.width;
    this.height = this.myService.height;
  }


  async ngOnInit() {
    this.svg = d3.select('svg')
      .attr("viewBox", [0, 0, this.width, this.height])
      .attr("cursor", "pointer")

    this.g = {
      basemap:  this.svg.select("g#basemap"),
      edges:  this.svg.select("g#edges"),
      nodes: this.svg.select("g#nodes"),
      voronoi:  this.svg.select("g#voronoi")
    };

    this.tooltip = d3.select("#tooltip");

    this.projection = d3.geoAlbers().scale(1280).translate([480, 300]);
    this.edges = await this.myService.getEdges();
    this.nodes = await this.myService.getNodes(this.edges, this.projection);
    this.edges = this.edges.filter(edge => this.nodes.findIndex(n => n.id == edge.source || n.id == edge.target) !== -1)
    this.map = await this.myService.getUSMap();

    const zoom = d3.zoom()
      .scaleExtent([0.5, 10])
      .on("zoom", this.zoomed.bind(this));

    this.g.basemap.attr('transform', 'translate(20, 20)')
    this.g.nodes.attr('transform', 'translate(20, 20)')
    this.g.edges.attr('transform', 'translate(20, 20)')
    this.g.voronoi.attr('transform', 'translate(20, 20)')

    await this.drawUSMap();

    this.drawNodes();
    this.drawEdges();

    this.mapNodesToGeoJson();
    this.drawVoronoi();


    this.svg.call(zoom);

    this.svg.append("circle").attr("cx",20).attr("cy",530).attr("r", 6).style("fill", 'rgba(0,0,0,0.15)').style("stroke", '#ff9c00')
    this.svg.append("circle").attr("cx",20).attr("cy",552).attr("r", 9).style("fill", 'rgba(0,0,0,0.15)').style("stroke", '#a2ff00')
    this.svg.append("circle").attr("cx",20).attr("cy",580).attr("r", 12).style("fill", 'rgba(0,0,0,0.15)').style("stroke", '#009dff')
    this.svg.append("text").attr("x", 40).attr("y", 532).text("Small airport (< 50)").style("font-size", "15px").attr("alignment-baseline","middle")
    this.svg.append("text").attr("x", 40).attr("y", 554).text("Medium airport (50 - 100)").style("font-size", "15px").attr("alignment-baseline","middle")
    this.svg.append("text").attr("x", 40).attr("y", 582).text("Large airport (> 100)").style("font-size", "15px").attr("alignment-baseline","middle")
  }

  private async drawUSMap(){

    let land = topojson.merge(this.map, this.map.objects.states.geometries);
    let path = d3.geoPath();

    // draw base map
    this.g.basemap.append("path")
      .datum(land)
      .attr("class", "land")
      .attr("d", path);

    // draw interior borders
    this.g.basemap.append("path")
      .datum(topojson.mesh(this.map, this.map.objects.states, (a, b) => a !== b))
      .attr("class", "border interior")
      .attr("d", path);

    // draw exterior borders
    this.g.basemap.append("path")
      .datum(topojson.mesh(this.map, this.map.objects.states, (a, b) => a === b))
      .attr("class", "border exterior")
      .attr("d", path);
  }

  private drawNodes() {

    this.g.nodes.selectAll('.node')
      .data(this.nodes)
      .enter()
      .append('circle')
      .classed('node', true)
      .attr('r', (d: GraphNode) => {
        if (d.size < 50) return 6
        if (d.size >= 50 && d.size < 100) return 9
        return 12
      })
      .attr("stroke", (d: GraphNode) => {
        if (d.size < 50) return '#ff9c00'
        if (d.size >= 50 && d.size < 100) return '#a2ff00'
        return '#009dff'
      })
      .attr("fill", 'rgba(0,0,0,0.15)')
      .attr('cx', (d: GraphNode) => {
        return d.x;
      })
      .attr('cy', (d: GraphNode) => {
        return d.y;
      })
      .attr("id", (d: GraphNode) => {
        return d.id
      });
  }

  drawEdges(){
    const bundle = this.myService.generateSegments(this.nodes, this.edges, this.projection);

    let line = d3.line()
      .curve(d3.curveBundle)
      .x((node: any) => node.x)
      .y((node: any) => node.y);

    let links = this.g.edges.selectAll(".edge")
      .data(bundle.paths)
      .enter()
      .append("path")
      .attr("d", line)
      .attr("class", "edge")

    const scales = {
      airports: d3.scaleSqrt()
        .range([4, 18]),
    }

    let layout = d3.forceSimulation()
      .alphaDecay(0.1)
      .force("charge", d3.forceManyBody()
        .strength(10)
        .distanceMax(scales.airports.range()[1] * 2)
      )
      .force("link", d3.forceLink()
        .strength(0.7)
        .distance(0)
      )
      .on("tick", () => {
        links.attr("d", line);
      })
      .on("end", () => {
        console.log("layout complete");
      });


    // @ts-ignore
    layout.nodes(bundle.nodes).force("link").links(bundle.links);
  }

  private zoomed(event: any) {
    const {transform} = event;
    this.g.basemap.attr("transform", transform);
    this.g.basemap.attr("stroke-width", 1 / transform.k);
    this.g.nodes.attr("transform", transform);
    this.g.nodes.attr("stroke-width", 1 / transform.k);
    this.g.edges.attr("transform", transform);
    this.g.edges.attr("stroke-width", 1 / transform.k);
    this.g.voronoi.attr("transform", transform);
    this.g.voronoi.attr("stroke-width", 1 / transform.k);
  }

  private mapNodesToGeoJson() {
    this.geoJson = this.nodes.map((node) => {
      return {
        type: "Feature",
        properties: node,
        geometry: {
          type: "Point",
          coordinates: [node.longX, node.latY]
        }
      };
    });
  }

  private drawVoronoi() {
    const polygons = voronoi.geoVoronoi().polygons(this.geoJson);

    this.voronoiDiagram = this.g.voronoi.selectAll("path")
      .data(polygons.features)
      .enter()
      .append("path")
      .attr("d", d3.geoPath(this.projection))
      .classed("voronoi", true)
      .attr("fill", 'rgba(0,0,0,0)')
      .on("mouseover", (event: any) => {
        const id = event.path[0].__data__.properties.site.properties.id;
        const nodeData = this.nodes[id];

        const text =
          `Code: ${nodeData.name}<br>
           Departures: ${nodeData.departure}<br>
           Arrivals: ${nodeData.arrive}`;

        this.tooltip
          .html(text)
          .style("display", null)
          .style("visibility", "visible")
          .style("top", (event.pageY - 100) + "px")
          .style("left", (event.pageX -60) + "px")


        this.handleMouseOverInteraction(id, event)
      })
      .on("mousemove", (event: any) => {
        this.tooltip
          .style("top", (event.pageY - 100) + "px")
          .style("left", (event.pageX - 60) + "px")
          .style("visibility", "visible")
      })
      .on("mouseout", (event: any) => {
        const id = event.path[0].__data__.properties.site.properties.id;
        this.tooltip.style("visibility", "hidden");

        this.handleMouseOverInteraction(id, event, false)
      });
  }

  private handleMouseOverInteraction(nodeId: number, event: any, mouseIn: boolean = true) {
    const polygon = event.target

    this.g.nodes.selectAll(".node")
      .filter((node: any) => node.id == nodeId)
      .classed("highlighted", mouseIn);


    this.g.edges.selectAll(".edge")
      .filter((edge: any[]) => {
        return edge[0].id == nodeId || edge[edge.length-1].id == nodeId})
      .classed("highlighted", mouseIn);

    if (this.displayVoronoi) {
      d3.select(polygon)
        .attr("fill", mouseIn ? 'rgba(9,131,0,0.5)' : 'rgba(9,131,0,0.15)')
    }
  }

  public toggleDisplayVoronoi() {
    this.displayVoronoi = !this.displayVoronoi;
    this.voronoiDiagram
      .attr("fill", this.displayVoronoi ? 'rgba(9,131,0,0.15)' : 'rgba(9,131,0,0)')
      .attr("stroke", this.displayVoronoi ? 'rgba(9,131,0,0.5)' : 'none');
  }

  public filterAirports (min: number, max: number) {
    this.g.nodes.selectAll(".node")
      .data(this.nodes)
      .classed('invisible', (d:any) => {
        return d.size > max || d.size < min
      });

    this.g.edges.selectAll(".edge")
      .classed('invisible', (edge: any) => {
        return edge[0].size > max || edge[0].size < min ||edge[edge.length-1].size > max || edge[edge.length-1].size < min
      })

    this.g.voronoi.selectAll(".voronoi")
      .classed('invisible', (d: any) => {
        console.log(d)
        let node = d.properties.site.properties;
        return node.size > max || node.size < min
      })
  }

}
