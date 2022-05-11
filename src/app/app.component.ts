import {Component, OnInit} from '@angular/core';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
// @ts-ignore
import * as voronoi from 'd3-geo-voronoi';
import {HttpClient} from "@angular/common/http";
import {GraphNode} from "./models/node";
import {GraphEdge} from "./models/edge";
import {MyServiceService} from "./services/my-service.service";
import {Simulation} from "d3";

declare var ForceEdgeBundling: any;

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
  tooltipContainer: any
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

    this.projection = d3.geoAlbers().scale(1280).translate([480, 300]);
    this.edges = await this.myService.getEdges();
    this.nodes = await this.myService.getNodes(this.edges);
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
    const triangle = d3.symbol()
      .type(d3.symbolTriangle)
      .size(60);

    // const middleNodes = this.g.nodes.selectAll('.node')
    //   .data(this.nodes)
    //   .enter()
    //   .filter((d: any) => {
    //     return d.size >= 50 && d.size < 100
    //   })
    //   .append("path")
    //   .attr("d", triangle)
    //   .attr("stroke", '#00309a')
    //   .attr("fill", 'rgba(0,48,154,0.15)')
    //   .attr("transform", (d: any) => {
    //     return "translate(" + this.projection([d.x, d.y])[0] + "," + this.projection([d.x, d.y])[1] + ")";
    //   })
    //   .classed("node", true)
    //   .attr("id", (d: any) => {
    //     return d.id
    //   });
    //
    // const largeNodes = this.g.nodes.selectAll('.node')
    //   .data(this.nodes)
    //   .enter()
    //   .filter((d: any) => {
    //     return d.size >= 100
    //   })
    //   .append('rect')
    //   .classed('node', true)
    //   .attr("stroke", '#098300')
    //   .attr("fill", 'rgba(9,131,0,0.15)')
    //   .attr('width', 15)
    //   .attr('height', 15)
    //   .attr('x', (d: any) => {
    //     return this.projection([d.x, d.y])[0]-7;
    //   })
    //   .attr('y', (d: any) => {
    //     return this.projection([d.x, d.y])[1]-7;
    //   })
    //   .attr("id", (d: any) => {
    //     return d.id
    //   });

    this.g.nodes.selectAll('.node')
      .data(this.nodes)
      .enter()
      .append('circle')
      .classed('node', true)
      .attr('r', (d: any) => {
        if (d.size < 50) return 6
        if (d.size >= 50 && d.size < 100) return 9
        return 12
      })
      .attr("stroke", (d: any) => {
        if (d.size < 50) return '#ff9c00'
        if (d.size >= 50 && d.size < 100) return '#a2ff00'
        return '#009dff'
      })
      .attr("fill", 'rgba(0,0,0,0.15)')
      .attr('cx', (d: any) => {
        return this.projection([d.x, d.y])[0];
      })
      .attr('cy', (d: any) => {
        return this.projection([d.x, d.y])[1];
      })
      .attr("id", (d: any) => {
        return d.id
      });
  }

  drawEdges(){
    const bundle = this.myService.generateSegments(this.nodes, this.edges);

    let line = d3.line()
      .curve(d3.curveBundle)
      .x((node: any) => this.projection([node.x, node.y])[0])
      .y((node: any) => this.projection([node.x, node.y])[1]);

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

  private tooltip() {
    this.tooltipContainer = d3.select("#map")
      .append("div")
      .classed('tooltip', true);
  }


  private mapNodesToGeoJson() {
    this.geoJson = this.nodes.map((node) => {
      return {
        type: "Feature",
        properties: node,
        geometry: {
          type: "Point",
          coordinates: [node.x, node.y]
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

        this.tooltipContainer
          .html(text)
          .style("top", (event.pageY - 35) + "px")
          .style("left", (event.pageX + 10) + "px")
          .style("visibility", "visible");

        this.handleMouseOverInteraction(id, event)
      })
      .on("mousemove", (event: any) => {
        this.tooltipContainer
          .style("top", (event.pageY - 35) + "px")
          .style("left", (event.pageX + 10) + "px")
          .style("visibility", "visible")
      })
      .on("mouseout", (event: any) => {
        const id = event.path[0].__data__.properties.site.properties.id;
        this.tooltipContainer.style("visibility", "hidden");

        this.handleMouseOverInteraction(id, event, false)
      });
  }

  private handleMouseOverInteraction(nodeId: number, event: any, mouseIn: boolean = true) {
    const polygon = event.target

    this.g.nodes.selectAll(".node")
      .filter((node: any) => node.id == nodeId)
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
  }

}
