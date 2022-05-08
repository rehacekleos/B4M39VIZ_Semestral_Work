import {Component, OnInit} from '@angular/core';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import {HttpClient} from "@angular/common/http";
import {GraphNode} from "./models/node";
import {GraphEdge} from "./models/edge";
import {MyServiceService} from "./services/my-service.service";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit{

  width = 900;
  height = 600;

  nodes: GraphNode[] = []
  edges: GraphEdge[] = []

  svg: any;
  g: any;
  map: any;
  projection: any

  constructor(private myService: MyServiceService) {
  }


  async ngOnInit() {
    this.projection = d3.geoAlbers().scale(1280).translate([480, 300]);
    this.edges = await this.myService.getEdges();
    this.nodes = await this.myService.getNodes(this.edges);
    this.map = await this.myService.getUSMap();

    const zoom = d3.zoom()
      .scaleExtent([0.5, 10])
      .on("zoom", this.zoomed.bind(this));

    this.svg = d3.select('#map')
      .append('svg')
      .attr("viewBox", [0, 0, this.width, this.height])
      .attr("cursor", "pointer")

    this.g = this.svg.append("g");
    this.g.attr('transform', 'translate(20, 20)')

    await this.drawUSMap();
    this.drawNodes();

    this.edgeBundling()

    this.svg.call(zoom);
  }

  private async drawUSMap(){

    let land = topojson.merge(this.map, this.map.objects.states.geometries);
    let path = d3.geoPath();

    // draw base map
    this.g.append("path")
      .datum(land)
      .attr("class", "land")
      .attr("d", path);

    // draw interior borders
    this.g.append("path")
      .datum(topojson.mesh(this.map, this.map.objects.states, (a, b) => a !== b))
      .attr("class", "border interior")
      .attr("d", path);

    // draw exterior borders
    this.g.append("path")
      .datum(topojson.mesh(this.map, this.map.objects.states, (a, b) => a === b))
      .attr("class", "border exterior")
      .attr("d", path);
  }

  private drawNodes(){
    const triangle = d3.symbol()
      .type(d3.symbolTriangle)
      .size(60)
    ;
    this.g.selectAll('.node')
      .data(this.nodes)
      .enter()
      .filter((d: any) => {return d.size >= 50 && d.size < 100})
      .append("path")
      .attr("d", triangle)
      .attr("stroke", '#00309a')
      .attr("fill", 'rgba(0,48,154,0.15)')
      .attr("transform", (d: any) => {
        return "translate(" + this.projection([d.x, d.y])[0] + "," + this.projection([d.x, d.y])[1] + ")";
      })

    this.g.selectAll('.node')
      .data(this.nodes)
      .enter()
      .filter((d: any) => {return d.size >= 100})
      .append('rect')
      .classed('node', true)
      .attr("stroke", '#098300')
      .attr("fill", 'rgba(9,131,0,0.15)')
      .attr('width', 15)
      .attr('height', 15)
      .attr('x', (d: any) => {
        return this.projection([d.x, d.y])[0];
      })
      .attr('y', (d: any) => {
        return this.projection([d.x, d.y])[1];
      });

    this.g.selectAll('.node')
      .data(this.nodes)
      .enter()
      .filter((d: any) => {return d.size < 50})
      .append('circle')
      .classed('node', true)
      .attr('r', 3)
      .attr("stroke", '#000')
      .attr("fill", 'rgba(0,0,0,0.15)')
      .attr('cx', (d: any) => {
        return this.projection([d.x, d.y])[0];
      })
      .attr('cy', (d: any) => {
        return this.projection([d.x, d.y])[1];
      });


  }

  private zoomed(event: any) {
    const {transform} = event;
    this.g.attr("transform", transform);
    this.g.attr("stroke-width", 1 / transform.k);
  }

  private edgeBundling() {

  }
}
